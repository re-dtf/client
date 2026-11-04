import { untrack } from 'svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { settings, getEnabledProxies, type ProxyItem } from '$lib/storage/settings.svelte';
import { ApiError, ProxyError } from '../../errors';

/** Адреса и версии API DTF */
export const API_URL = 'https://api.dtf.ru/v2.31';
export const COMMENTS_API_URL = 'https://api.dtf.ru/v2.10';
export const AUTH_URL = 'https://api.dtf.ru/v3.4';
export const UPLOAD_URL = 'https://upload.dtf.ru/v2.8';

/** Адрес API другой версии: у каждого метода DTF своя (`apiV('2.4')` для `comment/add`) */
export const apiV = (version: string) => `https://api.dtf.ru/v${version}`;

/** Для методов, которые работают только после входа */
export function requireAuth() {
	if (!authStorage.dtfToken) {
		throw new ApiError('Необходима авторизация', { status: 401 });
	}
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
		throw new ProxyError('Нет активных прокси. Включите хотя бы один прокси в настройках.');
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

	throw new ProxyError(`Все доступные прокси (${enabled.length}) не ответили:\n${errors.map((e) => `• ${e}`).join('\n')}`);
}

let refreshPromise: Promise<boolean> | null = null;
let lastRefreshFailedAt = 0;
const REFRESH_COOLDOWN_MS = 10000;

/** Сбросить кулдаун сбоя обновления (например, при явном повторе пользователем) */
export function resetRefreshCooldown() {
	lastRefreshFailedAt = 0;
}

/** Обновляет access-токен по refresh-токену с перебором прокси при ошибках. */
export function refreshSession(force = false): Promise<boolean> {
	if (!force && lastRefreshFailedAt && Date.now() - lastRefreshFailedAt < REFRESH_COOLDOWN_MS) {
		return Promise.resolve(false);
	}
	if (refreshPromise) return refreshPromise;
	refreshPromise = doRefreshSession()
		.then((success) => {
			lastRefreshFailedAt = success ? 0 : Date.now();
			return success;
		})
		.catch(() => {
			lastRefreshFailedAt = Date.now();
			return false;
		})
		.finally(() => {
			refreshPromise = null;
		});
	return refreshPromise;
}

async function doRefreshSession(): Promise<boolean> {
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
				refreshToken: newRefreshToken,
				accessExpTimestamp: sessionData.accessExpTimestamp ?? session.accessExpTimestamp,
				refreshExpTimestamp: sessionData.refreshExpTimestamp ?? session.refreshExpTimestamp
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
			refreshToken: newRefreshToken,
			accessExpTimestamp: sessionData.accessExpTimestamp ?? session.accessExpTimestamp,
			refreshExpTimestamp: sessionData.refreshExpTimestamp ?? session.refreshExpTimestamp
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

	const hasToken = untrack(() => !!authStorage.dtfToken);
	const hasRefreshToken = untrack(() => !!authStorage.session?.refreshToken);

	if (response.status === 401 && (hasToken || hasRefreshToken)) {
		const refreshed = await refreshSession();
		const nextToken = untrack(() => authStorage.dtfToken);

		if (refreshed && nextToken) {
			setAuth(nextToken);
			response = await doFetch();
		} else {
			// Прокси недоступен или токен устарел: сбрасываем невалидный accessToken,
			// чтобы следующие вызовы не слали мёртвый токен и не тормозили на повторных попытках.
			// refreshToken сохраняем, чтобы сессию можно было восстановить при доступности прокси.
			const session = untrack(() => authStorage.session);
			if (session && session.accessToken) {
				authStorage.session = { ...session, accessToken: '' };
			}
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
