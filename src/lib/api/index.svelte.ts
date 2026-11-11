import type { ApiProvider, Comment, CommentPatch, CursorData, GetPostsOptions, PaginatedResult, Post, User } from './types';
import { dtfApiProvider } from './providers/dtf';
import { createSourceProvider } from './providers/source';
import { sourceRegistry } from './sources/registry.svelte';
import { mergePosts, mergeComments, type CommentAddition } from './sources/merger';
import { hasPermission } from './sources/permissions';
import { isStubComment } from './utils';
import { getOrFetchPostSourceData } from './sources/post-cache';
import type { SourceState } from './sources/types';
import { authStorage } from '$lib/storage/auth.svelte';
import { reactionSettings, voteReaction } from '$lib/storage/reactions.svelte';
import { settings } from '$lib/storage/settings.svelte';
import { applyReaction, rankByScore } from '$lib/reactions';
import { trackComment, trackFavorite, trackReaction, trackSubscription } from '$lib/storage/stats.svelte';
import { cachePost, cachePosts, loadPost, peekPost } from '$lib/postCache';

/*
 * Единственная точка, через которую UI получает данные. Компоненты вызывают api.getPosts() и так далее
 * и ничего не знают о провайдерах: фасад сам решает, откуда брать данные (DTF и/или подключённые источники),
 * и сливает результат.
 *
 * Провайдеры: DTF (providers/dtf) и по одному на каждый подключённый источник (providers/source.ts).
 * Ошибки сети и плохие ответы превращаются в Error внутри провайдеров. Если упал дополнительный источник,
 * остальные всё равно показываются, а причина пишется в консоль.
 */

const DTF = 'dtf';

export { ApiError, ProxyError } from './errors';
export type Cursors = Record<string, CursorData>;

function providerFor(sourceId: string): ApiProvider {
	if (sourceId === DTF) return dtfApiProvider;
	const source = sourceRegistry.activeSources.find((s) => s.manifest.id === sourceId);
	if (!source) throw new Error(`Источник '${sourceId}' не найден или выключен`);
	return createSourceProvider(source);
}

/** Результаты выполненных запросов с номером запроса; упавшие пишет в консоль и пропускает */
function settled<T>(results: PromiseSettledResult<T>[], sourceIds: string[]) {
	return results.flatMap((result, index) => {
		if (result.status === 'fulfilled') return [{ index, sourceId: sourceIds[index], value: result.value }];
		console.warn(`[reDTF] Источник '${sourceIds[index]}' не ответил:`, result.reason);
		return [];
	});
}

/** Режим источника в комментариях: подмена важнее восстановления, восстановление важнее добавления */
function commentModeOf(s: SourceState, sourceId: string): 'replace' | 'restore' | 'append' | undefined {
	if (hasPermission(s, 'mutate:comments:replace', sourceId)) return 'replace';
	if (hasPermission(s, 'mutate:comments:restore', sourceId)) return 'restore';
	if (hasPermission(s, 'mutate:comments:append', sourceId)) return 'append';
	return undefined;
}

