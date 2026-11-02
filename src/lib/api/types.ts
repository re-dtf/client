export interface Block {
	type: string;
	cover?: boolean;
	hidden?: boolean;
	data: any;
}

export interface DtfEditorBlock {
	type: string;
	cover?: boolean;
	hidden?: boolean;
	anchor?: string;
	data: any;
}

export interface DtfEditorEntry {
	id: number;
	user_id?: number;
	type?: number;
	subsite_id: number;
	title: string;
	entry: {
		blocks: DtfEditorBlock[];
	};
	is_published?: boolean;
	is_adult?: boolean;
	[key: string]: any;
}

export interface SubsiteItem {
	value: number;
	label: string;
	image?: string;
	isNoTheme?: boolean;
	additionalData?: {
		url?: string;
		isBlog?: boolean;
	};
}

export interface CursorData {
	lastId: number;
	lastSortingValue: number;
}

export interface PaginatedResult<T> {
	items: T[];
	lastId?: number;
	lastSortingValue?: number;
	cursors?: Record<string, CursorData>;
}

export interface Post {
	id: number;
	sourceId: string;
	title: string;
	blocks: Block[];
	author: User;
	commentsCount: number;
	unreadCommentsCount?: number;
	createdAt: string;
	// Необязательные поля: заполняет DTF, кастомные источники могут не присылать
	/** Тема или блог, где опубликован пост. У личного блога совпадает с автором. */
	subsite?: Subsite;
	/** Ссылка на оригинал поста */
	url?: string;
	likes?: Likes;
	reactions?: Reactions;
	favoritesCount?: number;
	viewsCount?: number;
	isPinned?: boolean;
	isFavorited?: boolean;
	/** Подписан ли пользователь на новые комментарии поста (колокольчик) */
	isSubscribedToComments?: boolean;
}

export interface User {
	id: number;
	name: string;
	avatarUrl?: string;
	description?: string;
	isPlus?: boolean;
}

export interface Subsite {
	id: number;
	name: string;
	avatarUrl?: string;
	isSubscribed?: boolean;
}

export interface Likes {
	count: number;
	dislikes?: number;
	/** 1 — лайк, -1 — дизлайк, 0 — нет голоса */
	myVote: number;
}

export interface Reactions {
	counters: { id: number; count: number }[];
	/** Реакция текущего пользователя, 0 — нет */
	reactionId: number;
}

/** Профиль пользователя или подсайта */
export interface Profile {
	id: number;
	sourceId: string;
	name: string;
	description?: string;
	avatarUrl?: string;
	coverUrl?: string;
	/** Вертикальная позиция обложки, % */
	coverY?: number;
	isPlus?: boolean;
	rating?: number;
	subscribersCount?: number;
	subscriptionsCount?: number;
	/** Только после входа: подписан ли вошедший пользователь и включён ли колокольчик */
	isSubscribed?: boolean;
	isSubscribedToNewPosts?: boolean;
	createdAt?: string;
	url?: string;
}

/** Сортировка постов в профиле */
export type ProfileSorting = 'popular' | 'new';

export interface ProfileListItem {
	id: number;
	name: string;
	avatarUrl?: string;
}



export interface CommentMedia {
	type: 'image' | 'movie';
	data: {
		uuid: string;
		width: number;
		height: number;
		size: number;
		type: string; // 'jpg', 'png', 'mp4', etc.
		color?: string;
		base64preview?: string;
		duration?: number;
		has_audio?: boolean;
	};
}

/** Гиф для вложения: превью для выбора и готовое вложение */
export interface GifResult {
	previewUrl: string;
	media: CommentMedia;
}

export interface Comment {
	id: number;
	sourceId: string;
	postId: number;
	author: User;
	content: string;
	createdAt: string;
	replyTo?: number;
	level?: number;
	isIgnored?: boolean;
	isRemoved?: boolean;
	media?: CommentMedia[];
	donation?: number;
	reactions?: Reactions;
	likes?: Likes;
	isPinned?: boolean;
	isFavorited?: boolean;
	isReplaced?: boolean;
	originalSourceId?: string;
	/** Заголовок поста: приходит в списке комментариев профиля */
	postTitle?: string;
}

export interface CommentTreeItem extends Comment {
	children: CommentTreeItem[];
	parentKey?: string;
	_totalReplies?: number;
	_formattedDate?: string;
}

export interface Session {
	type: string;
	accessToken: string;
	refreshToken: string;
	accessExpTimestamp: number;
	refreshExpTimestamp: number;
}

export interface UploadResult {
	uuid: string;
	width?: number;
	height?: number;
	size?: number;
	type?: string;
	color?: string;
}

export interface PostHistoryVersion {
	id: number;
	dateCreated: number;
}

export interface GetPostsOptions {
	pageName?: 'popular' | 'new' | 'my';
	sorting?: string;
	cursor?: CursorData;
	cursors?: Record<string, CursorData>;
}

/** Вошедший пользователь DTF */
export interface CurrentUser {
	id: number;
	name: string;
	avatarUrl?: string;
	/** Био как есть, без разметки */
	description?: string;
}

