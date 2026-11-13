import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseRefreshToken, login, loginByToken } from './auth';
import { refreshSession, fetchWithAuth, resetRefreshCooldown } from './client';
import { authStorage } from '$lib/storage/auth.svelte';
import { settings, DEFAULT_PROXIES } from '$lib/storage/settings.svelte';
import { ApiError, ProxyError } from '../../errors';
import { CapacitorHttp, Capacitor } from '@capacitor/core';

vi.mock('@capacitor/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@capacitor/core')>();
	return {
		...actual,
		Capacitor: {
			...actual.Capacitor,
			isNativePlatform: vi.fn(() => false)
		},
		CapacitorHttp: {
			...actual.CapacitorHttp,
			post: vi.fn()
		}
	};
});

describe('auth & proxy failover', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		resetRefreshCooldown();
		settings.value = {
			theme: 'dtf2022',
			proxies: [
				{
					id: 'p1',
					name: 'Proxy 1',
					url: 'https://proxy1.example.com',
					enabled: true
				},
				{
					id: 'p2',
					name: 'Proxy 2',
					url: 'https://proxy2.example.com',
					enabled: true
				}
			],
			commentNesting: 'flatten',
			collectStats: true,
			haptics: true,
			disableMobileTopBar: false,
			useSharePreview: true,
			watermark: true,
			clientBadges: 'redtf_only',
			mobileBadgesPosition: 'author',
			plusBadges: 'classic',
			autoUpvoteComments: false,
			restoreScope: 'all',
			restoreExpanded: false,
			restoreAuthor: true,
			commentVirtualization: 'auto',
			recommendations: 'auto',
			appIcon: 'default'
		};
	});

	it('parseRefreshToken берёт токен из строки и из JSON auth-refresh-token', () => {
		const token = 'e1af4e9cee4f0f32e0c399eb036b5c4c33353a75754bc51733ded10c60cd7ba3';

		expect(parseRefreshToken(` ${token}\n`)).toBe(token);
		expect(parseRefreshToken(JSON.stringify({ token, expTimestamp: 1 }))).toBe(token);
	});

	it('login выбрасывает ошибку, если нет включённых прокси', async () => {
		settings.value = {
			...settings.value,
			proxies: []
		};

		await expect(login('test@example.com', 'pass')).rejects.toThrow(
			'Укажите или включите хотя бы один прокси'
		);
	});

	it('login переключается на второй прокси при сетевой ошибке или 502 первого', async () => {
		const fetchMock = vi.fn().mockImplementation(async (url: string) => {
			if (url.includes('proxy1.example.com')) {
				return new Response(JSON.stringify({ error: 'Server choke' }), {
					status: 502,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			if (url.includes('proxy2.example.com')) {
				return new Response(
					JSON.stringify({
						data: {
							type: 'Bearer',
							accessToken: 'acc-token-123',
							refreshToken: 'ref-token-456',
							accessExpTimestamp: 1234,
							refreshExpTimestamp: 5678
						}
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}
			return new Response('Not found', { status: 404 });
		});

		vi.stubGlobal('fetch', fetchMock);

		const session = await login('user@test.com', 'mypass');
		expect(session.accessToken).toBe('acc-token-123');
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0][0]).toContain('proxy1.example.com');
		expect(fetchMock.mock.calls[1][0]).toContain('proxy2.example.com');
	});

	it('login выбрасывает ошибку со списком всех упавших прокси, если все отказали', async () => {
		const fetchMock = vi.fn().mockImplementation(async () => {
			throw new Error('Connection timed out');
		});

		vi.stubGlobal('fetch', fetchMock);

		await expect(login('user@test.com', 'mypass')).rejects.toThrow(/Все доступные прокси \(2\) не ответили/);
	});

	it('refreshSession обновляет токен с failover на второй прокси при сбое первого', async () => {
		authStorage.session = {
			type: 'Bearer',
			accessToken: 'old-access',
			refreshToken: 'valid-refresh',
			accessExpTimestamp: 1000,
			refreshExpTimestamp: 2000
		};

		const fetchMock = vi.fn().mockImplementation(async (url: string) => {
			if (url.includes('proxy1.example.com')) {
				return new Response('Gateway timeout', { status: 504 });
			}
			if (url.includes('proxy2.example.com')) {
				return new Response(
					JSON.stringify({
						data: {
							accessToken: 'new-refreshed-access',
							refreshToken: 'new-refreshed-token'
						}
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}
			return new Response('Not found', { status: 404 });
		});

		vi.stubGlobal('fetch', fetchMock);

		const success = await refreshSession();
		expect(success).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(authStorage.session?.accessToken).toBe('new-refreshed-access');
		expect(authStorage.session?.refreshToken).toBe('new-refreshed-token');
	});

	it('fetchWithAuth при 401 и недоступности прокси сбрасывает accessToken и повторяет публичный запрос анонимно', async () => {
		authStorage.session = {
			type: 'Bearer',
			accessToken: 'expired-access-token',
			refreshToken: 'saved-refresh-token',
			accessExpTimestamp: 1000,
			refreshExpTimestamp: 2000
		};

		let callCount = 0;
		const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
			callCount++;
			// Запрос к прокси для обновления токена падает (прокси оффлайн)
			if (url.includes('proxy1.example.com') || url.includes('proxy2.example.com')) {
				return new Response('Proxy Down', { status: 502 });
			}
			// Запрос к DTF
			if (url.includes('api.dtf.ru/v2.31/feed')) {
				const authHeader = (init?.headers as Headers)?.get('JWTAuthorization');
				if (authHeader) {
					// DTF отвергает просроченный токен
					return new Response(
						JSON.stringify({
							message: 'Кажется у вас нет доступа к этому разделу, попробуйте раздел получше',
							error: { code: 401 }
						}),
						{ status: 401, headers: { 'Content-Type': 'application/json' } }
					);
				}
				// Анонимный повторный запрос проходит успешно
				return new Response(
					JSON.stringify({
						result: { items: [], lastId: 100, lastSortingValue: 100 }
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				);
			}
			return new Response('Not found', { status: 404 });
		});

		vi.stubGlobal('fetch', fetchMock);

		const res = await fetchWithAuth('https://api.dtf.ru/v2.31/feed?pageName=popular');
		expect(res.status).toBe(200);

		// Невалидный accessToken сброшен, чтобы не слать его на каждый следующий скролл
		expect(authStorage.session?.accessToken).toBe('');
		// Но сохранённый refresh-токен не потерян!
		expect(authStorage.session?.refreshToken).toBe('saved-refresh-token');
	});

	it('fetchWithAuth при 401 и недоступности прокси на приватном эндпоинте выбрасывает ApiError со статусом 401', async () => {
		authStorage.session = {
			type: 'Bearer',
			accessToken: 'expired-access-token',
			refreshToken: 'saved-refresh-token',
			accessExpTimestamp: 1000,
			refreshExpTimestamp: 2000
		};

		const fetchMock = vi.fn().mockImplementation(async (url: string) => {
			if (url.includes('proxy1.example.com') || url.includes('proxy2.example.com')) {
				return new Response('Proxy Down', { status: 502 });
			}
			// Приватный эндпоинт DTF возвращает 401 и с токеном, и без него
			return new Response(
				JSON.stringify({
					message: 'Кажется у вас нет доступа к этому разделу, попробуйте раздел получше',
					error: { code: 401 }
				}),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		});

		vi.stubGlobal('fetch', fetchMock);

		await expect(
			fetchWithAuth('https://api.dtf.ru/v2.31/feed?pageName=my')
		).rejects.toThrow('Кажется у вас нет доступа к этому разделу, попробуйте раздел получше');

		expect(authStorage.session?.accessToken).toBe('');
		expect(authStorage.session?.refreshToken).toBe('saved-refresh-token');
	});

	describe('Capacitor native auth (без прокси)', () => {
		beforeEach(() => {
			vi.stubGlobal('window', {});
			vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
			// В нативном режиме прокси отсутствуют
			settings.value = {
				...settings.value,
				proxies: []
			};
		});

		it('login выполняет прямой вызов через CapacitorHttp.post без внешнего прокси', async () => {
			const postMock = vi.mocked(CapacitorHttp.post).mockResolvedValue({
				status: 200,
				data: {
					data: {
						type: 'Bearer',
						accessToken: 'native-acc-token',
						refreshToken: 'native-ref-token',
						accessExpTimestamp: 1234,
						refreshExpTimestamp: 5678
					}
				},
				headers: {},
				url: 'https://api.dtf.ru/v3.4/auth/email/login'
			});

			const fetchSpy = vi.fn();
			vi.stubGlobal('fetch', fetchSpy);

			const session = await login('user@test.com', 'secret-pass');

			expect(session.accessToken).toBe('native-acc-token');
			expect(session.refreshToken).toBe('native-ref-token');
			expect(postMock).toHaveBeenCalledTimes(1);

			const callArgs = postMock.mock.calls[0][0];
			expect(callArgs.url).toBe('https://api.dtf.ru/v3.4/auth/email/login');
			expect(callArgs.data).toContain('email=user%40test.com');
			expect(callArgs.data).toContain('password=secret-pass');

			// Никаких запросов fetch / внешний прокси не вызывались
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it('login при ошибке 400 выбрасывает ApiError без утечки пароля в сообщении', async () => {
			vi.mocked(CapacitorHttp.post).mockResolvedValue({
				status: 400,
				data: { message: 'Invalid login or password', code: 104, data: null },
				headers: {},
				url: 'https://api.dtf.ru/v3.4/auth/email/login'
			});

			try {
				await login('user@test.com', 'super-secret-password-123');
				expect.unreachable('Должна была выброситься ошибка');
			} catch (err: any) {
				expect(err.message).toBe('Invalid login or password');
				expect(err.status).toBe(400);
				expect(err.message).not.toContain('super-secret-password-123');
			}
		});

		it('refreshSession выполняет прямой нативный вызов и обновляет сессию', async () => {
			authStorage.session = {
				type: 'Bearer',
				accessToken: 'old-native-acc',
				refreshToken: 'old-native-ref',
				accessExpTimestamp: 100,
				refreshExpTimestamp: 200
			};

			const postMock = vi.mocked(CapacitorHttp.post).mockResolvedValue({
				status: 200,
				data: {
					data: {
						accessToken: 'refreshed-native-acc',
						refreshToken: 'refreshed-native-ref',
						accessExpTimestamp: 500,
						refreshExpTimestamp: 1000
					}
				},
				headers: {},
				url: 'https://api.dtf.ru/v3.4/auth/refresh'
			});

			const success = await refreshSession();

			expect(success).toBe(true);
			expect(postMock).toHaveBeenCalledTimes(1);
			expect(postMock.mock.calls[0][0].url).toBe('https://api.dtf.ru/v3.4/auth/refresh');
			expect(postMock.mock.calls[0][0].data).toContain('token=old-native-ref');
			expect(authStorage.session?.accessToken).toBe('refreshed-native-acc');
			expect(authStorage.session?.refreshToken).toBe('refreshed-native-ref');
		});

		it('loginByToken успешно входит без прокси при валидном ответе нативного refresh', async () => {
			vi.mocked(CapacitorHttp.post).mockResolvedValue({
				status: 200,
				data: {
					data: {
						accessToken: 'token-login-acc',
						refreshToken: 'token-login-ref',
						accessExpTimestamp: 999,
						refreshExpTimestamp: 888
					}
				},
				headers: {},
				url: 'https://api.dtf.ru/v3.4/auth/refresh'
			});

			const session = await loginByToken('raw-refresh-cookie-string');

			expect(session.accessToken).toBe('token-login-acc');
			expect(session.refreshToken).toBe('token-login-ref');
			expect(authStorage.dtfToken).toBe('token-login-acc');
		});

		it('loginByToken при ошибке refresh в нативном режиме выбрасывает ApiError (а не ProxyError)', async () => {
			vi.mocked(CapacitorHttp.post).mockResolvedValue({
				status: 404,
				data: { message: 'Refresh session not found', code: 105, data: null },
				headers: {},
				url: 'https://api.dtf.ru/v3.4/auth/refresh'
			});

			try {
				await loginByToken('bad-token');
				expect.unreachable('Должна была выброситься ошибка');
			} catch (err: unknown) {
				expect(err instanceof ApiError).toBe(true);
				expect(err instanceof ProxyError).toBe(false);
				expect((err as ApiError).status).toBe(401);
			}
		});

		it('refreshSession при 404 возвращает false без падений', async () => {
			authStorage.session = {
				type: 'Bearer',
				accessToken: 'acc',
				refreshToken: 'expired-ref',
				accessExpTimestamp: 100,
				refreshExpTimestamp: 200
			};

			vi.mocked(CapacitorHttp.post).mockResolvedValue({
				status: 404,
				data: { message: 'Refresh session not found', code: 105, data: null },
				headers: {},
				url: 'https://api.dtf.ru/v3.4/auth/refresh'
			});

			const success = await refreshSession();
			expect(success).toBe(false);
		});
	});
});