export const api = {
	// --- Вход ---

	async login(email: string, password: string) {
		const session = await dtfApiProvider.login(email, password);
		authStorage.session = session;
		return session;
	},

	async loginByToken(token: string) {
		const session = await dtfApiProvider.loginByToken(token);
		authStorage.session = session;
		return session;
	},

	getMe: () => dtfApiProvider.getMe(),
	updateBio: (description: string, userId: number) => dtfApiProvider.updateBio(description, userId),
	getAccountSettings: dtfApiProvider.getAccountSettings,
	updateAccountSettings: dtfApiProvider.updateAccountSettings,
	setProfileImage: dtfApiProvider.setProfileImage,
	setProfileCoverPosition: dtfApiProvider.setProfileCoverPosition,
	removeProfileCover: dtfApiProvider.removeProfileCover,
	getNotificationSettings: dtfApiProvider.getNotificationSettings,
	setNotificationSettings: dtfApiProvider.setNotificationSettings,
	getIgnoredSubsites: dtfApiProvider.getIgnoredSubsites,
	setSubsiteIgnored: dtfApiProvider.setSubsiteIgnored,
	setPostIgnored: dtfApiProvider.setPostIgnored,

	// --- Чтение (DTF и подключённые источники) ---

	async getPosts(options?: GetPostsOptions) {
		const isSubsequentPage = options?.cursors !== undefined || options?.cursor !== undefined;
		const cursors = options?.cursors || {};

		// DTF пропускаем на следующих страницах, если у него уже нет курсора
		const fetchDtf = !isSubsequentPage || cursors[DTF] !== undefined || (options?.cursor !== undefined && Object.keys(cursors).length === 0);
		const dtfPromise: Promise<PaginatedResult<Post>> = fetchDtf
			? dtfApiProvider.getPosts({ ...options, cursor: cursors[DTF] || options?.cursor })
			: Promise.resolve({ items: [] });

		const extraSources = sourceRegistry.activeSources.filter((s) => {
			if (!s.manifest.endpoints['getPosts']) return false;
			if (isSubsequentPage && cursors[s.manifest.id] === undefined && options?.cursors !== undefined) return false;
			return true;
		});
		const extrasPromise = Promise.allSettled(
			extraSources.map((s) => createSourceProvider(s).getPosts({ ...options, cursor: cursors[s.manifest.id] }))
		);

		const [dtfResult, extras] = await Promise.all([dtfPromise, extrasPromise]);

		const results = [
			{ sourceId: DTF, result: dtfResult },
			...settled(extras, extraSources.map((s) => s.manifest.id)).map(({ sourceId, value }) => ({ sourceId, result: value }))
		];

		const merged = mergePosts(results, options?.sorting);
		// Популярное (любой период) сервер ранжирует по своим очкам, в которых все реакции плюсовые: пересчитываем по правилам пользователя
		const ranked = reactionSettings.value.rank && options?.pageName === 'popular' ? { ...merged, items: rankByScore(merged.items) } : merged;
		cachePosts(ranked.items);
		return ranked;
	},

	getPost(id: number, sourceId: string = DTF, force = false): Promise<Post> {
		const provider = providerFor(sourceId);
		return loadPost(id, sourceId, force, () => provider.getPost(id));
	},

	peekPost(id: number, sourceId: string = DTF): Post | undefined {
		return peekPost(id, sourceId);
	},

	cachePost(post: Post): void {
		cachePost(post);
	},

	async getComments(postId: number, sourceId: string = DTF, cursors?: Cursors, sorting: string = 'date') {
		const isSubsequentPage = cursors !== undefined;
		const safeCursors = cursors || {};

		// Основной источник пропускаем на следующих страницах, если у него уже нет курсора
		const fetchPrimary = !isSubsequentPage || safeCursors[sourceId] !== undefined;
		const primaryPromise: Promise<PaginatedResult<Comment>> = fetchPrimary
			? providerFor(sourceId).getComments(postId, safeCursors[sourceId], sorting)
			: Promise.resolve({ items: [] });

		const onlyModerator = settings.value.restoreScope === 'moderator';

		// Остальные источники дополняют, подменяют или восстанавливают комментарии, если у них есть такое разрешение для этого источника
		const extras = sourceRegistry.activeSources.flatMap((s) => {
			const mode = s.manifest.id === sourceId ? undefined : commentModeOf(s, sourceId);
			if (!mode) return [];
			const endpoint = mode === 'replace' ? 'getReplacedComments' : mode === 'restore' ? 'getRestoredComments' : 'getComments';
			const epKey = s.manifest.endpoints[endpoint] ? endpoint : 'getComments';
			// Источник без пагинации отдаёт всё за раз (и кэшируется), поэтому его опрашивают на каждой странице;
			// ponytail: только восстановление, а добавление такого источника продублировало бы комментарии. Постраничный restore не поддержан
			const unpaged = mode === 'restore' && s.manifest.endpoints[epKey]?.paged === false;
			if (isSubsequentPage && safeCursors[s.manifest.id] === undefined && !unpaged) return [];
			return [{ source: s, mode, epKey, unpaged }];
		});

		const extrasPromise = Promise.allSettled(
			extras.map(async ({ source, mode, epKey, unpaged }): Promise<PaginatedResult<Comment | CommentPatch>> => {
				// В архив ходим, только если на странице есть заглушки, которые стоит восстановить
				if (mode === 'restore') {
					const { items } = await primaryPromise;
					if (!items.some((c) => isStubComment(c) && (!onlyModerator || c.removedByModerator))) return { items: [] };
				}
				const provider = createSourceProvider(source);
				const load =
					(mode === 'replace' && provider.getReplacedComments) ||
					(mode === 'restore' && provider.getRestoredComments) ||
					provider.getComments;
				if (unpaged) {
					return getOrFetchPostSourceData<PaginatedResult<Comment | CommentPatch>>(source.manifest.id, postId, epKey, () => load(postId, undefined, sorting));
				}
				return load(postId, safeCursors[source.manifest.id], sorting);
			})
		);

		const [primary, extrasSettled] = await Promise.all([primaryPromise, extrasPromise]);

		const loaded = settled(extrasSettled, extras.map((e) => e.source.manifest.id));
		const additions: CommentAddition[] = loaded.map(({ index, sourceId: extraId, value }) => ({
			sourceId: extraId,
			comments: value.items,
			mode: extras[index].mode
		}));

		// Курсоры следующей страницы: у каждого источника свой
		const resultCursors: Cursors = {};
		if (primary.lastId !== undefined && primary.lastSortingValue !== undefined) {
			resultCursors[sourceId] = { lastId: primary.lastId, lastSortingValue: primary.lastSortingValue };
		}
		for (const { index, sourceId: extraId, value } of loaded) {
			if (!extras[index].unpaged && value.lastId !== undefined && value.lastSortingValue !== undefined) {
				resultCursors[extraId] = { lastId: value.lastId, lastSortingValue: value.lastSortingValue };
			}
		}

		// «Лучшие» тоже ранжирует сервер; порядок меняется внутри загруженной страницы, чтобы уже показанные комментарии не прыгали
		const merged = mergeComments(primary.items, additions);

		return {
			items: reactionSettings.value.rank && sorting === 'hotness' ? rankByScore(merged) : merged,
			lastId: primary.lastId,
			lastSortingValue: primary.lastSortingValue,
			cursors: resultCursors
		};
	},

	/** `author` нужен только статистике: кому поставлена реакция */
	async reactToComment(commentId: number, reactionId: number, sourceId: string = DTF, author?: User) {
		if (sourceId !== DTF) {
			const source = sourceRegistry.activeSources.find((s) => s.manifest.id === sourceId);
			if (!source || !hasPermission(source, 'write:reactions')) {
				throw new Error(`Нельзя поставить реакцию: источник '${sourceId}' не найден или нет разрешения`);
			}
		}
		const provider = providerFor(sourceId);
		if (!provider.reactToComment) throw new Error(`Источник '${sourceId}' не поддерживает реакции`);
		await provider.reactToComment(commentId, reactionId);
		trackReaction('comment', reactionId, author, sourceId);
	},

	async getEditorialNews(lastId?: number) {
		const items = await dtfApiProvider.getEditorialNews(lastId);
		cachePosts(items.items);
		return items;
	},

	// --- Действия вошедшего пользователя (только DTF) ---

	/** `author` нужен только статистике: кому поставлена реакция */
	async reactToPost(postId: number, reactionId: number, author?: User) {
		const reactions = await dtfApiProvider.reactToPost(postId, reactionId);
		trackReaction('post', reactionId, author);
		return reactions;
	},
	async setFavorite(id: number, kind: 'post' | 'comment', favorite: boolean) {
		const count = await dtfApiProvider.setFavorite(id, kind, favorite);
		if (favorite) trackFavorite(kind);
		return count;
	},
	async addComment(...args: Parameters<typeof dtfApiProvider.addComment>) {
		const comment = await dtfApiProvider.addComment(...args);
		trackComment();
		if (settings.value.autoUpvoteComments) {
			const upvoteId = voteReaction(1);
			const prevReactions = comment.reactions;
			const prevLikes = comment.likes;
			comment.reactions = applyReaction(comment.reactions, upvoteId);
			if (comment.likes) {
				comment.likes = {
					...comment.likes,
					count: (comment.likes.count || 0) + 1,
					myVote: 1
				};
			}
			api.reactToComment(comment.id, upvoteId, comment.sourceId, comment.author).catch(() => {
				comment.reactions = prevReactions;
				comment.likes = prevLikes;
			});
		}
		return comment;
	},
	editComment: dtfApiProvider.editComment,
	getQuizResults: dtfApiProvider.getQuizResults,
	voteQuiz: dtfApiProvider.voteQuiz,
	getCommentControls: dtfApiProvider.getCommentControls,
	complain: dtfApiProvider.complain,
	createDonation: dtfApiProvider.createDonation,
	setCommentsSubscription: dtfApiProvider.setCommentsSubscription,
	getFavoriteGifs: dtfApiProvider.getFavoriteGifs,
	searchGifs: dtfApiProvider.searchGifs,
	async setSubscription(subsiteId: number, subscribed: boolean) {
		await dtfApiProvider.setSubscription(subsiteId, subscribed);
		if (subscribed) trackSubscription();
	},
	setSubscriptionNotifications: dtfApiProvider.setSubscriptionNotifications,
	getNotifications: dtfApiProvider.getNotifications,
	markNotificationsRead: dtfApiProvider.markNotificationsRead,

	// --- Профили (пока только DTF) ---

	getProfile: (id: number | string) => dtfApiProvider.getProfile(id),
	async getProfilePosts(...args: Parameters<typeof dtfApiProvider.getProfilePosts>) {
		const res = await dtfApiProvider.getProfilePosts(...args);
		cachePosts(res.items);
		return res;
	},
	getProfileSubscribers: dtfApiProvider.getProfileSubscribers,
	getProfileSubscriptions: dtfApiProvider.getProfileSubscriptions,
	getProfileComments: dtfApiProvider.getProfileComments,

	async getReposts(postId: number) {
		const items = await dtfApiProvider.getReposts(postId);
		cachePosts(items);
		return items;
	},

	async getRecommendations(...args: Parameters<typeof dtfApiProvider.getRecommendations>) {
		const res = await dtfApiProvider.getRecommendations(...args);
		cachePosts(res.items);
		return res;
	},

	// --- Теги, поиск, черновики (только DTF) ---

	async getTagPosts(tag: string) {
		const items = await dtfApiProvider.getTagPosts(tag);
		cachePosts(items);
		return items;
	},
	async searchPosts(...args: Parameters<typeof dtfApiProvider.searchPosts>) {
		const res = await dtfApiProvider.searchPosts(...args);
		cachePosts(res.items);
		return res;
	},
	searchSubsites: dtfApiProvider.searchSubsites,
	getDrafts: dtfApiProvider.getDrafts,

	// --- Редактор (только DTF) ---

	getEditorEntry: dtfApiProvider.getEditorEntry,
	saveDraft: dtfApiProvider.saveDraft,
	uploadMedia: dtfApiProvider.uploadMedia,
	getSubsites: dtfApiProvider.getSubsites,
	getCommentPermissions: dtfApiProvider.getCommentPermissions,
	setCommentPermissions: dtfApiProvider.setCommentPermissions,
	getPostHistory: dtfApiProvider.getPostHistory,
	getPostHistoryVersion: dtfApiProvider.getPostHistoryVersion
};
