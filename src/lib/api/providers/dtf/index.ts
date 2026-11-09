import type {
	AccountSettings,
	ApiProvider,
	Comment,
	CommentControls,
	CommentMedia,
	CommentPermission,
	CurrentUser,
	CursorData,
	DtfEditorEntry,
	GetPostsOptions,
	GifResult,
	IgnoredSubsite,
	Notification,
	NotificationChannel,
	PaginatedResult,
	Post,
	PostHistoryVersion,
	PostIgnoreSource,
	Profile,
	ProfileListItem,
	ProfileSorting,
	QuizResult,
	Reactions,
	SearchFilters,
	SearchSorting,
	SearchSubsite,
	SubsiteItem,
	UploadResult
} from '../../types';
import { getLeonardoUrl } from '../../utils';
import { API_URL, COMMENTS_API_URL, UPLOAD_URL, apiV, fetchWithAuth, requireAuth } from './client';
import { untrack } from 'svelte';
import { addWatermark } from '$lib/watermark';
import { settings } from '$lib/storage/settings.svelte';
import { login, loginByToken } from './auth';
import { mapComment, mapCurrentUser, mapEntryToPost, mapIgnoredSubsite, mapNotification, mapProfile, mapProfileListItem, mapQuizResult, mapReactions, mapSearchSnippet, mapSearchSubsite } from './mappers';

/** Загружает файл в хранилище DTF; возвращает запись как есть (`{ type, data }`): в таком виде её принимают поля вроде avatar и cover */
async function uploadItem(file: File): Promise<any> {
	const formData = new FormData();
	formData.append('files', file);

	const response = await fetchWithAuth(`${UPLOAD_URL}/uploader/upload`, { method: 'POST', body: formData });
	const json = await response.json();
	if (json.error) throw new Error(json.message?.text || 'Не удалось загрузить файл');

	const item = json.result?.[0];
	if (!item?.data?.uuid) throw new Error('Некорректный ответ при загрузке файла');
	return item;
}

/** Изменение профиля. Сайт шлёт блог (name, description…), ленты, avatar и cover отдельными запросами */
async function postSubsiteUpdate(userId: number, fields: Record<string, string>): Promise<void> {
	const formData = new FormData();
	formData.append('subsiteId', userId.toString());
	for (const [key, value] of Object.entries(fields)) formData.append(key, value);

	await fetchWithAuth(`${apiV('2.1')}/subsite/update`, { method: 'POST', body: formData });
}

/** Курсор для следующей страницы в запросе к API */
function cursorQuery(cursor?: CursorData): string {
	return cursor ? `&lastId=${cursor.lastId}&lastSortingValue=${cursor.lastSortingValue}` : '';
}

/** Форма запроса из полей; DTF принимает записи только как multipart */
function formOf(fields: Record<string, string | number | boolean>): FormData {
	const formData = new FormData();
	for (const [name, value] of Object.entries(fields)) formData.append(name, String(value));
	return formData;
}

/** Часть методов отвечает 200 с `error` в теле */
async function resultOf(response: Response, fallback: string): Promise<any> {
	const json = await response.json();
	if (json.error) throw new Error(json.message?.text || json.message || fallback);
	return json.result;
}

/** Вложение комментария в виде, который ждёт DTF: те же поля, что у media комментария, плюс служебные */
function attachmentsOf(media: CommentMedia[]): string {
	return JSON.stringify(media.map(({ type, data }) => ({ type, data: { hash: '', external_service: [], ...data } })));
}

/** Записи в ответах приходят то в `data`, то напрямую; бывают и пустые */
function entriesOf(items: any[] | undefined): any[] {
	return (items || []).map((item) => item.data || item).filter((entry) => entry.id !== undefined);
}

