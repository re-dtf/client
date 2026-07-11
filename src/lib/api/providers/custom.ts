import { untrack } from 'svelte';
import type { ApiProvider, Post, Comment, PaginatedResult, GetPostsOptions } from '../types';
import { authStorage } from '$lib/storage/auth.svelte';

const baseUrl = 'https://my-custom-redtf-server.com/api';

export const customApiProvider: ApiProvider = {
	name: 'Custom Server API',

	async getPosts(options?: GetPostsOptions): Promise<PaginatedResult<Post>> {
		const cursor = options?.cursor;
		const token = untrack(() => authStorage.dtfToken); // Using DTF token as requested
		const authLog = token ? `[Auth DTF Token: ${token.substring(0, 5)}...]` : '[Guest]';
		console.log(`[Custom Provider] ${authLog} Fetching posts (cursor: ${JSON.stringify(cursor)})...`);
		
		return {
			items: [
				{
					id: Date.now(), // Generate a unique ID so Svelte's each block doesn't complain about duplicate keys
					title: 'Пост с кастомного сервера',
					blocks: [{ type: 'text', data: { text: '<p>Этот пост пришел с вашего личного сервера</p>' }, cover: true }],
					author: { id: 99, name: 'Admin' },
					commentsCount: 0,
					createdAt: new Date().toISOString()
				}
			],
			lastId: cursor ? cursor.lastId - 1 : 1000,
			lastSortingValue: cursor ? cursor.lastSortingValue - 1 : 1000
		};
	},

	async getPost(id: number): Promise<Post> {
		console.log(`[Custom Provider] Fetching post ${id}...`);
		return {
			id,
			title: `Кастомный пост ${id}`,
			blocks: [{ type: 'text', data: { text: '<p>Контент с кастомного сервера...</p>' }, cover: true }],
			author: { id: 99, name: 'Admin' },
			commentsCount: 0,
			createdAt: new Date().toISOString()
		};
	},

	async getComments(postId: number): Promise<PaginatedResult<Comment>> {
		console.log(`[Custom Provider] Fetching comments for post ${postId}...`);
		return {
			items: [
				{
					id: 501,
					postId,
					author: { id: 99, name: 'Admin' },
					content: 'Эксклюзивный коммент с кастомного сервера',
					createdAt: new Date().toISOString()
				}
			]
		};
	},

	async reactToComment(commentId: number, reactionId: number): Promise<void> {
		console.log(`[Custom Provider] Reacting to comment ${commentId} with reaction ${reactionId}`);
	}
};
