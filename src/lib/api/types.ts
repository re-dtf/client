export interface Block {
	type: string;
	cover?: boolean;
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

export interface PaginatedResult<T> {
	items: T[];
	lastId?: number;
	lastSortingValue?: number;
}

export interface Post {
	id: number;
	title: string;
	blocks: Block[];
	author: User;
	commentsCount: number;
	unreadCommentsCount?: number;
	createdAt: string;
}

export interface User {
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
	reactions?: {
		counters: { id: number; count: number }[];
		reactionId: number;
	};
}

export interface CommentTreeItem extends Comment {
	children: CommentTreeItem[];
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
	cursor?: { lastId: number; lastSortingValue: number };
}

export interface ApiProvider {
	name: string;
	login?(email: string, password: string): Promise<Session>;
	loginByToken?(token: string): Promise<Session>;
	getPosts(options?: GetPostsOptions): Promise<PaginatedResult<Post>>;
	getPost(id: number): Promise<Post>;
	getComments(postId: number, cursor?: { lastId: number; lastSortingValue: number }, sorting?: string): Promise<PaginatedResult<Comment>>;
	reactToComment?(commentId: number, reactionId: number): Promise<void>;
	getEditorialNews?(): Promise<Post[]>;
	
	// Editor
	saveDraft?(entry: DtfEditorEntry): Promise<any>;
	uploadMedia?(file: File): Promise<UploadResult>;
	getSubsites?(): Promise<SubsiteItem[]>;
	getCommentPermissions?(postId: number): Promise<'everyone' | 'nobody' | 'only_plus' | 'only_subscribers'>;
	setCommentPermissions?(postId: number, permission: 'everyone' | 'nobody' | 'only_plus' | 'only_subscribers'): Promise<void>;
	getPostHistory?(postId: number): Promise<PostHistoryVersion[]>;
	getPostHistoryVersion?(postId: number, versionId: number): Promise<DtfEditorEntry>;
}
