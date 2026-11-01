import type { Session } from '../../types';
import { authStorage } from '$lib/storage/auth.svelte';
import { API_URL, fetchWithAuth, getProxyUrl, refreshSession } from './client';

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

/**
 * Вход по токену: обычно access-токен (osnova-aid) или JSON из auth-refresh-token.
 * Токен проверяется запросом к API, сессия сохраняется.
 */
export async function loginByToken(tokenStr: string): Promise<Session> {
	let token = tokenStr.trim();
	let expTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 дней по умолчанию
	let isRefreshToken = false;

	// Пользователь мог вставить JSON из auth-refresh-token
	try {
		const parsed = JSON.parse(token);
		if (parsed.token) {
			token = parsed.token;
			isRefreshToken = true;
		}
		if (parsed.expTimestamp) {
			expTimestamp = parsed.expTimestamp;
		}
	} catch {
		// Не JSON: значит, просто строка токена
	}

	authStorage.session = {
		type: 'Bearer',
		accessToken: isRefreshToken ? '' : token,
		refreshToken: isRefreshToken ? token : '',
		accessExpTimestamp: isRefreshToken ? 0 : expTimestamp,
		refreshExpTimestamp: isRefreshToken ? expTimestamp : 0
	};

	if (isRefreshToken) {
		// Обновляем сессию, чтобы получить access-токен
		if (!(await refreshSession())) {
			throw new Error('Не удалось получить access token по refresh токену. Возможно, он устарел.');
		}
	} else {
		// Проверяем access-токен запросом профиля
		try {
			await fetchWithAuth(`${API_URL}/subsite/me`);
		} catch (e: unknown) {
			throw new Error('Токен недействителен или устарел: ' + (e instanceof Error ? e.message : 'Неизвестная ошибка'));
		}
	}

	return authStorage.session!;
}
