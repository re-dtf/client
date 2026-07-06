import { DtfApiProvider } from './providers/dtf';
import { CustomApiProvider } from './providers/custom';
import { PersistedState } from '$lib/storage/persisted.svelte';
import { authStorage } from '$lib/storage/auth.svelte';

class ApiFacade {
	// Settings state
	private _enableCustomApi = new PersistedState<boolean>('redtf:api:custom_enabled', false);

	get enableCustomApi(): boolean {
		return this._enableCustomApi.value;
	}

	set enableCustomApi(value: boolean) {
		this._enableCustomApi.value = value;
	}

	// The primary, always-enabled provider
	private dtfProvider = new DtfApiProvider();
	
	// Optional additional providers
	private customProvider = new CustomApiProvider();

	// Facade methods
	async login(email: string, password: string) {
		// Authenticate using the primary DTF provider
		const session = await this.dtfProvider.login(email, password);
		authStorage.session = session;
		return session;
	}

	async getPosts(cursor?: { lastId: number; lastSortingValue: number }) {
		// Always fetch from DTF
		const dtfPostsPromise = this.dtfProvider.getPosts(cursor);
		
		if (this.enableCustomApi) {
			// Fetch from custom API concurrently
			const customPostsPromise = this.customProvider.getPosts(cursor);
			
			const [dtfResult, customResult] = await Promise.all([
				dtfPostsPromise, 
				customPostsPromise
			]);
			
			// Mix and sort them by date (newest first)
			return {
				items: [...dtfResult.items, ...customResult.items].sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				),
				lastId: dtfResult.lastId,
				lastSortingValue: dtfResult.lastSortingValue
			};
		}

		return await dtfPostsPromise;
	}

	async getPost(id: number) {
		// Post fetching logic will depend on the ID or source in the future.
		// For now, if the ID suggests it's a custom post (e.g. ID > 1000) and custom API is enabled:
		if (this.enableCustomApi && id >= 1000) {
			return this.customProvider.getPost(id);
		}
		
		// Fallback/Default to DTF
		return this.dtfProvider.getPost(id);
	}

	async getComments(postId: number, cursor?: { lastId: number; lastSortingValue: number }, sorting: string = 'date') {
		const dtfCommentsPromise = this.dtfProvider.getComments(postId, cursor, sorting);
		
		if (this.enableCustomApi) {
			const customCommentsPromise = this.customProvider.getComments(postId);
			
			const [dtfComments, customComments] = await Promise.all([
				dtfCommentsPromise, 
				customCommentsPromise
			]);
			
			// Combine comments
			return [...dtfComments, ...customComments];
		}
		
		return await dtfCommentsPromise;
	}
}

// Export singleton instance
export const api = new ApiFacade();
