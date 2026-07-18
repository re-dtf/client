import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tick } from 'svelte';

// Use vi.hoisted to ensure localStorage mock is available before imports run
vi.hoisted(() => {
	const store: Record<string, string> = {};
	const localStorageMock = {
		getItem(key: string) {
			return store[key] || null;
		},
		setItem(key: string, value: string) {
			store[key] = value.toString();
		},
		clear() {
			for (const key in store) {
				delete store[key];
			}
		},
		removeItem(key: string) {
			delete store[key];
		}
	};

	Object.defineProperty(global, 'localStorage', {
		value: localStorageMock,
		writable: true
	});
});

// Mock SvelteKit $app/environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// Import the module under test
import { sourceStorage } from './sources.svelte';
import type { SourceState, SourceManifest } from '$lib/api/sources/types';

const mockManifest: SourceManifest = {
	manifestVersion: 1,
	id: 'test-source',
	name: 'Test Source',
	description: 'A source for testing storage',
	version: '1.0.0',
	author: { name: 'Test Author' },
	api: { baseUrl: 'https://api.test.com' },
	auth: { type: 'none' },
	permissions: [],
	endpoints: {},
	responseFormat: 'redtf-native',
	responseMapping: null
};

const mockSourceState = (id: string, token?: string, expiresAt?: number): SourceState => ({
	manifestUrl: 'https://manifest.test.com',
	manifest: { ...mockManifest, id },
	enabled: true,
	grantedPermissions: [],
	authToken: token,
	authTokenExpiresAt: expiresAt,
	addedAt: Date.now(),
	lastUpdated: Date.now(),
	isBuiltin: false
});

describe('sourceStorage', () => {
	beforeEach(() => {
		localStorage.clear();
		// reset stored state values directly through the setters
		sourceStorage.sources = [];
		sourceStorage.pendingBioCleanup = null;
	});

	it('should store and retrieve sources state', () => {
		const source1 = mockSourceState('source-1');
		const source2 = mockSourceState('source-2');
		
		sourceStorage.sources = [source1, source2];
		
		expect(sourceStorage.sources).toHaveLength(2);
		expect(sourceStorage.sources[0].manifest.id).toBe('source-1');
		expect(sourceStorage.sources[1].manifest.id).toBe('source-2');
	});

	it('should retrieve auth token when valid', () => {
		const source = mockSourceState('auth-source', 'valid-token');
		sourceStorage.sources = [source];

		const token = sourceStorage.getToken('auth-source');
		expect(token).toBe('valid-token');
	});

	it('should return undefined when token is missing', () => {
		const source = mockSourceState('no-token-source');
		sourceStorage.sources = [source];

		const token = sourceStorage.getToken('no-token-source');
		expect(token).toBeUndefined();
	});

	it('should return undefined when source is not found', () => {
		const token = sourceStorage.getToken('non-existent');
		expect(token).toBeUndefined();
	});

	it('should return undefined and clean up token when token is expired', async () => {
		const pastTime = Date.now() - 1000; // 1 second ago
		const source = mockSourceState('expired-source', 'old-token', pastTime);
		sourceStorage.sources = [source];

		const token = sourceStorage.getToken('expired-source');
		expect(token).toBeUndefined();

		// Wait for the cleanup microtask to execute
		await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

		// Verify lazy cleanup updated storage
		const storedSource = sourceStorage.sources.find((s) => s.manifest.id === 'expired-source');
		expect(storedSource?.authToken).toBeUndefined();
		expect(storedSource?.authTokenExpiresAt).toBeUndefined();
	});

	it('should retrieve token when expiresAt is in the future', () => {
		const futureTime = Date.now() + 10000; // 10 seconds in the future
		const source = mockSourceState('future-source', 'good-token', futureTime);
		sourceStorage.sources = [source];

		const token = sourceStorage.getToken('future-source');
		expect(token).toBe('good-token');
	});

	it('should set token and expiresAt reactively', () => {
		const source = mockSourceState('target-source');
		sourceStorage.sources = [source];

		const expires = Date.now() + 5000;
		sourceStorage.setToken('target-source', 'newly-set-token', expires);

		const updatedToken = sourceStorage.getToken('target-source');
		expect(updatedToken).toBe('newly-set-token');

		const storedSource = sourceStorage.sources.find((s) => s.manifest.id === 'target-source');
		expect(storedSource?.authTokenExpiresAt).toBe(expires);
	});

	it('should clear token when set to undefined', () => {
		const source = mockSourceState('clear-source', 'existing-token');
		sourceStorage.sources = [source];

		sourceStorage.setToken('clear-source', undefined);

		const token = sourceStorage.getToken('clear-source');
		expect(token).toBeUndefined();

		const storedSource = sourceStorage.sources.find((s) => s.manifest.id === 'clear-source');
		expect(storedSource?.authToken).toBeUndefined();
	});

	it('should store and retrieve pending bio cleanup state', () => {
		const cleanupData = {
			originalBio: 'original-bio-text',
			sourceId: 'bio-source',
			code: 'reDTF-12345',
			timestamp: Date.now(),
			dtfUserId: 12345
		};

		sourceStorage.pendingBioCleanup = cleanupData;

		expect(sourceStorage.pendingBioCleanup).toEqual(cleanupData);
	});

	it('should persist state to localStorage on assignment', () => {
		const source = mockSourceState('persist-source');
		sourceStorage.sources = [source];

		// Verify that localStorage contains the updated state immediately
		const stored = localStorage.getItem('redtf:sources');
		expect(stored).not.toBeNull();
		const parsed = JSON.parse(stored!);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].manifest.id).toBe('persist-source');
	});
});
