import { describe, it, expect } from 'vitest';
import { isSourceManifest, resolveSourceUrl } from './types';

// Mock manifest templates that we can clone and modify
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
	dependencies: [
		{
			sourceId: 'dtf-official',
			reason: 'Необходим для привязки комментариев к постам DTF'
		}
	],
	responseFormat: 'redtf-native',
	responseMapping: null
});

describe('isSourceManifest', () => {
	it('should validate a correct manifest', () => {
		const manifest = createValidManifest();
		expect(isSourceManifest(manifest)).toBe(true);
	});

	it('should fail on invalid manifestVersion', () => {
		const manifest = createValidManifest() as any;
		manifest.manifestVersion = '1'; // must be number
		expect(isSourceManifest(manifest)).toBe(false);

		manifest.manifestVersion = 0; // must be > 0
		expect(isSourceManifest(manifest)).toBe(false);

		manifest.manifestVersion = -1; // must be > 0
		expect(isSourceManifest(manifest)).toBe(false);
	});

	it('should fail on missing or empty required string fields', () => {
		const fields = ['id', 'name', 'version'] as const;
		for (const field of fields) {
			const manifest1 = createValidManifest() as any;
			delete manifest1[field];
			expect(isSourceManifest(manifest1)).toBe(false);

			const manifest2 = createValidManifest() as any;
			manifest2[field] = '   '; // empty/whitespace
			expect(isSourceManifest(manifest2)).toBe(false);
		}
	});

	it('should fail on invalid author structure', () => {
		const manifest1 = createValidManifest() as any;
		manifest1.author = 'reDTF Team'; // must be object
		expect(isSourceManifest(manifest1)).toBe(false);

		const manifest2 = createValidManifest() as any;
		manifest2.author = { url: 'https://example.com' }; // missing name
		expect(isSourceManifest(manifest2)).toBe(false);

		const manifest3 = createValidManifest() as any;
		manifest3.author = { name: 'reDTF Team', url: 123 }; // url must be string
		expect(isSourceManifest(manifest3)).toBe(false);

		const manifest4 = createValidManifest() as any;
		manifest4.author = { name: 'reDTF Team', url: 'javascript:alert(1)' }; // XSS URL
		expect(isSourceManifest(manifest4)).toBe(false);
	});

	it('should reject unsafe metadata links (XSS prevention)', () => {
		const manifest1 = createValidManifest() as any;
		manifest1.homepage = 'javascript:alert(1)';
		expect(isSourceManifest(manifest1)).toBe(false);

		const manifest2 = createValidManifest() as any;
		manifest2.icon = 'javascript:alert(1)';
		expect(isSourceManifest(manifest2)).toBe(false);
	});

	describe('baseUrl validation', () => {
		it('should accept secure URLs (https)', () => {
			const manifest = createValidManifest() as any;
			manifest.api.baseUrl = 'https://my-secure-endpoint.com/api';
			expect(isSourceManifest(manifest)).toBe(true);
		});

		it('should accept localhost HTTP URLs for development', () => {
			const manifest = createValidManifest() as any;
			
			manifest.api.baseUrl = 'http://localhost:5173/api';
			expect(isSourceManifest(manifest)).toBe(true);

			manifest.api.baseUrl = 'http://127.0.0.1:3000/api';
			expect(isSourceManifest(manifest)).toBe(true);

			manifest.api.baseUrl = 'http://[::1]:8080/api';
			expect(isSourceManifest(manifest)).toBe(true);
		});

		it('should reject non-secure HTTP URLs to prevent Mixed Content issues', () => {
			const manifest = createValidManifest() as any;
			manifest.api.baseUrl = 'http://unsafe-endpoint.com/api';
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should reject invalid URL strings', () => {
			const manifest = createValidManifest() as any;
			manifest.api.baseUrl = 'not-a-url';
			expect(isSourceManifest(manifest)).toBe(false);

			manifest.api.baseUrl = 'https://'; // protocol only
			expect(isSourceManifest(manifest)).toBe(false);
		});
	});

	describe('defaultHeaders validation', () => {
		it('should reject defaultHeaders with invalid header names', () => {
			const manifest = createValidManifest() as any;
			manifest.api.defaultHeaders = {
				'X-Valid-Header': 'value',
				'Invalid:Header': 'value' // contains colon, invalid
			};
			expect(isSourceManifest(manifest)).toBe(false);

			const manifest2 = createValidManifest() as any;
			manifest2.api.defaultHeaders = {
				'Invalid Header': 'value' // contains space, invalid
			};
			expect(isSourceManifest(manifest2)).toBe(false);

			const manifest3 = createValidManifest() as any;
			manifest3.api.defaultHeaders = {
				'X-Client': 'valid'
			};
			expect(isSourceManifest(manifest3)).toBe(true);
		});
	});

	describe('auth block validation', () => {
		it('should validate auth.type: none', () => {
			const manifest = createValidManifest() as any;
			manifest.auth = { type: 'none' };
			expect(isSourceManifest(manifest)).toBe(true);
		});

		it('should reject invalid auth types', () => {
			const manifest = createValidManifest() as any;
			manifest.auth = { type: 'invalid_auth_type' };
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should validate token_header fields', () => {
			const manifest = createValidManifest() as any;
			manifest.auth = {
				type: 'token_header',
				tokenHeader: {
					headerName: 'X-Api-Key',
					inputLabel: 'Введите ключ'
				}
			};
			expect(isSourceManifest(manifest)).toBe(true);

			// Missing fields
			manifest.auth.tokenHeader = { headerName: 'X-Api-Key' };
			expect(isSourceManifest(manifest)).toBe(false);

			// Invalid header name (e.g. contains space or invalid char)
			const manifestInvalidHeader = createValidManifest() as any;
			manifestInvalidHeader.auth = {
				type: 'token_header',
				tokenHeader: {
					headerName: 'Invalid Header Name',
					inputLabel: 'Введите ключ'
				}
			};
			expect(isSourceManifest(manifestInvalidHeader)).toBe(false);
		});

		it('should validate bio_verification fields', () => {
			const manifest = createValidManifest() as any;
			manifest.auth = {
				type: 'bio_verification',
				bioVerification: {
					challengeEndpoint: '/auth/challenge',
					challengeMethod: 'POST',
					verifyEndpoint: '/auth/verify',
					verifyMethod: 'POST',
					tokenHeader: 'Authorization'
				}
			};
			expect(isSourceManifest(manifest)).toBe(true);

			// Invalid method
			manifest.auth.bioVerification.challengeMethod = 'DELETE';
			expect(isSourceManifest(manifest)).toBe(false);

			// Invalid header name
			const manifestInvalid = createValidManifest() as any;
			manifestInvalid.auth.bioVerification.tokenHeader = 'Auth:Token'; // colon is invalid in header token
			expect(isSourceManifest(manifestInvalid)).toBe(false);
		});

		it('should validate oauth2_pkce fields', () => {
			const manifest = createValidManifest() as any;
			manifest.auth = {
				type: 'oauth2_pkce',
				oauth2: {
					authorizationUrl: 'https://oauth.my-server.com/auth',
					tokenUrl: 'https://oauth.my-server.com/token',
					clientId: 'client-id',
					scopes: ['read', 'write'],
					tokenHeader: 'Authorization'
				}
			};
			expect(isSourceManifest(manifest)).toBe(true);

			// Reject insecure authorization URL
			manifest.auth.oauth2.authorizationUrl = 'http://oauth.my-server.com/auth';
			expect(isSourceManifest(manifest)).toBe(false);

			// Reject invalid header name
			const manifestInvalid = createValidManifest() as any;
			manifestInvalid.auth = {
				type: 'oauth2_pkce',
				oauth2: {
					authorizationUrl: 'https://oauth.my-server.com/auth',
					tokenUrl: 'https://oauth.my-server.com/token',
					clientId: 'client-id',
					scopes: ['read', 'write'],
					tokenHeader: 'Auth Token' // contains space
				}
			};
			expect(isSourceManifest(manifestInvalid)).toBe(false);
		});
	});

	describe('permissions validation', () => {
		it('should reject manifest if permissions is not an array', () => {
			const manifest = createValidManifest() as any;
			manifest.permissions = 'not-an-array';
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should reject invalid permission items', () => {
			const manifest = createValidManifest() as any;
			manifest.permissions = [
				{
					id: '', // Empty ID
					description: 'Test'
				}
			];
			expect(isSourceManifest(manifest)).toBe(false);

			manifest.permissions = [
				{
					id: 'write:comments',
					description: 'Test',
					required: 'true' // must be boolean
				}
			];
			expect(isSourceManifest(manifest)).toBe(false);
		});
	});

	describe('endpoints validation', () => {
		it('should reject invalid endpoint methods', () => {
			const manifest = createValidManifest() as any;
			manifest.endpoints.getComments.method = 'PATCH'; // not supported in valid methods GET, POST, PUT, DELETE
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should reject endpoints with non-string paths', () => {
			const manifest = createValidManifest() as any;
			manifest.endpoints.getComments.path = 123;
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should reject non-relative or protocol-relative endpoint paths', () => {
			const manifest = createValidManifest() as any;
			
			manifest.endpoints.getComments.path = 'https://attacker.com/steal';
			expect(isSourceManifest(manifest)).toBe(false);

			manifest.endpoints.getComments.path = '//attacker.com/steal';
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should accept relative endpoint paths without a leading slash', () => {
			const manifest = createValidManifest() as any;
			manifest.endpoints.getComments.path = 'comments/123';
			expect(isSourceManifest(manifest)).toBe(true);
		});

		it('should reject endpoints with backslashes in path (URL Hijacking prevention)', () => {
			const manifest = createValidManifest() as any;
			manifest.endpoints.getComments.path = '/\\attacker.com/evil';
			expect(isSourceManifest(manifest)).toBe(false);
		});
	});

	describe('id character validation', () => {
		it('should reject manifest with unsafe characters in id', () => {
			const manifest1 = createValidManifest() as any;
			manifest1.id = 'my:source'; // contains colon
			expect(isSourceManifest(manifest1)).toBe(false);

			const manifest2 = createValidManifest() as any;
			manifest2.id = 'source/1'; // contains slash
			expect(isSourceManifest(manifest2)).toBe(false);

			const manifest3 = createValidManifest() as any;
			manifest3.id = 'my-source_123'; // valid characters
			expect(isSourceManifest(manifest3)).toBe(true);
		});

		it('should reject reserved IDs for both custom and builtin validation', () => {
			const manifest = createValidManifest() as any;
			
			manifest.id = 'dtf';
			expect(isSourceManifest(manifest, false)).toBe(false);
			expect(isSourceManifest(manifest, true)).toBe(false);

			manifest.id = 'dtf-official';
			expect(isSourceManifest(manifest, false)).toBe(false);
			expect(isSourceManifest(manifest, true)).toBe(false);
		});

		it('should reject builtin IDs for custom but accept them for builtin validation', () => {
			const manifest = createValidManifest() as any;
			
			manifest.id = 'dtf-deleted-comments';
			expect(isSourceManifest(manifest, false)).toBe(false); // custom
			expect(isSourceManifest(manifest, true)).toBe(true); // builtin

			manifest.id = 'dtf-extended-feed';
			expect(isSourceManifest(manifest, false)).toBe(false); // custom
			expect(isSourceManifest(manifest, true)).toBe(true); // builtin
		});
	});

	describe('bioVerification path security', () => {
		it('should reject unsafe paths in bioVerification endpoints', () => {
			const manifest1 = createValidManifest() as any;
			manifest1.auth.bioVerification.challengeEndpoint = '//attacker.com/evil';
			expect(isSourceManifest(manifest1)).toBe(false);

			const manifest2 = createValidManifest() as any;
			manifest2.auth.bioVerification.verifyEndpoint = '/\\attacker.com/evil';
			expect(isSourceManifest(manifest2)).toBe(false);
		});

		it('should reject relative paths with dot-dot path traversal', () => {
			const manifest = createValidManifest() as any;
			manifest.auth.bioVerification.challengeEndpoint = '/../evil-endpoint';
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should reject URL-encoded dot-dot path traversal and backslashes', () => {
			const manifest1 = createValidManifest() as any;
			manifest1.auth.bioVerification.challengeEndpoint = '/comments/%2e%2e/admin';
			expect(isSourceManifest(manifest1)).toBe(false);

			const manifest2 = createValidManifest() as any;
			manifest2.auth.bioVerification.challengeEndpoint = '/comments/%5cadmin';
			expect(isSourceManifest(manifest2)).toBe(false);
		});
	});

	describe('endpoint path security', () => {
		it('should reject endpoint paths with dot-dot path traversal', () => {
			const manifest = createValidManifest() as any;
			manifest.endpoints.getComments.path = '/comments/../../secret';
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should reject URL-encoded dot-dot path traversal and backslashes in endpoint paths', () => {
			const manifest1 = createValidManifest() as any;
			manifest1.endpoints.getComments.path = '/comments/%2e%2e/%2e%2e/secret';
			expect(isSourceManifest(manifest1)).toBe(false);

			const manifest2 = createValidManifest() as any;
			manifest2.endpoints.getComments.path = '/comments/%5csecret';
			expect(isSourceManifest(manifest2)).toBe(false);
		});
	});

	describe('compatibility constraints', () => {
		it('should reject responseFormat other than redtf-native', () => {
			const manifest = createValidManifest() as any;
			manifest.responseFormat = 'custom-format';
			expect(isSourceManifest(manifest)).toBe(false);
		});

		it('should reject responseMapping if not null in v1', () => {
			const manifest = createValidManifest() as any;
			manifest.responseMapping = { some: 'mapping' };
			expect(isSourceManifest(manifest)).toBe(false);
		});
	});

	describe('resolveSourceUrl', () => {
		it('should correctly join baseUrl and path preserving subpaths', () => {
			expect(resolveSourceUrl('https://my-server.com/api/v1', '/posts')).toBe('https://my-server.com/api/v1/posts');
			expect(resolveSourceUrl('https://my-server.com/api/v1/', '/posts')).toBe('https://my-server.com/api/v1/posts');
			expect(resolveSourceUrl('https://my-server.com/api/v1', 'posts')).toBe('https://my-server.com/api/v1/posts');
			expect(resolveSourceUrl('https://my-server.com/api/v1/', 'posts')).toBe('https://my-server.com/api/v1/posts');
		});

		it('should handle root-level baseUrl correctly', () => {
			expect(resolveSourceUrl('https://my-server.com', '/posts')).toBe('https://my-server.com/posts');
			expect(resolveSourceUrl('https://my-server.com/', 'posts')).toBe('https://my-server.com/posts');
		});
	});
});
