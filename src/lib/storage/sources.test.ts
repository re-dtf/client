import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Import the module under test
import { sourceStorage, migrateSources } from './sources.svelte';
import { hasPermission } from '$lib/api/sources/permissions';
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

const mockSourceState = (id: string): SourceState => ({
	manifestUrl: 'https://manifest.test.com',
	manifest: { ...mockManifest, id },
	enabled: true,
	grantedPermissions: [],
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
		sourceStorage.setToken('auth-source', 'valid-token');

		expect(sourceStorage.getToken('auth-source')).toBe('valid-token');
	});

	it('should return undefined when token is missing', () => {
		expect(sourceStorage.getToken('no-token-source')).toBeUndefined();
	});

	it('should return undefined when token is expired', () => {
		sourceStorage.setToken('expired-source', 'old-token', Date.now() - 1000);

		expect(sourceStorage.getToken('expired-source')).toBeUndefined();
	});

	it('should retrieve token when expiresAt is in the future', () => {
		sourceStorage.setToken('future-source', 'good-token', Date.now() + 10000);

		expect(sourceStorage.getToken('future-source')).toBe('good-token');
	});

	it('should clear token when set to undefined', () => {
		sourceStorage.setToken('clear-source', 'existing-token');
		sourceStorage.setToken('clear-source', undefined);

		expect(sourceStorage.getToken('clear-source')).toBeUndefined();
	});

	it('should keep tokens out of the sources key', () => {
		sourceStorage.sources = [mockSourceState('secret-source')];
		sourceStorage.setToken('secret-source', 'super-secret');

		expect(localStorage.getItem('redtf:data:sources')).not.toContain('super-secret');
		expect(localStorage.getItem('redtf:secrets:source-tokens')).toContain('super-secret');
	});

	it('should drop expired tokens on startup', async () => {
		const envelope = {
			v: 1,
			d: {
				old: { token: 'a', expiresAt: Date.now() - 1000 },
				fresh: { token: 'b', expiresAt: Date.now() + 10000 }
			}
		};
		localStorage.setItem('redtf:secrets:source-tokens', JSON.stringify(envelope));

		vi.resetModules();
		await import('./sources.svelte');

		const saved = JSON.parse(localStorage.getItem('redtf:secrets:source-tokens')!);
		expect(Object.keys(saved.d)).toEqual(['fresh']);
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
		const stored = localStorage.getItem('redtf:data:sources');
		expect(stored).not.toBeNull();
		const parsed = JSON.parse(stored!);
		expect(parsed.d).toHaveLength(1);
		expect(parsed.d[0].manifest.id).toBe('persist-source');
	});
});

describe('migrateSources', () => {
	it('превращает голый id разрешения с target в `id:target`, и разрешение начинает срабатывать', () => {
		const manifest = {
			...mockManifest,
			permissions: [
				{ id: 'mutate:comments:restore', target: 'dtf', description: '' },
				{ id: 'write:comments', description: '' }
			]
		};
		const old = { ...mockSourceState('old'), manifest, grantedPermissions: ['mutate:comments:restore', 'write:comments'] };
		expect(hasPermission(old, 'mutate:comments:restore', 'dtf')).toBe(false);

		const [migrated] = migrateSources([old]);

		expect(migrated.grantedPermissions).toEqual(['mutate:comments:restore:dtf', 'write:comments']);
		expect(hasPermission(migrated, 'mutate:comments:restore', 'dtf')).toBe(true);
	});
});
