import type { Session } from '../../types';
import { authStorage } from '$lib/storage/auth.svelte';
import { getEnabledProxies } from '$lib/storage/settings.svelte';
import { fetchWithProxyFailover, refreshSession } from './client';

/** Вход по почте и паролю. Проходит через включённые прокси с поддержкой автоматического перебора при сбоях (failover). */
export async function login(email: string, password: string): Promise<Session> {
	if (getEnabledProxies().length === 0) {
		throw new Error('Укажите или включите хотя бы один прокси в настройках, прямой запрос логина заблокирован CORS политикой DTF.');
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
		throw new Error(json.message || json.error?.message || `Ошибка авторизации: ${response.status}`);
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
 * по refresh-токену получаем access. Обновление идёт через прокси с failover.
 */
export async function loginByToken(input: string): Promise<Session> {
	if (getEnabledProxies().length === 0) {
		throw new Error('Укажите или включите прокси в настройках: обновление токена заблокировано CORS политикой DTF.');
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
		throw new Error('Не удалось войти по токену. Возможно, он устарел или все настроенные прокси недоступны.');
	}

	return authStorage.session!;
}