/** Официальный API DTF. Все остальные части приложения ходят сюда только через фасад api. */
export const dtfApiProvider = {
	name: 'DTF Official API',

	login,
	loginByToken,

	async getMe(): Promise<CurrentUser> {
		requireAuth();
		// /user/me на всех версиях API отвечает 404; текущий профиль отдаёт /subsite/me (плоский объект,
		// markdown=false — чтобы description (bio) пришёл сырым текстом)
		const response = await fetchWithAuth(`${API_URL}/subsite/me?markdown=false`);
		const json = await response.json();

		if (!json.result?.id) throw new Error('Не удалось получить профиль пользователя');

		return mapCurrentUser(json.result);
	},

	async updateBio(description: string, userId: number): Promise<void> {
		requireAuth();

		// Сначала получаем текущий профиль, чтобы не затереть name и commentingPermissions (как видно в HAR)
		const subsiteRes = await fetchWithAuth(`${API_URL}/subsite?id=${userId}&markdown=false`);
		const currentSubsite = (await subsiteRes.json()).result || {};

		const formData = new FormData();
		formData.append('subsiteId', userId.toString());
		formData.append('description', description);
		if (currentSubsite.name) formData.append('name', currentSubsite.name);
		if (currentSubsite.commentingPermissions) formData.append('commentingPermissions', currentSubsite.commentingPermissions);

		await fetchWithAuth(`${API_URL}/subsite/update`, { method: 'POST', body: formData });
	},

	async getAccountSettings(): Promise<AccountSettings> {
		requireAuth();
		const response = await fetchWithAuth(`${API_URL}/subsite/me?markdown=false`);
		const me = (await response.json()).result ?? {};

		return {
			id: me.id,
			name: me.name ?? '',
			description: me.description ?? '',
			commentingPermissions: me.commentingPermissions ?? 'everybody',
			defaultFeed: me.defaultFeed ?? 'popular',
			myFeedSorting: me.myFeedSorting ?? 'new',
			isBlurNsfw: !!me.isBlurNsfw,
			hideViewedPostsFromFeeds: !!me.hideViewedPostsFromFeeds
		};
	},

	/** Поля блога (name, description, commentingPermissions) и лент передавайте группами, как сайт */
	async updateAccountSettings(userId: number, patch: Partial<AccountSettings>): Promise<void> {
		requireAuth();
		await postSubsiteUpdate(userId, Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, String(value)])));
	},

	async setProfileImage(userId: number, kind: 'avatar' | 'cover', file: File): Promise<void> {
		requireAuth();
		const item = await uploadItem(file);
		// Новая обложка встаёт в позицию 0, как у сайта
		await postSubsiteUpdate(userId, kind === 'cover' ? { cover: JSON.stringify(item), cover_y: '0' } : { avatar: JSON.stringify(item) });
	},

	/** Позиция обложки уходит вместе с самой обложкой (`cover` — как её отдал профиль) */
	async setProfileCoverPosition(userId: number, cover: unknown, coverY: number): Promise<void> {
		requireAuth();
		await postSubsiteUpdate(userId, { cover: JSON.stringify(cover), cover_y: String(coverY) });
	},

	/** Сайт убирает обложку так: `cover` равен строке «null», позиция сбрасывается в 0 */
	async removeProfileCover(userId: number): Promise<void> {
		requireAuth();
		await postSubsiteUpdate(userId, { cover: 'null', cover_y: '0' });
	},

	async getIgnoredSubsites(): Promise<IgnoredSubsite[]> {
		requireAuth();
		const response = await fetchWithAuth(`${apiV('2.1')}/ignores/subsites`);
		return ((await response.json()).result ?? []).map(mapIgnoredSubsite);
	},

	/** Чёрный список: скрыть пользователя или тему (`ignored`) либо вернуть. Поле success в ответе ненадёжно (у темы при скрытии бывает false), поэтому смотрим только на код ответа */
	async setSubsiteIgnored(subsiteId: number, ignored: boolean): Promise<void> {
		requireAuth();
		const formData = new FormData();
		formData.append('id', subsiteId.toString());
		formData.append('action', ignored ? 'mute' : 'unmute');

		await fetchWithAuth(`${apiV('2.1')}/subsite/mute`, { method: 'POST', body: formData });
	},

	/** Скрыть пост. Сайт добавляет откуда нажали (`location`, `previousPage`, `fromFeed`, `hitId`); без них и возврат поста (`unmute`) в HAR не сняты */
	async setPostIgnored(postId: number, ignored: boolean, source: PostIgnoreSource = {}): Promise<void> {
		requireAuth();
		const formData = new FormData();
		formData.append('id', postId.toString());
		formData.append('action', ignored ? 'mute' : 'unmute');
		for (const [key, value] of Object.entries(source)) if (value) formData.append(key, value);

		await fetchWithAuth(`${apiV('2.4')}/content/mute`, { method: 'POST', body: formData });
	},

	async getNotificationSettings(): Promise<NotificationChannel[]> {
		requireAuth();
		const response = await fetchWithAuth(`${apiV('2.1')}/user/notifications/settings`);
		return (await response.json()).result?.channels ?? [];
	},

	/** Меняет пункты (один или сразу все, как «включить все» на сайте); ответ — все настройки уведомлений с новыми значениями */
	async setNotificationSettings(values: Record<string, boolean>): Promise<NotificationChannel[]> {
		requireAuth();
		const formData = new FormData();
		for (const [key, enabled] of Object.entries(values)) formData.append(`settings[${key}]`, String(enabled));

		const response = await fetchWithAuth(`${apiV('2.1')}/user/notifications/settings`, { method: 'POST', body: formData });
		return (await response.json()).result?.channels ?? [];
	},

	// --- Чтение ---

	async getPosts(options?: GetPostsOptions): Promise<PaginatedResult<Post>> {
		const pageName = options?.pageName || 'popular';
		const sorting = options?.sorting || 'hotness';
		// Новости в популярном показываются отдельным блоком, в самой ленте их не нужно
		const withoutNews = pageName === 'popular' ? '&isWithoutNews=true' : '';
		const response = await fetchWithAuth(`${API_URL}/feed?pageName=${pageName}&sorting=${sorting}${withoutNews}${cursorQuery(options?.cursor)}`);
		const { result } = await response.json();

		return {
			items: entriesOf(result.items).map(mapEntryToPost),
			lastId: result.lastId,
			lastSortingValue: result.lastSortingValue
		};
	},

	async getPost(id: number): Promise<Post> {
		const response = await fetchWithAuth(`${API_URL}/content?id=${id}`);
		return mapEntryToPost((await response.json()).result);
	},

	/** Репосты поста — записи-ответы. Снято на v2.10 (адрес `COMMENTS_API_URL`), постраничности в ответе нет */
	async getReposts(postId: number): Promise<Post[]> {
		const response = await fetchWithAuth(`${COMMENTS_API_URL}/content/${postId}/reposts?markdown=false`);
		return entriesOf((await response.json()).result?.items).map(mapEntryToPost);
	},

	/**
	 * Записи по тегу (без `#`). Адрес версии 2.10: на 2.31 ответ другой формы. Отдаёт одну страницу (около дюжины записей),
	 * параметров постраничности у метода нет: `lastId`, `offset`, `page`, `sorting` игнорируются
	 */
	async getTagPosts(tag: string): Promise<Post[]> {
		const response = await fetchWithAuth(`${COMMENTS_API_URL}/tag/${encodeURIComponent(tag)}?markdown=false`);
		return entriesOf((await response.json()).result?.items).map(mapEntryToPost);
	},

	/** Поиск записей: `title` — искать только в заголовках, `editorial` — только у редакции, `strict` — точное совпадение. У каждой записи `meta.highlight` — фрагмент текста с найденным в `<mark>`; страницы — по курсору */
	async searchPosts(query: string, sorting: SearchSorting, filters: SearchFilters, cursor?: CursorData): Promise<PaginatedResult<Post> & { total?: number }> {
		const params = new URLSearchParams({
			markdown: 'false',
			sorting,
			q: query,
			title: String(filters.title),
			editorial: String(filters.editorial),
			strict: String(filters.strict)
		});
		const response = await fetchWithAuth(`${COMMENTS_API_URL}/search/posts?${params}${cursorQuery(cursor)}`);
		const result = (await response.json()).result;

		return {
			items: (result?.items || []).flatMap((item: any) => {
				const entry = item.data || item;
				if (entry.id === undefined) return [];
				const post = mapEntryToPost(entry);
				return [{ ...post, searchSnippet: mapSearchSnippet(item.meta?.highlight, post.title) }];
			}),
			lastId: result?.lastId,
			lastSortingValue: result?.lastSortingValue,
			total: result?.total
		};
	},

	/** Поиск пользователей и блогов (`communities` — false) или тем (true). Отдаёт только первую дюжину: `page` метод не читает */
	async searchSubsites(query: string, communities: boolean): Promise<{ items: SearchSubsite[]; total: number }> {
		const params = new URLSearchParams({ q: query, type: communities ? '2' : '1', page: '0' });
		const response = await fetchWithAuth(`${apiV('2.51')}/search/subsites?${params}`);
		const result = (await response.json()).result;

		return { items: (result?.items || []).map((item: any) => mapSearchSubsite(item.data || item)), total: result?.total ?? 0 };
	},

	/** Черновики вошедшего пользователя; постранично по `offset` (на странице 20) */
	async getDrafts(offset = 0): Promise<Post[]> {
		requireAuth();
		const response = await fetchWithAuth(`${apiV('2.10')}/new/posts/drafts?markdown=false&offset=${offset}&limit=20`);
		return entriesOf((await resultOf(response, 'Не удалось получить черновики')).items).map(mapEntryToPost);
	},

	async getComments(postId: number, cursor?: CursorData, sorting: string = 'date'): Promise<PaginatedResult<Comment>> {
		const response = await fetchWithAuth(`${COMMENTS_API_URL}/comments?contentId=${postId}&sorting=${sorting}${cursorQuery(cursor)}`);
		const { result } = await response.json();

		return {
			items: result.items.map((item: any) => mapComment(item, postId)),
			lastId: result.lastId,
			lastSortingValue: result.lastSortingValue
		};
	},

	async reactToComment(commentId: number, reactionId: number): Promise<void> {
		requireAuth();

		const formData = new FormData();
		formData.append('type', reactionId.toString());

		await fetchWithAuth(`${COMMENTS_API_URL}/comment/${commentId}/react`, { method: 'POST', body: formData });
	},

	async reactToPost(postId: number, reactionId: number): Promise<Reactions> {
		requireAuth();
		const response = await fetchWithAuth(`${COMMENTS_API_URL}/content/${postId}/react`, { method: 'POST', body: formOf({ type: reactionId }) });
		return mapReactions(await resultOf(response, 'Не удалось поставить реакцию')) ?? { counters: [], reactionId: 0 };
	},

	/** Результаты опроса по hash из блока quiz. Отвечает и без токена (тогда userVoted пуст) */
	async getQuizResults(hash: string): Promise<QuizResult> {
		const response = await fetchWithAuth(`${apiV('2.1')}/quiz/${hash}/results`);
		return mapQuizResult(await resultOf(response, 'Не удалось загрузить результаты опроса'));
	},

	/** Голос за вариант; без itemId снимает свой голос. Тело запроса пустое, сайт шлёт пустой multipart */
	async voteQuiz(hash: string, postId: number, itemId?: string): Promise<QuizResult> {
		requireAuth();
		const response = await fetchWithAuth(`${apiV('2.1')}/quiz/${hash}/contentId/${postId}/vote${itemId ? '/' + encodeURIComponent(itemId) : ''}`, { method: 'POST', body: formOf({}) });
		return mapQuizResult(await resultOf(response, 'Не удалось проголосовать'));
	},

	async setFavorite(id: number, kind: 'post' | 'comment', favorite: boolean): Promise<number> {
		requireAuth();
		const body = formOf({ id, type: kind === 'post' ? 1 : 2 });
		const response = await fetchWithAuth(`${apiV('2.1')}/${favorite ? 'favorite' : 'unfavorite'}`, { method: 'POST', body });
		return (await resultOf(response, 'Не удалось изменить закладки')).count ?? 0;
	},

	async addComment(postId: number, text: string, replyTo = 0, media: CommentMedia[] = []): Promise<Comment> {
		requireAuth();
		const shouldWatermark = untrack(() => settings.value.watermark);
		const preparedText = shouldWatermark ? addWatermark(text) : text;
		// nonce сайт придумывает сам, сервер возвращает его в ответе
		const body = formOf({ id: postId, text: preparedText, attachments: attachmentsOf(media), reply_to: replyTo, nonce: Math.floor(Math.random() * 1e6) });
		const response = await fetchWithAuth(`${apiV('2.4')}/comment/add`, { method: 'POST', body });
		return mapComment(await resultOf(response, 'Не удалось отправить комментарий'), postId);
	},

	async editComment(commentId: number, postId: number, text: string, media: CommentMedia[] = []): Promise<Comment> {
		requireAuth();
		const shouldWatermark = untrack(() => settings.value.watermark);
		const preparedText = shouldWatermark ? addWatermark(text) : text;
		const body = formOf({ comment_id: commentId, text: preparedText, attachments: attachmentsOf(media) });
		const response = await fetchWithAuth(`${apiV('2.4')}/comment/edit`, { method: 'POST', body });
		return mapComment(await resultOf(response, 'Не удалось изменить комментарий'), postId);
	},

	async getCommentControls(commentId: number): Promise<CommentControls> {
		requireAuth();
		const response = await fetchWithAuth(`${apiV('2.1')}/comment/etcControls?commentId=${commentId}`);
		return { edit: !!(await resultOf(response, 'Не удалось получить действия')).etcControls?.edit };
	},

	/**
	 * Оба запроса — GET, но меняют подписку. Ответ `thread/unsubscribe` врёт (`subscribe: true`),
	 * поэтому ему не верим: настоящее состояние лежит в посте (`subscribedToTreads`).
	 */
	async setCommentsSubscription(postId: number, subscribed: boolean): Promise<void> {
		requireAuth();
		const response = await fetchWithAuth(`${apiV('2.4')}/content/${postId}/thread/${subscribed ? 'subscribe' : 'unsubscribe'}`);
		await resultOf(response, 'Не удалось изменить подписку на комментарии');
	},

	// --- Гифки для комментариев ---

	async getFavoriteGifs(): Promise<GifResult[]> {
		requireAuth();
		const response = await fetchWithAuth(`${apiV('2.9')}/favorite-gifs?page=0&limit=24`);
		// У избранного вложение уже готово (поле andropov)
		return ((await resultOf(response, 'Не удалось получить избранные гифки')).items || []).map((item: any) => ({
			previewUrl: getLeonardoUrl(item.leonardoUuid, { width: 200 }),
			media: item.andropov
		}));
	},

	async searchGifs(query: string, cursor = ''): Promise<{ items: GifResult[]; cursor?: string }> {
		requireAuth();
		const params = new URLSearchParams({ mediaFilter: 'gif,tinygif,nanogif', limit: '18', cursor, q: query });
		const response = await fetchWithAuth(`${apiV('2.1')}/gifs/search?${params}`);
		const result = await resultOf(response, 'Не удалось найти гифки');

		return {
			// Вложение из поиска собрано по полям выдачи, как у избранного: как сайт прикрепляет найденную гифку, не снималось
			items: (result.items || []).map((item: any): GifResult => {
				const gif = item.media_formats?.gif ?? {};
				return {
					previewUrl: gif.preview ?? item.url,
					media: {
						type: 'image',
						data: { uuid: item.id, width: gif.dims?.[0] ?? 0, height: gif.dims?.[1] ?? 0, size: gif.size ?? 0, type: 'gif', duration: gif.duration, has_audio: !!item.hasaudio }
					}
				};
			}),
			cursor: result.cursor || undefined
		};
	},

	async complain(kind: 'post' | 'comment', id: number, reasonId: number): Promise<void> {
		requireAuth();
		const [path, idField] = kind === 'post' ? ['content', 'content_id'] : ['comment', 'comment_id'];
		const response = await fetchWithAuth(`${apiV('2.4')}/${path}/complaint`, { method: 'POST', body: formOf({ [idField]: id, reason_id: reasonId }) });
		await resultOf(response, 'Не удалось отправить жалобу');
	},

	async createDonation(postId: number, text: string, replyTo = 0, media: CommentMedia[] = [], amount: number): Promise<string> {
		requireAuth();
		const body = formOf({
			type: 'comment',
			'data[id]': postId,
			'data[text]': text,
			'data[attachments]': attachmentsOf(media),
			'data[reply_to]': replyTo,
			'data[nonce]': Math.floor(Math.random() * 1e6),
			donation: amount
		});
		const response = await fetchWithAuth(`${apiV('2.6')}/donations/donate`, { method: 'POST', body });
		const link = (await resultOf(response, 'Не удалось создать платёж')).payment_link;
		// Ссылку открывает пользователь, поэтому пускаем только https
		if (typeof link !== 'string' || !link.startsWith('https://')) throw new Error('DTF не вернул ссылку на оплату');
		return link;
	},

	// --- Подписки ---

	async setSubscription(subsiteId: number, subscribed: boolean): Promise<void> {
		requireAuth();
		const body = formOf({ id: subsiteId, action: subscribed ? 'subscribe' : 'unsubscribe', isSubscribedToNotifications: false });
		await resultOf(await fetchWithAuth(`${apiV('2.1')}/subsite/subscription`, { method: 'POST', body }), 'Не удалось изменить подписку');
	},

	async setSubscriptionNotifications(subsiteId: number, enabled: boolean): Promise<void> {
		requireAuth();
		const action = enabled ? 'subscribe' : 'unsubscribe';
		await fetchWithAuth(`${apiV('2.1')}/subsite/notifications/subsite/${action}/${subsiteId}`, { method: 'POST' });
	},

	// --- Уведомления ---

	async getNotifications(): Promise<Notification[]> {
		requireAuth();
		// html=true добавляет текст со ссылками на пост и автора, как у сайта
		const response = await fetchWithAuth(`${apiV('2.1')}/subsite/me/updates?html=true&is_read=1`);
		return ((await resultOf(response, 'Не удалось получить уведомления')) || []).map(mapNotification);
	},

	async markNotificationsRead(ids: number[]): Promise<void> {
		requireAuth();
		await fetchWithAuth(`${apiV('2.1')}/subsite/notifications/markAsRead`, { method: 'POST', body: formOf({ notificationIds: JSON.stringify(ids) }) });
	},

	/** Новости редакции порциями (как «Показать ещё» у DTF): курсор — id последней новости, первая порция — без него */
	async getEditorialNews(lastId = 0): Promise<PaginatedResult<Post>> {
		const response = await fetchWithAuth(`${API_URL}/news?lastId=${lastId}`);
		const { result } = await response.json();

		return { items: entriesOf(result?.news).map(mapEntryToPost), lastId: result?.lastId };
	},

	// --- Профили ---

	async getProfile(id: number | string): Promise<Profile> {
		const query = typeof id === 'number' ? `id=${id}` : `uri=${encodeURIComponent(id)}`;
		const response = await fetchWithAuth(`${API_URL}/subsite?${query}`);
		const subsite = (await response.json()).result?.subsite;
		if (!subsite) throw new Error('Профиль не найден');

		return mapProfile(subsite);
	},

	async getProfilePosts(id: number, sorting: ProfileSorting, cursor?: CursorData): Promise<PaginatedResult<Post>> {
		const dtfSorting = sorting === 'popular' ? 'hotness' : 'date';
		const response = await fetchWithAuth(`${API_URL}/timeline?subsitesIds=${id}&sorting=${dtfSorting}${cursorQuery(cursor)}`);
		const result = (await response.json()).result;

		return {
			items: entriesOf(result?.items).map(mapEntryToPost),
			lastId: result?.lastId,
			lastSortingValue: result?.lastSortingValue
		};
	},

	async getProfileSubscribers(id: number, cursor?: CursorData): Promise<PaginatedResult<ProfileListItem>> {
		const response = await fetchWithAuth(`${API_URL}/subsite/subscribers?subsiteId=${id}${cursorQuery(cursor)}`);
		const result = (await response.json()).result;

		return {
			items: (result?.items || []).map(mapProfileListItem),
			lastId: result?.lastId,
			lastSortingValue: result?.lastSortingValue
		};
	},

	async getProfileSubscriptions(id: number): Promise<ProfileListItem[]> {
		const response = await fetchWithAuth(`${API_URL}/subsite/subscriptions?subsiteId=${id}`);
		return ((await response.json()).result?.items || []).map(mapProfileListItem);
	},

	async getProfileComments(id: number, cursor?: CursorData): Promise<PaginatedResult<Comment>> {
		const response = await fetchWithAuth(`${apiV('2.5')}/comments?subsiteId=${id}&sorting=new&page=0${cursorQuery(cursor)}`);
		const result = (await response.json()).result;

		return {
			items: (result?.items || []).map((item: any) => mapComment(item, item.entry?.id ?? 0)),
			lastId: result?.lastId,
			lastSortingValue: result?.lastSortingValue
		};
	},

	// --- Редактор ---

	/** Запись для редактора: черновик или опубликованный пост (`id=0` — новая запись, её тут не просят) */
	async getEditorEntry(postId: number): Promise<DtfEditorEntry> {
		requireAuth();
		const response = await fetchWithAuth(`${apiV('2.1')}/editor/${postId}`);
		return (await resultOf(response, 'Не удалось открыть черновик')).entry;
	},

	async saveDraft(entry: DtfEditorEntry): Promise<DtfEditorEntry> {
		requireAuth();

		const formData = new FormData();
		formData.append('entry', JSON.stringify(entry));

		const response = await fetchWithAuth(`${API_URL}/editor`, { method: 'POST', body: formData });
		const json = await response.json();
		if (json.error) throw new Error(json.message?.text || 'Не удалось сохранить черновик');
		return json.result?.entry;
	},

	async uploadMedia(file: File): Promise<UploadResult> {
		requireAuth();

		const resultItem = await uploadItem(file);
		const uploaded = resultItem.data;

		return {
			uuid: uploaded.uuid,
			width: uploaded.width,
			height: uploaded.height,
			size: uploaded.size,
			type: resultItem.type === 'movie' ? 'movie' : uploaded.type,
			color: uploaded.color
		};
	},

	async getSubsites(): Promise<SubsiteItem[]> {
		requireAuth();

		const response = await fetchWithAuth(`${API_URL}/editor/subsites`);
		const json = await response.json();
		if (json.error) throw new Error(json.message?.text || 'Не удалось получить список подсайтов');

		// API отвечает так: [{ items: [подсайты] }]
		return json.result?.[0]?.items || [];
	},

	async getCommentPermissions(postId: number): Promise<CommentPermission> {
		requireAuth();
		const response = await fetchWithAuth(`${API_URL}/posts/${postId}/comment-permission`);
		return (await response.json()).result?.permission || 'everyone';
	},

	async setCommentPermissions(postId: number, permission: CommentPermission): Promise<void> {
		requireAuth();
		const url = `${API_URL}/posts/${postId}/comment-permission`;

		if (permission === 'everyone') {
			await fetchWithAuth(url, { method: 'DELETE' });
		} else {
			const formData = new FormData();
			formData.append('commentingPermissions', permission);
			await fetchWithAuth(url, { method: 'POST', body: formData });
		}
	},

	async getPostHistory(postId: number): Promise<PostHistoryVersion[]> {
		requireAuth();
		const response = await fetchWithAuth(`${API_URL}/content/${postId}/history`);
		return (await response.json()).result?.versions || [];
	},

	async getPostHistoryVersion(postId: number, versionId: number): Promise<DtfEditorEntry> {
		requireAuth();
		const response = await fetchWithAuth(`${API_URL}/content/${postId}/history/${versionId}`);
		const json = await response.json();
		if (json.error) throw new Error(json.message?.text || 'Не удалось получить версию поста');
		return json.result?.entry;
	}
} satisfies ApiProvider;
