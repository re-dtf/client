export interface Block {
	type: string;
	cover?: boolean;
	hidden?: boolean;
	anchor?: string;
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

/** Курсор рекомендаций: обе строки отдаёт сервер, `excludeIds` — непрозрачный список уже показанного */
export interface RecommendationsCursor {
	lastId: string;
	excludeIds: string;
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
	/** Сколько раз на пост написали репост (ответ) */
	repostsCount?: number;
	/** Пост — репост другого: `original` нет, если исходный удалён или недоступен */
	repost?: { id: number; original?: Post };
	/** Подписан ли пользователь на новые комментарии поста (колокольчик) */
	isSubscribedToComments?: boolean;
	/** Не опубликован: черновик */
	isDraft?: boolean;
	/** Фрагмент текста с найденными словами в `<mark>`; приходит только в выдаче поиска */
	searchSnippet?: string;
}

export interface User {
	id: number;
	name: string;
	avatarUrl?: string;
	description?: string;
	isPlus?: boolean;
	isDonationsEnabled?: boolean;
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

/** Результат опроса (блок quiz); ключи items — id вариантов из данных блока */
export interface QuizResult {
	items: Record<string, { count: number; total: number; percentage: number; isWinner: boolean }>;
	/** Вариант, за который проголосовал текущий пользователь */
	userVoted: string | null;
}

/** Профиль пользователя или подсайта */
export interface Profile {
	id: number;
	sourceId: string;
	name: string;
	description?: string;
	avatarUrl?: string;
	/** Исходная аватарка для просмотра на весь экран; нет, если пришла только готовая ссылка */
	avatarMedia?: { uuid: string; width: number; height: number };
	coverUrl?: string;
	/** Обложка как её отдаёт DTF: нужна, чтобы сохранить новую позицию, не загружая файл заново */
	coverRaw?: unknown;
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

/** Пользователь, блог или тема (сообщество) из выдачи поиска */
export interface SearchSubsite {
	id: number;
	name: string;
	description?: string;
	avatarUrl?: string;
	/** Тема (сообщество), а не пользователь или блог */
	isCommunity: boolean;
	subscribersCount?: number;
	isSubscribed?: boolean;
}

/** Порядок выдачи поиска по записям */
export type SearchSorting = 'relevance' | 'date';

/** Уточнения поиска по записям: только заголовки, только редакция, точное совпадение */
export interface SearchFilters {
	title: boolean;
	editorial: boolean;
	strict: boolean;
}

export interface ProfileListItem {
	id: number;
	name: string;
	avatarUrl?: string;
	/** DTF присылает true для всех элементов списка (отношение к запрашиваемому подсайту, не к зрителю) */
	isSubscribed?: boolean;
}



export interface CommentMedia {
	/** `image` и `movie` показываются, остальные типы (link, video…) — заглушкой */
	type: string;
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
	/** Комментарий отправлен или отредактирован через клиент reDTF */
	isRedtf?: boolean;
	/** Платформа/приложение по данным DTF (например, 'android-app', 'ios-app') */
	deviceSource?: string;
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

/** Настройки аккаунта DTF: блог (имя, био) и ленты. Значения те же, что принимает `subsite/update` */
export interface AccountSettings {
	id: number;
	name: string;
	description: string;
	/** Кто может комментировать профиль; меняется только вместе с блогом, поэтому возвращаем как пришло */
	commentingPermissions: string;
	defaultFeed: string;
	myFeedSorting: string;
	isBlurNsfw: boolean;
	hideViewedPostsFromFeeds: boolean;
}

/** Пользователь или тема из чёрного списка */
export interface IgnoredSubsite {
	id: number;
	name: string;
	description?: string;
	avatarUrl?: string;
	/** Тема (сообщество), а не пользователь */
	isCommunity: boolean;
}

/** Откуда скрывают пост: сайт шлёт это вместе с запросом (адрес ленты и идентификатор показа) */
export interface PostIgnoreSource {
	location?: string;
	previousPage?: string;
	fromFeed?: string;
	hitId?: string;
}

/** Группа уведомлений DTF (письма, колокольчик, push) */
export interface NotificationChannel {
	key: string;
	title: string;
	items: { key: string; title: string; enabled: boolean }[];
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
	/** Кто это сделал: по ним скрытые локально пользователи убирают свои уведомления */
	userIds?: number[];
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
	getQuizResults?(hash: string): Promise<QuizResult>;
	/** Без itemId снимает свой голос; отвечает актуальными результатами */
	voteQuiz?(hash: string, postId: number, itemId?: string): Promise<QuizResult>;
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
	getAccountSettings?(): Promise<AccountSettings>;
	updateAccountSettings?(userId: number, patch: Partial<AccountSettings>): Promise<void>;
	setProfileImage?(userId: number, kind: 'avatar' | 'cover', file: File): Promise<void>;
	setProfileCoverPosition?(userId: number, cover: unknown, coverY: number): Promise<void>;
	removeProfileCover?(userId: number): Promise<void>;
	getNotificationSettings?(): Promise<NotificationChannel[]>;
	setNotificationSettings?(values: Record<string, boolean>): Promise<NotificationChannel[]>;
	getIgnoredSubsites?(): Promise<IgnoredSubsite[]>;
	setSubsiteIgnored?(subsiteId: number, ignored: boolean): Promise<void>;
	setPostIgnored?(postId: number, ignored: boolean, source?: PostIgnoreSource): Promise<void>;

	// Профили
	getProfile?(id: number): Promise<Profile>;
	getProfilePosts?(id: number, sorting: ProfileSorting, cursor?: CursorData): Promise<PaginatedResult<Post>>;
	getProfileSubscribers?(id: number, cursor?: CursorData): Promise<PaginatedResult<ProfileListItem>>;
	getProfileSubscriptions?(id: number): Promise<ProfileListItem[]>;
	getProfileComments?(id: number, cursor?: CursorData): Promise<PaginatedResult<Comment>>;

	// Репосты (ответы на пост)
	getReposts?(postId: number): Promise<Post[]>;
	/** Рекомендации под постом; `cursor` в ответе нет, когда записи кончились */
	getRecommendations?(postId: number, cursor?: RecommendationsCursor): Promise<{ items: Post[]; cursor?: RecommendationsCursor }>;

	// Теги, поиск, черновики
	getTagPosts?(tag: string): Promise<Post[]>;
	searchPosts?(query: string, sorting: SearchSorting, filters: SearchFilters, cursor?: CursorData): Promise<PaginatedResult<Post> & { total?: number }>;
	searchSubsites?(query: string, communities: boolean): Promise<{ items: SearchSubsite[]; total: number }>;
	getDrafts?(offset?: number): Promise<Post[]>;

	// Редактор
	getEditorEntry?(postId: number): Promise<DtfEditorEntry>;
	saveDraft?(entry: DtfEditorEntry): Promise<DtfEditorEntry>;
	uploadMedia?(file: File): Promise<UploadResult>;
	getSubsites?(): Promise<SubsiteItem[]>;
	getCommentPermissions?(postId: number): Promise<CommentPermission>;
	setCommentPermissions?(postId: number, permission: CommentPermission): Promise<void>;
	getPostHistory?(postId: number): Promise<PostHistoryVersion[]>;
	getPostHistoryVersion?(postId: number, versionId: number): Promise<DtfEditorEntry>;
}
