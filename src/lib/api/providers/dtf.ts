import type { ApiProvider, Post, Comment, Session, FeedResult } from '../types';
import { authStorage } from '$lib/storage/auth.svelte';

export class DtfApiProvider implements ApiProvider {
	name = 'DTF Official API';

	private baseUrl = 'https://api.dtf.ru/v2.31';
	private authUrl = 'https://api.dtf.ru/v3.4';

	async login(email: string, password: string): Promise<Session> {
		const formData = new FormData();
		formData.append('email', email);
		formData.append('password', password);

		let response;
		try {
			response = await fetch(`${this.authUrl}/auth/email/login`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json'
				},
				body: formData
			});
		} catch (e) {
			throw new Error(`Сетевая ошибка при попытке авторизации: ${(e as Error).message}`);
		}

		const json = await response.json();

		if (!response.ok) {
			throw new Error(json.message || json.error?.message || `Ошибка авторизации: ${response.status}`);
		}

		const sessionData = json.data || json; // fallback in case API returns unwrapped

		return sessionData as Session;
	}

	async getPosts(cursor?: { lastId: number; lastSortingValue: number }): Promise<FeedResult> {
		const token = authStorage.dtfToken;
		const headers: Record<string, string> = { 'Accept': 'application/json' };
		if (token) headers['x-device-token'] = token;

		let url = `${this.baseUrl}/feed?pageName=popular&sorting=hotness`;
		if (cursor) {
			url += `&lastId=${cursor.lastId}&lastSortingValue=${cursor.lastSortingValue}`;
		}

		let response;
		try {
			response = await fetch(url, { headers });
		} catch (e) {
			throw new Error(`Сетевая ошибка при загрузке постов: ${(e as Error).message}`);
		}
		
		const json = await response.json();
		if (!response.ok) throw new Error(json.message || `Ошибка API: ${response.status}`);
		
		const entries = json.result.items
			.map((item: any) => item.data || item)
			.filter((entry: any) => entry.id !== undefined);

		return {
			items: entries.map((entry: any) => this.mapEntryToPost(entry)),
			lastId: json.result.lastId,
			lastSortingValue: json.result.lastSortingValue
		};
	}

	async getPost(id: number): Promise<Post> {
		const token = authStorage.dtfToken;
		const headers: Record<string, string> = { 'Accept': 'application/json' };
		if (token) headers['x-device-token'] = token;

		let response;
		try {
			response = await fetch(`${this.baseUrl}/content?id=${id}`, { headers });
		} catch (e) {
			throw new Error(`Сетевая ошибка при загрузке поста: ${(e as Error).message}`);
		}
		
		const json = await response.json();
		if (!response.ok) throw new Error(json.message || `Ошибка API: ${response.status}`);
		
		return this.mapEntryToPost(json.result);
	}

	private mapEntryToPost(entry: any): Post {
		return {
			id: entry.id,
			title: entry.title || 'Без заголовка',
			blocks: entry.blocks || [],
			author: {
				id: entry.author?.id || 0,
				name: entry.author?.name || 'Аноним',
				avatarUrl: entry.author?.avatar_url
			},
			commentsCount: entry.counters?.comments || 0,
			createdAt: new Date((entry.date || Date.now() / 1000) * 1000).toISOString()
		};
	}

	async getComments(postId: number, cursor?: { lastId: number; lastSortingValue: number }, sorting: string = 'date'): Promise<import('../types').CommentResult> {
		const token = authStorage.dtfToken;
		const headers: Record<string, string> = { 'Accept': 'application/json' };
		if (token) headers['x-device-token'] = token;

		let url = `${this.baseUrl}/comments?contentId=${postId}&sorting=${sorting}`;
		if (cursor) {
			url += `&lastId=${cursor.lastId}&lastSortingValue=${cursor.lastSortingValue}`;
		}

		let response;
		try {
			response = await fetch(url, { headers });
		} catch (e) {
			throw new Error(`Сетевая ошибка при загрузке комментариев: ${(e as Error).message}`);
		}
		
		const json = await response.json();
		if (!response.ok) throw new Error(json.message || `Ошибка API: ${response.status}`);
		
		const items = json.result.items.map((item: any) => ({
			id: item.id,
			postId,
			author: {
				id: item.author?.id || 0,
				name: item.author?.name || 'Аноним',
				avatarUrl: item.author?.avatar_url
			},
			content: item.text || '',
			createdAt: new Date((item.date || Date.now() / 1000) * 1000).toISOString(),
			replyTo: item.replyTo,
			level: item.level,
			isIgnored: item.isIgnored,
			isRemoved: item.isRemoved
		}));

		return {
			items,
			lastId: json.result.lastId,
			lastSortingValue: json.result.lastSortingValue
		};
	}
}
