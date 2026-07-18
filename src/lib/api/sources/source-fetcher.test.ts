import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFromSource } from './source-fetcher';
import { sourceStorage } from '$lib/storage/sources.svelte';
import type { SourceState, SourceManifest } from './types';

// Mock storage
vi.mock('$lib/storage/sources.svelte', () => ({
	sourceStorage: {
		getToken: vi.fn(),
		setToken: vi.fn(),
	}
}));

const createSource = (manifestOverrides: Partial<SourceManifest> = {}): SourceState => ({
	manifestUrl: 'https://example.com/manifest.json',
	manifest: {
		manifestVersion: 1,
		id: 'test-source',
		name: 'Test',
		description: 'Test',
		version: '1.0.0',
		author: { name: 'Author' },
		api: { baseUrl: 'https://api.test.com' },
		auth: { type: 'none' },
		permissions: [],
		endpoints: {
			getPosts: { label: 'Get Posts', description: '', path: '/posts', method: 'GET' },
			getPost: { label: 'Get Post', description: '', path: '/posts/{postId}', method: 'GET' },
			getComments: {
				label: 'Comments',
				description: '',
				path: '/comments',
				method: 'GET',
				params: { cursor: '{cursor}', limit: '10' }
			},
			createPost: { label: 'Create', description: '', path: '/posts', method: 'POST' }
		},
		responseFormat: 'redtf-native',
		responseMapping: null,
		...manifestOverrides
	},
	enabled: true,
	grantedPermissions: [],
	addedAt: Date.now(),
	lastUpdated: Date.now(),
	isBuiltin: false
});

describe('fetchFromSource', () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetAllMocks();
		mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => JSON.stringify({ success: true }),
		});
		global.fetch = mockFetch as any;
	});

	it('should throw error if endpoint is not found', async () => {
		const source = createSource();
		await expect(fetchFromSource(source, 'unknown')).rejects.toThrowError(/not found in source/);
	});

	it('should resolve path parameters and encode them', async () => {
		const source = createSource();
		await fetchFromSource(source, 'getPost', { postId: '123/456' });
		
		expect(mockFetch).toHaveBeenCalledTimes(1);
		const url = new URL(mockFetch.mock.calls[0][0]);
		expect(url.pathname).toBe('/posts/123%2F456');
	});

	it('should add query parameters from endpoint params and override templates', async () => {
		const source = createSource();
		await fetchFromSource(source, 'getComments', undefined, { cursor: 'abc' });
		
		expect(mockFetch).toHaveBeenCalledTimes(1);
		const url = new URL(mockFetch.mock.calls[0][0]);
		expect(url.searchParams.get('cursor')).toBe('abc');
		expect(url.searchParams.get('limit')).toBe('10');
	});

	it('should append remaining query overrides not matching templates', async () => {
		const source = createSource();
		await fetchFromSource(source, 'getComments', undefined, { extra: 'value' });
		
		expect(mockFetch).toHaveBeenCalledTimes(1);
		const url = new URL(mockFetch.mock.calls[0][0]);
		// cursor should not be present because no override was provided for it
		expect(url.searchParams.has('cursor')).toBe(false);
		expect(url.searchParams.get('limit')).toBe('10');
		expect(url.searchParams.get('extra')).toBe('value');
	});

	it('should include default headers from manifest', async () => {
		const source = createSource({
			api: { baseUrl: 'https://api.test.com', defaultHeaders: { 'X-Custom': 'test' } }
		});
		await fetchFromSource(source, 'getPosts');
		
		expect(mockFetch).toHaveBeenCalledTimes(1);
		const init = mockFetch.mock.calls[0][1];
		expect(init.headers.get('X-Custom')).toBe('test');
	});

	it('should add auth header if token is present', async () => {
		const source = createSource({
			auth: { type: 'token_header', tokenHeader: { headerName: 'X-Api-Key', inputLabel: 'Key' } }
		});
		vi.mocked(sourceStorage.getToken).mockReturnValue('secret_token');
		
		await fetchFromSource(source, 'getPosts');
		
		const init = mockFetch.mock.calls[0][1];
		expect(init.headers.get('X-Api-Key')).toBe('secret_token');
	});

	it('should stringify body and add Content-Type for POST', async () => {
		const source = createSource();
		await fetchFromSource(source, 'createPost', undefined, undefined, { title: 'Hello' });
		
		const init = mockFetch.mock.calls[0][1];
		expect(init.method).toBe('POST');
		expect(init.body).toBe(JSON.stringify({ title: 'Hello' }));
		expect(init.headers.get('Content-Type')).toBe('application/json');
	});

	it('should handle 401 Unauthorized by clearing token and throwing', async () => {
		const source = createSource();
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
			statusText: 'Unauthorized',
		});
		
		await expect(fetchFromSource(source, 'getPosts')).rejects.toThrowError('Unauthorized');
		expect(sourceStorage.setToken).toHaveBeenCalledWith(source.manifest.id, undefined);
	});

	it('should handle empty JSON response (e.g. 204 No Content)', async () => {
		const source = createSource();
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 204,
			text: async () => '',
		});
		
		const result = await fetchFromSource(source, 'getPosts');
		expect(result).toEqual({});
	});

	it('should include an AbortSignal with a timeout', async () => {
		const source = createSource();
		await fetchFromSource(source, 'getPosts');
		
		const init = mockFetch.mock.calls[0][1];
		expect(init.signal).toBeInstanceOf(AbortSignal);
	});
});
