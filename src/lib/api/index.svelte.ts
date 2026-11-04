import type { ApiProvider, Comment, CursorData, GetPostsOptions, PaginatedResult, Post, User } from './types';
import { dtfApiProvider } from './providers/dtf';
import { createSourceProvider } from './providers/source';
import { sourceRegistry } from './sources/registry.svelte';
import { mergePosts, mergeComments } from './sources/merger';
import { hasPermission } from './sources/permissions';
import { authStorage } from '$lib/storage/auth.svelte';
import { reactionSettings } from '$lib/storage/reactions.svelte';
import { rankByScore } from '$lib/reactions';
import { trackComment, trackFavorite, trackReaction, trackSubscription } from '$lib/storage/stats.svelte';

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
		return reactionSettings.value.rank && options?.pageName === 'popular' ? { ...merged, items: rankByScore(merged.items) } : merged;
	},

	getPost(id: number, sourceId: string = DTF) {
		return providerFor(sourceId).getPost(id);
	},

	async getComments(postId: number, sourceId: string = DTF, cursors?: Cursors, sorting: string = 'date') {
		const isSubsequentPage = cursors !== undefined;
		const safeCursors = cursors || {};

		// Основной источник пропускаем на следующих страницах, если у него уже нет курсора
		const fetchPrimary = !isSubsequentPage || safeCursors[sourceId] !== undefined;
		const primaryPromise: Promise<PaginatedResult<Comment>> = fetchPrimary
			? providerFor(sourceId).getComments(postId, safeCursors[sourceId], sorting)
			: Promise.resolve({ items: [] });

		// Остальные источники дополняют или подменяют комментарии, если у них есть такое разрешение для этого источника
		const extraSources = sourceRegistry.activeSources.filter((s) => {
			if (s.manifest.id === sourceId) return false;
			if (!hasPermission(s, 'mutate:comments:append', sourceId) && !hasPermission(s, 'mutate:comments:replace', sourceId)) return false;
			if (isSubsequentPage && safeCursors[s.manifest.id] === undefined) return false;
			return true;
		});
		const modes = extraSources.map((s) => (hasPermission(s, 'mutate:comments:replace', sourceId) ? 'replace' : 'append') as 'replace' | 'append');

		const extrasPromise = Promise.allSettled(
			extraSources.map((s, i) => {
				const provider = createSourceProvider(s);
				const load = modes[i] === 'replace' && provider.getReplacedComments ? provider.getReplacedComments : provider.getComments;
				return load(postId, safeCursors[s.manifest.id], sorting);
			})
		);

		const [primary, extras] = await Promise.all([primaryPromise, extrasPromise]);

		const loaded = settled(extras, extraSources.map((s) => s.manifest.id));
		const additions = loaded.map(({ index, sourceId: extraId, value }) => ({
			sourceId: extraId,
			comments: value.items,
			mode: modes[index]
		}));

		// Курсоры следующей страницы: у каждого источника свой
		const resultCursors: Cursors = {};
		if (primary.lastId !== undefined && primary.lastSortingValue !== undefined) {
			resultCursors[sourceId] = { lastId: primary.lastId, lastSortingValue: primary.lastSortingValue };
		}
		for (const { sourceId: extraId, value } of loaded) {
			if (value.lastId !== undefined && value.lastSortingValue !== undefined) {
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

	getEditorialNews: (lastId?: number) => dtfApiProvider.getEditorialNews(lastId),

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
		return comment;
	},
	editComment: dtfApiProvider.editComment,
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

	getProfile: (id: number) => dtfApiProvider.getProfile(id),
	getProfilePosts: dtfApiProvider.getProfilePosts,
	getProfileSubscribers: dtfApiProvider.getProfileSubscribers,
	getProfileSubscriptions: dtfApiProvider.getProfileSubscriptions,
	getProfileComments: dtfApiProvider.getProfileComments,

	// --- Редактор (только DTF) ---

	saveDraft: dtfApiProvider.saveDraft,
	uploadMedia: dtfApiProvider.uploadMedia,
	getSubsites: dtfApiProvider.getSubsites,
	getCommentPermissions: dtfApiProvider.getCommentPermissions,
	setCommentPermissions: dtfApiProvider.setCommentPermissions,
	getPostHistory: dtfApiProvider.getPostHistory,
	getPostHistoryVersion: dtfApiProvider.getPostHistoryVersion
};
