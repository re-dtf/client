import type { Session } from '../../types';
import { ApiError, ProxyError } from '../../errors';
import { authStorage } from '$lib/storage/auth.svelte';
import { getEnabledProxies } from '$lib/storage/settings.svelte';
import { isNative } from '$lib/capacitor';
import { CapacitorHttp } from '@capacitor/core';
import { AUTH_URL, fetchWithProxyFailover, refreshSession, parseJsonResponse } from './client';

/**
 * Прямая авторизация через нативный HTTP стек Capacitor.
 * Выполняется напрямую в api.dtf.ru минуя CORS-ограничения браузера и внешние прокси.
 */
async function loginNative(email: string, password: string): Promise<Session> {
	try {
		const res = await CapacitorHttp.post({
			url: `${AUTH_URL}/auth/email/login`,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			data: new URLSearchParams({ email, password }).toString(),
			connectTimeout: 10000,
			readTimeout: 15000
		});

		const json = parseJsonResponse(res.data);

		if (res.status < 200 || res.status >= 300) {
			throw new ApiError(json?.message || json?.error?.message || `Ошибка авторизации: ${res.status}`, {
				status: res.status
			});
		}

		return (json.data || json) as Session;
	} catch (err: unknown) {
		if (err instanceof ApiError) throw err;
		const msg = err instanceof Error ? err.message : 'Ошибка сети при авторизации';
		throw new ApiError(msg, { status: 0 });
	}
}

/** Вход по почте и паролю. Проходит через нативный HTTP в приложении или через включённые прокси в браузере. */
export async function login(email: string, password: string): Promise<Session> {
	if (isNative()) {
		return loginNative(email, password);
	}

	if (getEnabledProxies().length === 0) {
		throw new ProxyError('Укажите или включите хотя бы один прокси в настройках, прямой запрос логина заблокирован CORS политикой DTF.');
	}

	const { response } = await fetchWithProxyFailover('/v3.4/auth/email/login', () => {
		const formData = new FormData();
		formData.append('email', email);
		formData.append('password', password);
		return {
			method: 'POST',
			headers: { 'Accept': 'application/json' },
			body: formData
		};
	});

	const json = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new ApiError(json.message || json.error?.message || `Ошибка авторизации: ${response.status}`, {
			status: response.status
		});
	}

	return (json.data || json) as Session;
}

/** Refresh-токен из того, что вставил пользователь: строка из куки `auth-refresh-remember` или JSON `{"token": …}` */
export function parseRefreshToken(input: string): string {
	const text = input.trim();
	try {
		return JSON.parse(text).token || text;
	} catch {
		return text;
	}
}

/**
 * Вход по refresh-токену. Access-токен живёт 5 минут, поэтому по нему одному войти нельзя:
 * по refresh-токену получаем access. В нативном приложении идёт напрямую, в браузере — через прокси.
 */
export async function loginByToken(input: string): Promise<Session> {
	if (!isNative() && getEnabledProxies().length === 0) {
		throw new ProxyError('Укажите или включите прокси в настройках: обновление токена заблокировано CORS политикой DTF.');
	}

	authStorage.session = {
		type: 'Bearer',
		accessToken: '',
		refreshToken: parseRefreshToken(input),
		accessExpTimestamp: 0,
		refreshExpTimestamp: 0
	};

	if (!(await refreshSession())) {
		authStorage.logout();
		if (isNative()) {
			throw new ApiError('Не удалось войти по токену. Возможно, он устарел или сервер DTF недоступен.', { status: 401 });
		}
		throw new ProxyError('Не удалось войти по токену. Возможно, он устарел или все настроенные прокси недоступны.', { status: 401 });
	}

	return authStorage.session!;
}
