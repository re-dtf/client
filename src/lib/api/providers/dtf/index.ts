import type {
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
	Notification,
	PaginatedResult,
	Post,
	PostHistoryVersion,
	Profile,
	ProfileListItem,
	ProfileSorting,
	Reactions,
	SubsiteItem,
	UploadResult
} from '../../types';
import { getLeonardoUrl } from '../../utils';
import { API_URL, COMMENTS_API_URL, UPLOAD_URL, apiV, fetchWithAuth, requireAuth } from './client';
import { login, loginByToken } from './auth';
import { mapComment, mapCurrentUser, mapEntryToPost, mapNotification, mapProfile, mapProfileListItem, mapReactions } from './mappers';

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

	async setFavorite(id: number, kind: 'post' | 'comment', favorite: boolean): Promise<number> {
		requireAuth();
		const body = formOf({ id, type: kind === 'post' ? 1 : 2 });
		const response = await fetchWithAuth(`${apiV('2.1')}/${favorite ? 'favorite' : 'unfavorite'}`, { method: 'POST', body });
		return (await resultOf(response, 'Не удалось изменить закладки')).count ?? 0;
	},

	async addComment(postId: number, text: string, replyTo = 0, media: CommentMedia[] = []): Promise<Comment> {
		requireAuth();
		// nonce сайт придумывает сам, сервер возвращает его в ответе
		const body = formOf({ id: postId, text, attachments: attachmentsOf(media), reply_to: replyTo, nonce: Math.floor(Math.random() * 1e6) });
		const response = await fetchWithAuth(`${apiV('2.4')}/comment/add`, { method: 'POST', body });
		return mapComment(await resultOf(response, 'Не удалось отправить комментарий'), postId);
	},

	async editComment(commentId: number, postId: number, text: string, media: CommentMedia[] = []): Promise<Comment> {
		requireAuth();
		const body = formOf({ comment_id: commentId, text, attachments: attachmentsOf(media) });
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
		const response = await fetchWithAuth(`${apiV('2.1')}/subsite/me/updates`);
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

	async getProfile(id: number): Promise<Profile> {
		const response = await fetchWithAuth(`${API_URL}/subsite?id=${id}`);
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

	async getProfileSubscribers(id: number): Promise<ProfileListItem[]> {
		const response = await fetchWithAuth(`${API_URL}/subsite/subscribers?subsiteId=${id}`);
		return ((await response.json()).result?.items || []).map(mapProfileListItem);
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

		const formData = new FormData();
		formData.append('files', file);

		const response = await fetchWithAuth(`${UPLOAD_URL}/uploader/upload`, { method: 'POST', body: formData });
		const json = await response.json();
		if (json.error) throw new Error(json.message?.text || 'Не удалось загрузить файл');

		const resultItem = json.result?.[0];
		const uploaded = resultItem?.data;
		if (!uploaded?.uuid) throw new Error('Некорректный ответ при загрузке файла');

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
