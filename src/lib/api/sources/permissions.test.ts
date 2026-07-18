import { describe, it, expect } from 'vitest';
import type { SourceManifest, SourceState } from './types';
import { getManifestPermissions, hasPermission, diffPermissions } from './permissions';

const createBaseManifest = (authType: 'none' | 'bio_verification' = 'none'): SourceManifest => ({
	manifestVersion: 1,
	id: 'test-source',
	name: 'Test Source',
	description: 'Test Description',
	version: '1.0.0',
	author: { name: 'Test Author' },
	api: { baseUrl: 'https://api.test.com' },
	auth: { type: authType },
	permissions: [
		{ id: 'write:comments', description: 'Write comments' },
		{ id: 'mutate:comments:replace', target: 'dtf', description: 'Replace comments' }
	],
	endpoints: {},
	responseFormat: 'redtf-native',
	responseMapping: null
});

const createSourceState = (manifest: SourceManifest, enabled = true, granted: string[] = []): SourceState => ({
	manifestUrl: 'https://example.com/manifest.json',
	manifest,
	enabled,
	grantedPermissions: granted,
	addedAt: Date.now(),
	lastUpdated: Date.now(),
	isBuiltin: false
});

describe('permissions', () => {
	describe('getManifestPermissions', () => {
		it('should return defined permissions array for auth.type = none', () => {
			const manifest = createBaseManifest('none');
			const perms = getManifestPermissions(manifest);
			expect(perms).toHaveLength(2);
			expect(perms[0].id).toBe('write:comments');
			expect(perms[1].id).toBe('mutate:comments:replace');
		});

		it('should append implicit auth:bio_write for auth.type = bio_verification', () => {
			const manifest = createBaseManifest('bio_verification');
			const perms = getManifestPermissions(manifest);
			expect(perms).toHaveLength(3);
			expect(perms.some(p => p.id === 'auth:bio_write')).toBe(true);
		});

		it('should not duplicate auth:bio_write if it is already explicitly defined', () => {
			const manifest = createBaseManifest('bio_verification');
			manifest.permissions.push({
				id: 'auth:bio_write',
				description: 'Custom bio write desc'
			});
			const perms = getManifestPermissions(manifest);
			expect(perms).toHaveLength(3); // 2 original + 1 explicit = 3 (no implicit added)
			const bioWrite = perms.find(p => p.id === 'auth:bio_write');
			expect(bioWrite?.description).toBe('Custom bio write desc');
		});
	});

	describe('hasPermission', () => {
		it('should return false if the source is disabled', () => {
			const manifest = createBaseManifest();
			const source = createSourceState(manifest, false, ['write:comments']);
			expect(hasPermission(source, 'write:comments')).toBe(false);
		});

		it('should return false if the permission is not granted', () => {
			const manifest = createBaseManifest();
			const source = createSourceState(manifest, true, []);
			expect(hasPermission(source, 'write:comments')).toBe(false);
		});

		it('should return true for a granted global permission (no target specified in manifest)', () => {
			const manifest = createBaseManifest();
			const source = createSourceState(manifest, true, ['write:comments']);
			expect(hasPermission(source, 'write:comments')).toBe(true);
			expect(hasPermission(source, 'write:comments', 'dtf')).toBe(true);
		});

		it('should return true for a target-specific permission when matching target is provided', () => {
			const manifest = createBaseManifest();
			const source = createSourceState(manifest, true, ['mutate:comments:replace:dtf']);
			expect(hasPermission(source, 'mutate:comments:replace', 'dtf')).toBe(true);
		});

		it('should return false for a target-specific permission when mismatching target is provided', () => {
			const manifest = createBaseManifest();
			const source = createSourceState(manifest, true, ['mutate:comments:replace:dtf']);
			expect(hasPermission(source, 'mutate:comments:replace', 'other-target')).toBe(false);
		});

		it('should return false for a target-specific permission when no target is provided', () => {
			const manifest = createBaseManifest();
			const source = createSourceState(manifest, true, ['mutate:comments:replace:dtf']);
			expect(hasPermission(source, 'mutate:comments:replace')).toBe(false);
		});

		it('should check implicit auth:bio_write permission correctly', () => {
			const manifest = createBaseManifest('bio_verification');
			const source = createSourceState(manifest, true, ['auth:bio_write']);
			expect(hasPermission(source, 'auth:bio_write')).toBe(true);
		});
	});

	describe('diffPermissions', () => {
		it('should return empty added and removed lists for identical manifests', () => {
			const m1 = createBaseManifest('none');
			const m2 = createBaseManifest('none');
			const diff = diffPermissions(m1, m2);
			expect(diff.added).toHaveLength(0);
			expect(diff.removed).toHaveLength(0);
			expect(diff.requiresReapproval).toBe(false);
		});

		it('should detect added permissions and set requiresReapproval to true', () => {
			const m1 = createBaseManifest('none');
			const m2 = createBaseManifest('none');
			m2.permissions.push({ id: 'write:posts', description: 'Write posts' });

			const diff = diffPermissions(m1, m2);
			expect(diff.added).toHaveLength(1);
			expect(diff.added[0].id).toBe('write:posts');
			expect(diff.removed).toHaveLength(0);
			expect(diff.requiresReapproval).toBe(true);
		});

		it('should detect removed permissions and keep requiresReapproval false', () => {
			const m1 = createBaseManifest('none');
			const m2 = createBaseManifest('none');
			m2.permissions = m2.permissions.filter(p => p.id !== 'write:comments');

			const diff = diffPermissions(m1, m2);
			expect(diff.added).toHaveLength(0);
			expect(diff.removed).toHaveLength(1);
			expect(diff.removed[0].id).toBe('write:comments');
			expect(diff.requiresReapproval).toBe(false);
		});

		it('should detect changes in targets as both add and remove', () => {
			const m1 = createBaseManifest('none');
			const m2 = createBaseManifest('none');
			m2.permissions = m2.permissions.map(p => {
				if (p.id === 'mutate:comments:replace') {
					return { ...p, target: 'other-target' };
				}
				return p;
			});

			const diff = diffPermissions(m1, m2);
			expect(diff.added).toHaveLength(1);
			expect(diff.added[0].target).toBe('other-target');
			expect(diff.removed).toHaveLength(1);
			expect(diff.removed[0].target).toBe('dtf');
			expect(diff.requiresReapproval).toBe(true);
		});

		it('should detect added implicit bio_write when transitioning auth type to bio_verification', () => {
			const m1 = createBaseManifest('none');
			const m2 = createBaseManifest('bio_verification');

			const diff = diffPermissions(m1, m2);
			expect(diff.added).toHaveLength(1);
			expect(diff.added[0].id).toBe('auth:bio_write');
			expect(diff.requiresReapproval).toBe(true);
		});
	});
});
