import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sourceRegistry } from './registry.svelte';
import { sourceStorage } from '$lib/storage/sources.svelte';
import * as manifestLoader from './manifest-loader';
import type { SourceManifest, SourceState } from './types';

// Мокаем хранилище
vi.mock('$lib/storage/sources.svelte', () => {
	let mockSources: any[] = [];
	return {
		sourceStorage: {
			get sources() {
				return mockSources;
			},
			set sources(val) {
				mockSources = val;
			},
			setToken: vi.fn(),
		}
	};
});

// Мокаем загрузчик
vi.mock('./manifest-loader', () => ({
	loadManifest: vi.fn(),
	loadChangelog: vi.fn()
}));

const createMockManifest = (id: string, version = '1.0.0'): SourceManifest => ({
	manifestVersion: 1,
	id,
	name: `Source ${id}`,
	description: 'Desc',
	version,
	author: { name: 'Author' },
	api: { baseUrl: 'https://api.example.com' },
	auth: { type: 'none' },
	permissions: [{ id: 'write:comments', description: 'Write' }],
	endpoints: {
		getPosts: {
			label: 'Get Posts',
			description: 'Gets posts',
			path: '/posts',
			method: 'GET'
		}
	},
	responseFormat: 'redtf-native',
	responseMapping: null
});

describe('registry.svelte', () => {
	beforeEach(() => {
		sourceStorage.sources = [];
		vi.clearAllMocks();
	});

	describe('addSource', () => {
		it('should add a new source successfully', async () => {
			const mockManifest = createMockManifest('test-source');
			vi.spyOn(manifestLoader, 'loadManifest').mockResolvedValue(mockManifest);

			const result = await sourceRegistry.addSource('https://example.com/manifest.json');
			expect(result).toEqual(mockManifest);

			expect(sourceStorage.sources).toHaveLength(1);
			expect(sourceStorage.sources[0].manifest.id).toBe('test-source');
			expect(sourceStorage.sources[0].enabled).toBe(false);
			expect(sourceStorage.sources[0].isBuiltin).toBe(false);
		});

		it('should throw an error if URL is already added', async () => {
			sourceStorage.sources = [{ manifestUrl: 'https://example.com/manifest.json', manifest: createMockManifest('existing') } as SourceState];

			await expect(sourceRegistry.addSource('https://example.com/manifest.json'))
				.rejects.toThrow('Источник с таким URL уже добавлен');
		});

		it('should throw an error if ID already exists', async () => {
			sourceStorage.sources = [{ manifestUrl: 'https://other.com/manifest.json', manifest: createMockManifest('test-source') } as SourceState];
			vi.spyOn(manifestLoader, 'loadManifest').mockResolvedValue(createMockManifest('test-source'));

			await expect(sourceRegistry.addSource('https://example.com/manifest.json'))
				.rejects.toThrow("Источник с ID 'test-source' уже существует");
		});
	});

	describe('removeSource', () => {
		it('should completely remove a custom source', () => {
			sourceStorage.sources = [
				{ manifest: { id: 'test-source' }, isBuiltin: false } as SourceState
			];

			sourceRegistry.removeSource('test-source');
			expect(sourceStorage.sources).toHaveLength(0);
		});

		it('should only disable a builtin source, not remove it', () => {
			sourceStorage.sources = [
				{ manifest: { id: 'builtin-source' }, isBuiltin: true, enabled: true } as SourceState
			];

			sourceRegistry.removeSource('builtin-source');
			expect(sourceStorage.sources).toHaveLength(1);
			expect(sourceStorage.sources[0].enabled).toBe(false);
		});
	});

	describe('activeSources and permissions', () => {
		it('should return only enabled sources in activeSources', () => {
			sourceStorage.sources = [
				{ manifest: { id: 's1' }, enabled: true } as SourceState,
				{ manifest: { id: 's2' }, enabled: false } as SourceState
			];
			expect(sourceRegistry.activeSources).toHaveLength(1);
			expect(sourceRegistry.activeSources[0].manifest.id).toBe('s1');
		});

		it('should correctly toggle a source', () => {
			sourceStorage.sources = [{ manifest: { id: 's1' }, enabled: false } as SourceState];
			sourceRegistry.toggleSource('s1', true);
			expect(sourceStorage.sources[0].enabled).toBe(true);
		});

		it('should return sources with specific permission', () => {
			const manifest = createMockManifest('s1');
			sourceStorage.sources = [
				{ manifest, enabled: true, grantedPermissions: ['write:comments'] } as SourceState
			];
			
			const withPerms = sourceRegistry.getSourcesWithPermission('write:comments');
			expect(withPerms).toHaveLength(1);

			const withoutPerms = sourceRegistry.getSourcesWithPermission('mutate:comments:replace');
			expect(withoutPerms).toHaveLength(0);
		});
	});

	describe('refreshManifest', () => {
		it('should calculate diffs correctly on refresh', async () => {
			const oldManifest = createMockManifest('s1', '1.0.0');
			sourceStorage.sources = [
				{ manifestUrl: 'https://example.com', manifest: oldManifest, isBuiltin: false } as SourceState
			];

			const newManifest = createMockManifest('s1', '1.1.0');
			newManifest.permissions.push({ id: 'new:perm', description: 'New' });
			newManifest.endpoints['newEndpoint'] = { path: '/new', method: 'GET', label: 'L', description: 'D' };
			delete newManifest.endpoints['getPosts'];

			vi.spyOn(manifestLoader, 'loadManifest').mockResolvedValue(newManifest);
			vi.spyOn(manifestLoader, 'loadChangelog').mockResolvedValue('Some changelog');

			const diff = await sourceRegistry.refreshManifest('s1');
			
			expect(diff.newVersion).toBe('1.1.0');
			expect(diff.requiresReapproval).toBe(true);
			expect(diff.addedPermissions).toHaveLength(1);
			expect(diff.removedEndpoints).toContain('getPosts');
			expect(Object.keys(diff.addedEndpoints)).toContain('newEndpoint');
			expect(diff.changelog).toBe('Some changelog');
		});

		it('should throw if ID changes during refresh', async () => {
			sourceStorage.sources = [
				{ manifestUrl: 'https://example.com', manifest: createMockManifest('s1'), isBuiltin: false } as SourceState
			];
			vi.spyOn(manifestLoader, 'loadManifest').mockResolvedValue(createMockManifest('s2'));

			await expect(sourceRegistry.refreshManifest('s1'))
				.rejects.toThrow('ID манифеста изменился');
		});
	});

	describe('applyUpdate', () => {
		it('should apply the update and set grantedPermissions', () => {
			sourceStorage.sources = [
				{ manifest: createMockManifest('s1', '1.0.0'), grantedPermissions: ['old'] } as SourceState
			];

			const newManifest = createMockManifest('s1', '1.1.0');
			sourceRegistry.applyUpdate('s1', { newManifest } as any, ['new1', 'new2']);

			expect(sourceStorage.sources[0].manifest.version).toBe('1.1.0');
			expect(sourceStorage.sources[0].grantedPermissions).toEqual(['new1', 'new2']);
		});
	});
});
