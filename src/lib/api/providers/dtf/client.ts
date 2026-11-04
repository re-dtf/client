import { untrack } from 'svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { settings, getEnabledProxies, type ProxyItem } from '$lib/storage/settings.svelte';
import { ApiError } from '../../errors';

/** Адреса и версии API DTF */
export const API_URL = 'https://api.dtf.ru/v2.31';
export const COMMENTS_API_URL = 'https://api.dtf.ru/v2.10';
export const AUTH_URL = 'https://api.dtf.ru/v3.4';
export const UPLOAD_URL = 'https://upload.dtf.ru/v2.8';

/** Адрес API другой версии: у каждого метода DTF своя (`apiV('2.4')` для `comment/add`) */
export const apiV = (version: string) => `https://api.dtf.ru/v${version}`;

/** Для методов, которые работают только после входа */
export function requireAuth() {
	if (!authStorage.dtfToken) throw new Error('Необходима авторизация');
}

/**
 * Выполняет запрос через включённые прокси с последовательным перебором при сбоях (failover).
 * Если первый прокси возвращает 5xx, 429, сетевую ошибку или блокировку WAF, пробуем следующий.
 */
export async function fetchWithProxyFailover(
	path: string,
	createInit: () => RequestInit
): Promise<{ response: Response; proxy: ProxyItem }> {
	const enabled = getEnabledProxies();
	if (enabled.length === 0) {
		throw new Error('Нет активных прокси. Включите хотя бы один прокси в настройках.');
	}

	const errors: string[] = [];
	const cleanPath = path.startsWith('/') ? path : `/${path}`;

	for (const proxy of enabled) {
		const base = proxy.url.replace(/\/+$/, '');
		const targetUrl = `${base}${cleanPath}`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);

		try {
			const init = createInit();
			const signal = init.signal && typeof AbortSignal.any === 'function'
				? AbortSignal.any([init.signal, controller.signal])
				: controller.signal;
			const res = await fetch(targetUrl, { ...init, signal });
			clearTimeout(timeoutId);

			// Ошибки сервера прокси или превышение лимитов
			if (res.status >= 500 || res.status === 429) {
				errors.push(`${proxy.name}: ошибка сервера ${res.status}`);
				continue;
			}

			// Проверка на HTML-блокировку (WAF Cloudflare/Valtown вместо JSON от DTF)
			const contentType = res.headers.get('content-type') || '';
			if ((res.status === 403 || res.status === 404) && !contentType.includes('application/json')) {
				errors.push(`${proxy.name}: блокировка или неверный адрес (${res.status})`);
				continue;
			}

			return { response: res, proxy };
		} catch (err: unknown) {
			clearTimeout(timeoutId);
			const msg =
				err instanceof Error
					? err.name === 'AbortError'
						? 'Таймаут (10с)'
						: err.message
					: 'Ошибка сети';
			errors.push(`${proxy.name}: ${msg}`);
			continue;
		}
	}

	throw new Error(`Все доступные прокси (${enabled.length}) не ответили:\n${errors.map((e) => `• ${e}`).join('\n')}`);
}

/** Обновляет access-токен по refresh-токену с перебором прокси при ошибках. */
export async function refreshSession(): Promise<boolean> {
	const session = untrack(() => authStorage.session);
	if (!session || !session.refreshToken) return false;

	const enabled = getEnabledProxies();
	if (enabled.length === 0) {
		const formData = new FormData();
		formData.append('token', session.refreshToken);
		try {
			const res = await fetch(`${AUTH_URL}/auth/refresh`, {
				method: 'POST',
				headers: { 'Accept': 'application/json' },
				body: formData
			});
			if (!res.ok) return false;
			const json = await res.json().catch(() => ({}));
			const sessionData = json.data || json;
			const newAccessToken =
				sessionData.accessToken ||
				res.headers.get('x-auth-token') ||
				res.headers.get('jwtauthorization');
			const newRefreshToken =
				sessionData.refreshToken ||
				res.headers.get('x-refresh-token') ||
				session.refreshToken;
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

	try {
		const { response } = await fetchWithProxyFailover('/v3.4/auth/refresh', () => {
			const formData = new FormData();
			formData.append('token', session.refreshToken);
			return {
				method: 'POST',
				headers: { 'Accept': 'application/json' },
				body: formData
			};
		});

		if (!response.ok) return false;

		const json = await response.json().catch(() => ({}));
		const sessionData = json.data || json;

		const newAccessToken =
			sessionData.accessToken ||
			response.headers.get('x-auth-token') ||
			response.headers.get('jwtauthorization');
		const newRefreshToken =
			sessionData.refreshToken ||
			response.headers.get('x-refresh-token') ||
			session.refreshToken;

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
		const raw = e instanceof Error ? e.message : 'Неизвестная ошибка';
		throw new ApiError(`Сетевая ошибка: ${raw}`, {
			url,
			rawMessage: raw,
			cause: e
		});
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
		const defaultMessage = response.status === 422
			? 'Ошибка 422 (возможно, действие уже выполнено)'
			: response.status >= 500 && response.status <= 599
				? `Сервер DTF временно недоступен (код ${response.status})`
				: response.status === 429
					? 'Слишком много запросов к DTF (код 429)'
					: `Ошибка API: ${response.status}`;
		const message = json.message || defaultMessage;
		throw new ApiError(message, {
			url,
			status: response.status,
			rawMessage: json.message || response.statusText || String(response.status)
		});

	}

	return response;
}
