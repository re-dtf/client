export interface Block {
	type: string;
	cover?: boolean;
	data: any;
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
	createdAt: string;
}

export interface User {
	id: number;
	name: string;
	avatarUrl?: string;
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
	reactions?: {
		counters: { id: number; count: number }[];
		reactionId: number;
	};
}

export interface CommentTreeItem extends Comment {
	children: CommentTreeItem[];
}

export interface Session {
	type: string;
	accessToken: string;
	refreshToken: string;
	accessExpTimestamp: number;
	refreshExpTimestamp: number;
}

export interface ApiProvider {
	name: string;
	getPosts(cursor?: { lastId: number; lastSortingValue: number }): Promise<PaginatedResult<Post>>;
	getPost(id: number): Promise<Post>;
	getComments(postId: number, cursor?: { lastId: number; lastSortingValue: number }, sorting?: string): Promise<PaginatedResult<Comment>>;
	reactToComment?(commentId: number, reactionId: number): Promise<void>;
}
