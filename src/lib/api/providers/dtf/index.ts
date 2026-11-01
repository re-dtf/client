import type {
	ApiProvider,
	Comment,
	CommentPermission,
	CurrentUser,
	CursorData,
	DtfEditorEntry,
	GetPostsOptions,
	PaginatedResult,
	Post,
	PostHistoryVersion,
	Profile,
	ProfileListItem,
	ProfileSorting,
	SubsiteItem,
	UploadResult
} from '../../types';
import { API_URL, COMMENTS_API_URL, UPLOAD_URL, fetchWithAuth, requireAuth } from './client';
import { login, loginByToken } from './auth';
import { mapComment, mapCurrentUser, mapEntryToPost, mapProfile, mapProfileListItem } from './mappers';

/** Курсор для следующей страницы в запросе к API */
function cursorQuery(cursor?: CursorData): string {
	return cursor ? `&lastId=${cursor.lastId}&lastSortingValue=${cursor.lastSortingValue}` : '';
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
		const response = await fetchWithAuth(`${API_URL}/feed?pageName=${pageName}&sorting=${sorting}${cursorQuery(options?.cursor)}`);
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

	async getEditorialNews(): Promise<Post[]> {
		const response = await fetchWithAuth(`${API_URL}/news/min`);
		const { result } = await response.json();

		return (Array.isArray(result) ? result : []).filter((entry: any) => entry.id !== undefined).map(mapEntryToPost);
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
