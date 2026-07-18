import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveGitHubUrl, validateManifest, loadManifest, loadChangelog } from './manifest-loader';

const createValidManifest = () => ({
	manifestVersion: 1,
	id: 'test-source',
	name: 'DTF Удаленные комментарии',
	description: 'Восстановление удаленных комментариев с DTF через архивный сервер',
	version: '1.0.0',
	author: {
		name: 'reDTF Team',
		url: 'https://github.com/re-dtf'
	},
	icon: 'https://example.com/icon.png',
	homepage: 'https://github.com/re-dtf/deleted-comments',
	tags: ['dtf', 'comments', 'archive'],
	api: {
		baseUrl: 'https://archive.redtf.org/api/v1',
		defaultHeaders: {
			'X-Client': 'reDTF',
			'X-Client-Version': '1.0.0'
		}
	},
	auth: {
		type: 'bio_verification',
		bioVerification: {
			challengeEndpoint: '/auth/challenge',
			challengeMethod: 'POST',
			verifyEndpoint: '/auth/verify',
			verifyMethod: 'POST',
			tokenHeader: 'Authorization',
			tokenPrefix: 'Bearer '
		}
	},
	permissions: [
		{
			id: 'mutate:comments:replace',
			target: 'dtf',
			description: 'Подмена удаленных комментариев для постов с DTF',
			required: true
		}
	],
	endpoints: {
		getComments: {
			label: 'Получение комментариев поста',
			description: 'Загружает комментарии для указанного поста',
			path: '/comments/{postId}',
			method: 'GET',
			params: {
				cursor: '{cursor}',
				limit: '50'
			}
		}
	},
	responseFormat: 'redtf-native',
	responseMapping: null
});

describe('manifest-loader', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe('resolveGitHubUrl', () => {
		it('should resolve standard github shorthand to main branch and redtf-source.json', () => {
			expect(resolveGitHubUrl('github:user/repo')).toBe(
				'https://raw.githubusercontent.com/user/repo/main/redtf-source.json'
			);
		});

		it('should resolve github shorthand with custom branch', () => {
			expect(resolveGitHubUrl('github:user/repo/dev-branch')).toBe(
				'https://raw.githubusercontent.com/user/repo/dev-branch/redtf-source.json'
			);
		});

		it('should resolve github shorthand with custom branch and custom file path', () => {
			expect(resolveGitHubUrl('github:user/repo/dev-branch/subdir/custom.json')).toBe(
				'https://raw.githubusercontent.com/user/repo/dev-branch/subdir/custom.json'
			);
		});

		it('should handle case insensitivity for github prefix', () => {
			expect(resolveGitHubUrl('GitHub:user/repo')).toBe(
				'https://raw.githubusercontent.com/user/repo/main/redtf-source.json'
			);
		});

		it('should trim whitespace around the url', () => {
			expect(resolveGitHubUrl('  github:user/repo  ')).toBe(
				'https://raw.githubusercontent.com/user/repo/main/redtf-source.json'
			);
		});

		it('should throw error for invalid format', () => {
			expect(() => resolveGitHubUrl('not-github:user/repo')).toThrow(
				'Invalid GitHub shorthand URL format'
			);
			expect(() => resolveGitHubUrl('github:single-token')).toThrow(
				'GitHub shorthand must contain at least user and repository'
			);
		});
	});

	describe('validateManifest', () => {
		it('should return true for valid manifest', () => {
			const manifest = createValidManifest();
			expect(validateManifest(manifest)).toBe(true);
		});

		it('should return false for invalid manifest', () => {
			const manifest = createValidManifest() as any;
			delete manifest.id;
			expect(validateManifest(manifest)).toBe(false);
		});

		it('should support checking with isBuiltin flag', () => {
			const manifest = createValidManifest();
			manifest.id = 'dtf-deleted-comments';
			expect(validateManifest(manifest, false)).toBe(false); // reserved custom ID check
			expect(validateManifest(manifest, true)).toBe(true);  // allowed builtin ID check
		});
	});

	describe('loadManifest', () => {
		it('should fetch and return a valid manifest from secure URL', async () => {
			const manifest = createValidManifest();
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => manifest
			} as Response);

			const result = await loadManifest('https://example.com/redtf-source.json');
			expect(mockFetch).toHaveBeenCalledWith('https://example.com/redtf-source.json');
			expect(result).toEqual(manifest);
		});

		it('should accept github shorthand, resolve it, fetch, and validate', async () => {
			const manifest = createValidManifest();
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => manifest
			} as Response);

			const result = await loadManifest('github:user/repo');
			expect(mockFetch).toHaveBeenCalledWith(
				'https://raw.githubusercontent.com/user/repo/main/redtf-source.json'
			);
			expect(result).toEqual(manifest);
		});

		it('should accept http://localhost and http://127.0.0.1 for development', async () => {
			const manifest = createValidManifest();
			manifest.api.baseUrl = 'http://localhost:5173/api';
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => manifest
			} as Response);

			const result = await loadManifest('http://localhost:3000/manifest.json');
			expect(result).toEqual(manifest);
		});

		it('should reject non-secure http URLs (mixed content prevention)', async () => {
			await expect(loadManifest('http://unsafe-domain.com/manifest.json')).rejects.toThrow(
				'Insecure protocol'
			);
		});

		it('should throw error if fetch returns not-ok response', async () => {
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			} as Response);

			await expect(loadManifest('https://example.com/manifest.json')).rejects.toThrow(
				'Failed to fetch manifest: 404 Not Found'
			);
		});

		it('should throw error if JSON is syntactically malformed', async () => {
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => {
					throw new Error('Unexpected token < in JSON');
				}
			} as unknown as Response);

			await expect(loadManifest('https://example.com/manifest.json')).rejects.toThrow(
				'Failed to parse manifest JSON: Unexpected token < in JSON'
			);
		});

		it('should throw error if JSON structure is invalid', async () => {
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ id: 'invalid' })
			} as Response);

			await expect(loadManifest('https://example.com/manifest.json')).rejects.toThrow(
				'Invalid manifest structure or validation failed'
			);
		});
	});

	describe('loadChangelog', () => {
		it('should fetch and return CHANGELOG.md content when manifest is loaded', async () => {
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: true,
				text: async () => '# Changelog\n- Fix bugs'
			} as Response);

			const changelog = await loadChangelog('https://example.com/dir/redtf-source.json');
			expect(mockFetch).toHaveBeenCalledWith('https://example.com/dir/CHANGELOG.md');
			expect(changelog).toBe('# Changelog\n- Fix bugs');
		});

		it('should resolve github shorthand, fetch and return CHANGELOG.md next to it', async () => {
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: true,
				text: async () => '# Changelog'
			} as Response);

			const changelog = await loadChangelog('github:user/repo');
			expect(mockFetch).toHaveBeenCalledWith(
				'https://raw.githubusercontent.com/user/repo/main/CHANGELOG.md'
			);
			expect(changelog).toBe('# Changelog');
		});

		it('should return null if changelog response is not ok', async () => {
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404
			} as Response);

			const changelog = await loadChangelog('https://example.com/manifest.json');
			expect(changelog).toBeNull();
		});

		it('should return null if url is insecure', async () => {
			const changelog = await loadChangelog('http://unsafe-domain.com/manifest.json');
			expect(changelog).toBeNull();
		});

		it('should return null if fetch throws an error', async () => {
			const mockFetch = vi.mocked(fetch);
			mockFetch.mockRejectedValue(new Error('Network error'));

			const changelog = await loadChangelog('https://example.com/manifest.json');
			expect(changelog).toBeNull();
		});
	});
});
