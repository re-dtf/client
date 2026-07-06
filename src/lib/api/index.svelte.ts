import { dtfApiProvider } from './providers/dtf';
import { customApiProvider } from './providers/custom';
import { persistedState } from '$lib/storage/persisted.svelte';
import { authStorage } from '$lib/storage/auth.svelte';

const enableCustomApiState = persistedState<boolean>('redtf:api:custom_enabled', false);

export const api = {
	get enableCustomApi(): boolean {
		return enableCustomApiState.value;
	},
	set enableCustomApi(value: boolean) {
		enableCustomApiState.value = value;
	},

	async login(email: string, password: string) {
		const session = await dtfApiProvider.login(email, password);
		authStorage.session = session;
		return session;
	},

	async getPosts(cursor?: { lastId: number; lastSortingValue: number }) {
		const dtfPostsPromise = dtfApiProvider.getPosts(cursor);
		
		if (this.enableCustomApi) {
			const customPostsPromise = customApiProvider.getPosts(cursor);
			
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
	}
};