export type CommentPermission = 'everyone' | 'nobody' | 'only_plus' | 'only_subscribers';

/** Что пользователь может сделать с комментарием */
export interface CommentControls {
	edit: boolean;
}

/** Кусок текста уведомления: DTF присылает его с ссылками и выделением */
export interface NotificationPart {
	text: string;
	bold?: boolean;
	href?: string;
}

export interface Notification {
	id: number;
	/** Статус `1` у DTF — не прочитано */
	isRead: boolean;
	text: string;
	/** Тот же текст, разобранный из `html`: ссылки на пост и автора отдельно */
	parts: NotificationPart[];
	/** Битовая маска вида у DTF: 2 — реакция, 4 — ответ, 8 — блокировка, 32 — новый комментарий, 8192 — новый пост */
	type: number;
	/** Имя значка и цвет, как их выбрал DTF */
	icon?: string;
	color?: 'blue' | 'red' | 'green' | 'yellow';
	/** Текст комментария, о котором уведомление (приходит у ответов); его показывает «Развернуть» */
	commentText?: string;
	url?: string;
	createdAt: string;
	avatarUrl?: string;
}

/**
 * Что умеет источник данных. Обязательное есть у всех источников, остальное — по возможностям:
 * если метода нет, источник этого не умеет. Источники из манифестов умеют только чтение
 * и реакции (см. providers/source.ts), всё остальное делает только DTF.
 */
export interface ApiProvider {
	/** Название для сообщений об ошибках */
	name: string;

	// Чтение
	getPosts(options?: GetPostsOptions): Promise<PaginatedResult<Post>>;
	getPost(id: number): Promise<Post>;
	getComments(postId: number, cursor?: CursorData, sorting?: string): Promise<PaginatedResult<Comment>>;
	/** Комментарии, которыми источник подменяет основные (разрешение mutate:comments:replace) */
	getReplacedComments?(postId: number, cursor?: CursorData, sorting?: string): Promise<PaginatedResult<Comment>>;
	getEditorialNews?(lastId?: number): Promise<PaginatedResult<Post>>;
	reactToComment?(commentId: number, reactionId: number): Promise<void>;
	/** reactionId 0 снимает свою реакцию; отвечает актуальными реакциями */
	reactToPost?(postId: number, reactionId: number): Promise<Reactions>;
	/** Отвечает, сколько теперь в закладках у объекта */
	setFavorite?(id: number, kind: 'post' | 'comment', favorite: boolean): Promise<number>;
	addComment?(postId: number, text: string, replyTo?: number, media?: CommentMedia[]): Promise<Comment>;
	editComment?(commentId: number, postId: number, text: string, media?: CommentMedia[]): Promise<Comment>;
	/** Включает или выключает уведомления о новых комментариях поста; отвечает новым состоянием */
	setCommentsSubscription?(postId: number, subscribed: boolean): Promise<void>;
	getFavoriteGifs?(): Promise<GifResult[]>;
	searchGifs?(query: string, cursor?: string): Promise<{ items: GifResult[]; cursor?: string }>;
	getCommentControls?(commentId: number): Promise<CommentControls>;
	complain?(kind: 'post' | 'comment', id: number, reasonId: number): Promise<void>;
	/** Комментарий с донатом появляется после оплаты; отвечает ссылкой на оплату */
	createDonation?(postId: number, text: string, replyTo: number | undefined, media: CommentMedia[], amount: number): Promise<string>;

	// Подписки
	setSubscription?(subsiteId: number, subscribed: boolean): Promise<void>;
	setSubscriptionNotifications?(subsiteId: number, enabled: boolean): Promise<void>;

	// Уведомления
	getNotifications?(): Promise<Notification[]>;
	markNotificationsRead?(ids: number[]): Promise<void>;

	// Вход
	login?(email: string, password: string): Promise<Session>;
	loginByToken?(token: string): Promise<Session>;
	getMe?(): Promise<CurrentUser>;
	updateBio?(description: string, userId: number): Promise<void>;

	// Профили
	getProfile?(id: number): Promise<Profile>;
	getProfilePosts?(id: number, sorting: ProfileSorting, cursor?: CursorData): Promise<PaginatedResult<Post>>;
	getProfileSubscribers?(id: number): Promise<ProfileListItem[]>;
	getProfileSubscriptions?(id: number): Promise<ProfileListItem[]>;
	getProfileComments?(id: number, cursor?: CursorData): Promise<PaginatedResult<Comment>>;

	// Редактор
	saveDraft?(entry: DtfEditorEntry): Promise<DtfEditorEntry>;
	uploadMedia?(file: File): Promise<UploadResult>;
	getSubsites?(): Promise<SubsiteItem[]>;
	getCommentPermissions?(postId: number): Promise<CommentPermission>;
	setCommentPermissions?(postId: number, permission: CommentPermission): Promise<void>;
	getPostHistory?(postId: number): Promise<PostHistoryVersion[]>;
	getPostHistoryVersion?(postId: number, versionId: number): Promise<DtfEditorEntry>;
}
