import { dtfApiProvider } from './providers/dtf';
import { customApiProvider } from './providers/custom';
import { persistedState } from '$lib/storage/persisted.svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import type { GetPostsOptions } from './types';

const enableCustomApiState = persistedState<boolean>('redtf:api:custom_enabled', false);

export const api = {
	get enableCustomApi(): boolean {
		return enableCustomApiState.value;
	},
	set enableCustomApi(value: boolean) {
		enableCustomApiState.value = value;
	},

	async login(email: string, password: string) {
		if (!dtfApiProvider.login) throw new Error("Вход по паролю в данный момент недоступен");
		const session = await dtfApiProvider.login(email, password);
		authStorage.session = session;
		return session;
	},

	async loginByToken(token: string) {
		if (!dtfApiProvider.loginByToken) throw new Error("Вход по токену в данный момент недоступен");
		const session = await dtfApiProvider.loginByToken(token);
		// session is already stored in authStorage within the provider, but we can do it here too just in case
		authStorage.session = session;
		return session;
	},

	async getPosts(options?: GetPostsOptions) {
		const dtfPostsPromise = dtfApiProvider.getPosts(options);
		
		if (this.enableCustomApi) {
			const customPostsPromise = customApiProvider.getPosts(options);
			
			const [dtfResult, customResult] = await Promise.all([
				dtfPostsPromise, 
				customPostsPromise
			]);
			
			return {
				items: [...dtfResult.items, ...customResult.items].sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				),
				lastId: dtfResult.lastId,
				lastSortingValue: dtfResult.lastSortingValue
			};
		}

		return await dtfPostsPromise;
	},

	async getPost(id: number) {
		if (this.enableCustomApi && id >= 1000) {
			return customApiProvider.getPost(id);
		}
		
		return dtfApiProvider.getPost(id);
	},

	async getComments(postId: number, cursor?: { lastId: number; lastSortingValue: number }, sorting: string = 'date') {
		const dtfCommentsPromise = dtfApiProvider.getComments(postId, cursor, sorting);
		
		if (this.enableCustomApi) {
			const customCommentsPromise = customApiProvider.getComments(postId);
			
			const [dtfComments, customComments] = await Promise.all([
				dtfCommentsPromise, 
				customCommentsPromise
			]);
			
			return {
				items: [...dtfComments.items, ...customComments.items],
				lastId: dtfComments.lastId,
				lastSortingValue: dtfComments.lastSortingValue
			};
		}
		
		return await dtfCommentsPromise;
	},

	async reactToComment(commentId: number, reactionId: number) {
		if (this.enableCustomApi && commentId >= 1000 && typeof customApiProvider.reactToComment === 'function') {
			return customApiProvider.reactToComment(commentId, reactionId);
		}
		if (dtfApiProvider.reactToComment) {
			return dtfApiProvider.reactToComment(commentId, reactionId);
		}
	},

	async getEditorialNews() {
		if (dtfApiProvider.getEditorialNews) {
			return dtfApiProvider.getEditorialNews();
		}
		return [];
	}
};
