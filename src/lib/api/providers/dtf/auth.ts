import type { Session } from '../../types';
import { authStorage } from '$lib/storage/auth.svelte';
import { getProxyUrl, refreshSession } from './client';

/** Вход по почте и паролю. Только через прокси: DTF не отдаёт CORS-заголовки на вход. */
export async function login(email: string, password: string): Promise<Session> {
	const formData = new FormData();
	formData.append('email', email);
	formData.append('password', password);

	const proxyUrl = getProxyUrl();
	if (!proxyUrl) {
		throw new Error('Укажите URL прокси сервера в настройках, прямой запрос логина заблокирован CORS политикой DTF.');
	}

	let response: Response;
	try {
		response = await fetch(`${proxyUrl}/v3.4/auth/email/login`, {
			method: 'POST',
			headers: { 'Accept': 'application/json' },
			body: formData
		});
	} catch (e: unknown) {
		throw new Error(`Сетевая ошибка при попытке авторизации: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
	}

	const json = await response.json();

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
 * по refresh-токену получаем access. Обновление идёт через прокси, как и вход по паролю.
 */
export async function loginByToken(input: string): Promise<Session> {
	if (!getProxyUrl()) {
		throw new Error('Укажите URL прокси сервера в настройках: обновление токена заблокировано CORS политикой DTF.');
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
		throw new Error('Не удалось войти по токену. Возможно, он устарел или скопирован не полностью.');
	}

	return authStorage.session!;
}
