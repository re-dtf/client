import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseRefreshToken, login } from './auth';
import { refreshSession } from './client';
import { authStorage } from '$lib/storage/auth.svelte';
import { settings, DEFAULT_PROXIES } from '$lib/storage/settings.svelte';

describe('auth & proxy failover', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		settings.value = {
			theme: 'dtf2022',
			colorScheme: 'auto',
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
			commentVirtualization: 'auto'
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
});
