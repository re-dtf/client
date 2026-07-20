import { dtfApiProvider } from './providers/dtf';
import { persistedState } from '$lib/storage/persisted.svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import type { GetPostsOptions, PaginatedResult, Post, Comment } from './types';
import { sourceRegistry } from './sources/registry.svelte';
import { fetchFromSource } from './sources/source-fetcher';
import { mergePosts, mergeComments } from './sources/merger';
import { hasPermission } from './sources/permissions';

export const api = {
	async login(email: string, password: string) {
		if (!dtfApiProvider.login) throw new Error("Вход по паролю в данный момент недоступен");
		const session = await dtfApiProvider.login(email, password);
		authStorage.session = session;
		return session;
	},

	async loginByToken(token: string) {
		if (!dtfApiProvider.loginByToken) throw new Error("Вход по токену в данный момент недоступен");
		const session = await dtfApiProvider.loginByToken(token);
		// session is already stored in authStorage within the provider, but we can do it here too just in case
		authStorage.session = session;
		return session;
	},

	async getPosts(options?: GetPostsOptions) {
		const isSubsequentPage = options?.cursors !== undefined || options?.cursor !== undefined;
		const cursors = options?.cursors || {};
		
		const fetchDtf = !isSubsequentPage || cursors['dtf'] !== undefined || (options?.cursor !== undefined && Object.keys(cursors).length === 0);
		let dtfPostsPromise: Promise<PaginatedResult<Post>> = Promise.resolve({ items: [] });
		if (fetchDtf) {
			const dtfCursor = cursors['dtf'] || options?.cursor;
			dtfPostsPromise = dtfApiProvider.getPosts({ ...options, cursor: dtfCursor });
		}
		
		const extraSources = sourceRegistry.activeSources.filter(s => {
			if (!s.manifest.endpoints['getPosts']) return false;
			if (isSubsequentPage && cursors[s.manifest.id] === undefined && options?.cursors !== undefined) return false;
			return true;
		});
		
		const extrasPromise = Promise.allSettled(
			extraSources.map(s => {
				const sourceCursor = cursors[s.manifest.id];
				const queryOverrides: Record<string, string> = {};
				if (sourceCursor) {
					queryOverrides.cursor = JSON.stringify(sourceCursor);
				}
				if (options?.sorting) {
					queryOverrides.sorting = options.sorting;
				}
				if (options?.pageName) {
					queryOverrides.page = options.pageName;
				}
				return fetchFromSource<PaginatedResult<Post>>(s, 'getPosts', {}, queryOverrides);
			})
		);

		const [dtfResult, extras] = await Promise.all([dtfPostsPromise, extrasPromise]);
		
		const results = [
			{ sourceId: 'dtf', result: dtfResult },
			...extras.map((r, i) => {
				if (r.status === 'fulfilled') {
					return { sourceId: extraSources[i].manifest.id, result: r.value };
				}
				return null;
			}).filter((x): x is NonNullable<typeof x> => x !== null)
		];
		
		return mergePosts(results, options?.sorting);
	},

	async getPost(id: number, sourceId: string = 'dtf') {
		if (sourceId === 'dtf') {
			return dtfApiProvider.getPost(id);
		}
		const source = sourceRegistry.activeSources.find(s => s.manifest.id === sourceId);
		if (source && source.manifest.endpoints['getPost']) {
			return fetchFromSource<Post>(source, 'getPost', { postId: id });
		}
		throw new Error(`Cannot get post from source ${sourceId}`);
	},

	async getComments(postId: number, sourceId: string = 'dtf', cursors?: Record<string, { lastId: number; lastSortingValue: number }>, sorting: string = 'date') {
		const isSubsequentPage = cursors !== undefined;
		const safeCursors = cursors || {};

		let primaryCommentsPromise: Promise<PaginatedResult<Comment>> = Promise.resolve({ items: [] });
		const fetchPrimary = !isSubsequentPage || safeCursors[sourceId] !== undefined;

		if (fetchPrimary) {
			if (sourceId === 'dtf') {
				const dtfCursor = safeCursors['dtf'];
				primaryCommentsPromise = dtfApiProvider.getComments(postId, dtfCursor, sorting);
			} else {
				const source = sourceRegistry.activeSources.find(s => s.manifest.id === sourceId);
				if (source) {
					const sourceCursor = safeCursors[sourceId];
					const queryOverrides: Record<string, string> = { sorting };
					if (sourceCursor) queryOverrides.cursor = JSON.stringify(sourceCursor);
					primaryCommentsPromise = fetchFromSource<PaginatedResult<Comment>>(source, 'getComments', { postId }, queryOverrides);
				} else {
					throw new Error(`Source ${sourceId} not found`);
				}
			}
		}
		
		const extraSources = sourceRegistry.activeSources.filter(s => {
			if (s.manifest.id === sourceId) return false;
			if (!hasPermission(s, 'mutate:comments:append', sourceId) && !hasPermission(s, 'mutate:comments:replace', sourceId)) return false;
			if (isSubsequentPage && safeCursors[s.manifest.id] === undefined) return false;
			return true;
		});

		const extrasPromise = Promise.allSettled(
			extraSources.map(s => {
				const mode = hasPermission(s, 'mutate:comments:replace', sourceId) ? 'replace' : 'append';
				const endpointKey = mode === 'replace' && s.manifest.endpoints['getReplacedComments'] ? 'getReplacedComments' : 'getComments';
				const sourceCursor = safeCursors[s.manifest.id];
				const queryOverrides: Record<string, string> = { sorting };
				if (sourceCursor) queryOverrides.cursor = JSON.stringify(sourceCursor);
				return fetchFromSource<PaginatedResult<Comment>>(s, endpointKey, { postId }, queryOverrides);
			})
		);

		const [primaryResult, extras] = await Promise.all([primaryCommentsPromise, extrasPromise]);
		
		const additions = extras.map((r, i) => {
			if (r.status === 'fulfilled') {
				const source = extraSources[i];
				const mode = hasPermission(source, 'mutate:comments:replace', sourceId) ? 'replace' : 'append' as 'replace' | 'append';
				return {
					sourceId: source.manifest.id,
					comments: r.value.items,
					mode
				};
			}
			return null;
		}).filter((x): x is NonNullable<typeof x> => x !== null);

		const mergedComments = mergeComments(primaryResult.items, additions);
		
		const resultCursors: Record<string, CursorData> = {};
		if (primaryResult.lastId !== undefined && primaryResult.lastSortingValue !== undefined) {
			resultCursors[sourceId] = { lastId: primaryResult.lastId, lastSortingValue: primaryResult.lastSortingValue };
		}
		extras.forEach((r, i) => {
			if (r.status === 'fulfilled') {
				const source = extraSources[i];
				if (r.value.lastId !== undefined && r.value.lastSortingValue !== undefined) {
					resultCursors[source.manifest.id] = { lastId: r.value.lastId, lastSortingValue: r.value.lastSortingValue };
				}
			}
		});

		return {
			items: mergedComments,
			lastId: primaryResult.lastId,
			lastSortingValue: primaryResult.lastSortingValue,
			cursors: resultCursors
		};
	},

	async reactToComment(commentId: number, reactionId: number, sourceId: string = 'dtf') {
		if (sourceId === 'dtf') {
			if (dtfApiProvider.reactToComment) {
				return dtfApiProvider.reactToComment(commentId, reactionId);
			}
			throw new Error("reactToComment is not implemented for DTF provider");
		}
		const source = sourceRegistry.activeSources.find(s => s.manifest.id === sourceId);
		if (source && hasPermission(source, 'write:reactions')) {
			return fetchFromSource(source, 'reactToComment', { commentId }, { reactionId: String(reactionId) });
		}
		throw new Error(`Cannot react to comment: Source ${sourceId} not found or permission denied`);
	},

	async getEditorialNews() {
		if (dtfApiProvider.getEditorialNews) {
			return dtfApiProvider.getEditorialNews();
		}
		return [];
	},

	// --- Editor ---
	async saveDraft(entry: import('./types').DtfEditorEntry) {
		if (!dtfApiProvider.saveDraft) throw new Error("saveDraft is not implemented");
		return dtfApiProvider.saveDraft(entry);
	},
	
	async uploadMedia(file: File) {
		if (!dtfApiProvider.uploadMedia) throw new Error("uploadMedia is not implemented");
		return dtfApiProvider.uploadMedia(file);
	},

	async getSubsites() {
		if (!dtfApiProvider.getSubsites) throw new Error("getSubsites is not implemented");
		return dtfApiProvider.getSubsites();
	},

	async setCommentPermissions(postId: number, permission: 'everyone' | 'nobody' | 'only_plus' | 'only_subscribers') {
		if (!dtfApiProvider.setCommentPermissions) throw new Error("setCommentPermissions is not implemented");
		return dtfApiProvider.setCommentPermissions(postId, permission);
	},

	async getCommentPermissions(postId: number) {
		if (!dtfApiProvider.getCommentPermissions) throw new Error("getCommentPermissions is not implemented");
		return dtfApiProvider.getCommentPermissions(postId);
	},

	async getPostHistory(postId: number) {
		if (!dtfApiProvider.getPostHistory) throw new Error("getPostHistory is not implemented");
		return dtfApiProvider.getPostHistory(postId);
	},

	async getPostHistoryVersion(postId: number, versionId: number) {
		if (!dtfApiProvider.getPostHistoryVersion) throw new Error("getPostHistoryVersion is not implemented");
		return dtfApiProvider.getPostHistoryVersion(postId, versionId);
	}
};
