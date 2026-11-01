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
	createdAt?: string;
	url?: string;
}

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
	isReplaced?: boolean;
	originalSourceId?: string;
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

export interface ApiProvider {
	name: string;
	login?(email: string, password: string): Promise<Session>;
	loginByToken?(token: string): Promise<Session>;
	getPosts(options?: GetPostsOptions): Promise<PaginatedResult<Post>>;
	getPost(id: number): Promise<Post>;
	getComments(postId: number, cursor?: CursorData, sorting?: string): Promise<PaginatedResult<Comment>>;
	reactToComment?(commentId: number, reactionId: number): Promise<void>;
	getEditorialNews?(): Promise<Post[]>;

	// Profile
	getProfile?(id: number): Promise<Profile>;
	getProfilePosts?(id: number, sorting: 'popular' | 'new', cursor?: CursorData): Promise<PaginatedResult<Post>>;
	getProfileSubscribers?(id: number): Promise<ProfileListItem[]>;
	getProfileSubscriptions?(id: number): Promise<ProfileListItem[]>;

	// Editor
	saveDraft?(entry: DtfEditorEntry): Promise<any>;
	uploadMedia?(file: File): Promise<UploadResult>;
	getSubsites?(): Promise<SubsiteItem[]>;
	getCommentPermissions?(postId: number): Promise<'everyone' | 'nobody' | 'only_plus' | 'only_subscribers'>;
	setCommentPermissions?(postId: number, permission: 'everyone' | 'nobody' | 'only_plus' | 'only_subscribers'): Promise<void>;
	getPostHistory?(postId: number): Promise<PostHistoryVersion[]>;
	getPostHistoryVersion?(postId: number, versionId: number): Promise<DtfEditorEntry>;
	getMe?(): Promise<any>;
	updateBio?(description: string, userId: number): Promise<void>;
}
