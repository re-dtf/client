import { untrack } from 'svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { settings } from '$lib/storage/settings.svelte';

/** Адреса и версии API DTF */
export const API_URL = 'https://api.dtf.ru/v2.31';
export const COMMENTS_API_URL = 'https://api.dtf.ru/v2.10';
export const AUTH_URL = 'https://api.dtf.ru/v3.4';
export const UPLOAD_URL = 'https://upload.dtf.ru/v2.8';

/** Адрес прокси без хвостового слэша; пустая строка — прокси не задан. Вход и обновление токена идут только через него (CORS). */
export function getProxyUrl(): string {
	return untrack(() => settings.value.proxyUrl).replace(/\/$/, '');
}

/** Для методов, которые работают только после входа */
export function requireAuth() {
	if (!authStorage.dtfToken) throw new Error('Необходима авторизация');
}

/** Обновляет access-токен по refresh-токену. Возвращает false, если не вышло. */
export async function refreshSession(): Promise<boolean> {
	const session = untrack(() => authStorage.session);
	if (!session || !session.refreshToken) return false;

	const formData = new FormData();
	formData.append('token', session.refreshToken);

	const proxyUrl = getProxyUrl();
	const targetUrl = proxyUrl ? `${proxyUrl}/v3.4/auth/refresh` : `${AUTH_URL}/auth/refresh`;

	try {
		const response = await fetch(targetUrl, {
			method: 'POST',
			headers: { 'Accept': 'application/json' },
			body: formData
		});

		if (!response.ok) return false;

		const json = await response.json().catch(() => ({}));
		const sessionData = json.data || json;

		const newAccessToken = sessionData.accessToken || response.headers.get('x-auth-token') || response.headers.get('jwtauthorization');
		const newRefreshToken = sessionData.refreshToken || response.headers.get('x-refresh-token') || session.refreshToken;

		if (!newAccessToken) return false;

		authStorage.session = {
			...session,
			accessToken: newAccessToken.replace('Bearer ', ''),
			refreshToken: newRefreshToken
		};
		return true;
	} catch {
		return false;
	}
}

/**
 * Запрос к API DTF с токеном. При 401 один раз обновляет токен и повторяет запрос.
 * Ошибки сети и ответы не 2xx превращаются в Error с понятным сообщением.
 */
export async function fetchWithAuth(
	url: string,
	options: RequestInit = {},
	authHeader: 'x-device-token' | 'JWTAuthorization' = 'JWTAuthorization'
): Promise<Response> {
	const headers = new Headers(options.headers || { 'Accept': 'application/json' });

	const setAuth = (token: string) => {
		headers.set(authHeader, authHeader === 'JWTAuthorization' ? `Bearer ${token}` : token);
	};

	const currentToken = untrack(() => authStorage.dtfToken);
	if (currentToken) setAuth(currentToken);

	const doFetch = () => fetch(url, { ...options, headers }).catch((e: unknown) => {
		throw new Error(`Сетевая ошибка: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
	});

	let response = await doFetch();

	if (response.status === 401 && untrack(() => authStorage.dtfToken)) {
		if (await refreshSession() && untrack(() => authStorage.dtfToken)) {
			setAuth(untrack(() => authStorage.dtfToken));
			response = await doFetch();
		} else if (authHeader === 'JWTAuthorization') {
			// Автовыход отключен, сессия могла протухнуть
			console.warn('[DTF API] 401 Unauthorized (JWTAuthorization) - не удалось обновить токен');
		} else {
			headers.delete(authHeader);
			response = await doFetch();
		}
	}

	if (!response.ok) {
		const json = await response.json().catch(() => ({}));
		if (response.status === 422) throw new Error(json.message || 'Ошибка 422 (возможно, действие уже выполнено)');
		throw new Error(json.message || `Ошибка API: ${response.status}`);
	}

	return response;
}
