import { untrack } from 'svelte';
import type { ApiProvider, Post, Comment, Session, PaginatedResult } from '../types';
import { authStorage } from '$lib/storage/auth.svelte';

const baseUrl = 'https://api.dtf.ru/v2.31';
const authUrl = 'https://api.dtf.ru/v3.4';

async function refreshSession(): Promise<boolean> {
	const session = untrack(() => authStorage.session);
	if (!session || !session.refreshToken) return false;

	const formData = new FormData();
	formData.append('token', session.refreshToken);

	let proxyBase = untrack(() => authStorage.proxyUrl) || '';
	proxyBase = proxyBase.replace(/\/$/, '');
	const targetUrl = proxyBase ? `${proxyBase}/v3.4/auth/refresh` : `${authUrl}/auth/refresh`;

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
			refreshToken: newRefreshToken,
		};
		return true;
	} catch (e) {
		return false;
	}
}

async function fetchWithAuth(url: string, options: RequestInit = {}, authHeader: 'x-device-token' | 'JWTAuthorization' = 'x-device-token'): Promise<Response> {
	const headers = new Headers(options.headers || { 'Accept': 'application/json' });
	
	const setAuth = (token: string) => {
		headers.set(authHeader, authHeader === 'JWTAuthorization' ? `Bearer ${token}` : token);
	};

	const currentToken = untrack(() => authStorage.dtfToken);
	if (currentToken) setAuth(currentToken);

	const doFetch = () => fetch(url, { ...options, headers }).catch(e => {
		throw new Error(`Сетевая ошибка: ${e.message}`);
	});

	let response = await doFetch();

	const checkToken = untrack(() => authStorage.dtfToken);
	if (response.status === 401 && checkToken) {
		if (await refreshSession() && untrack(() => authStorage.dtfToken)) {
			setAuth(untrack(() => authStorage.dtfToken));
			response = await doFetch();
		} else if (authHeader === 'JWTAuthorization') {
			if (typeof window !== 'undefined') {
				const sessionStr = JSON.stringify(untrack(() => authStorage.session), null, 2);
				window.alert(`[DTF API Error] 401 Unauthorized (JWTAuthorization)\n\nНе удалось обновить токен. Автовыход отключен.\nСессия: ${sessionStr}`);
			}
		} else {
			headers.delete(authHeader);
			response = await doFetch();
		}
	}

	if (!response.ok) {
		const json = await response.json().catch(() => ({}));
		if (response.status === 422) throw new Error(json.message || "Ошибка 422 (возможно, действие уже выполнено)");
		throw new Error(json.message || `Ошибка API: ${response.status}`);
	}

	return response;
}

function mapEntryToPost(entry: any): Post {
	return {
		id: entry.id,
		title: entry.title || 'Без заголовка',
		blocks: entry.blocks || [],
		author: {
			id: entry.author?.id || 0,
			name: entry.author?.name || 'Аноним',
			avatarUrl: entry.author?.avatar_url
		},
		commentsCount: entry.counters?.comments || 0,
		createdAt: new Date((entry.date || Date.now() / 1000) * 1000).toISOString()
	};
}

export const dtfApiProvider: ApiProvider = {
	name: 'DTF Official API',

	async login(email: string, password: string): Promise<Session> {
		const formData = new FormData();
		formData.append('email', email);
		formData.append('password', password);

		let response;
		let proxyBase = authStorage.proxyUrl || '';
		proxyBase = proxyBase.replace(/\/$/, '');
		
		if (!proxyBase) {
			throw new Error('Укажите URL прокси сервера в настройках ниже, прямой запрос логина заблокирован CORS политикой DTF.');
		}

		const targetUrl = `${proxyBase}/v3.4/auth/email/login`;
		
		try {
			response = await fetch(targetUrl, {
				method: 'POST',
				headers: {
					'Accept': 'application/json'
				},
				body: formData
			});
		} catch (e) {
			throw new Error(`Сетевая ошибка при попытке авторизации: ${(e as Error).message}`);
		}

		const json = await response.json();

		if (!response.ok) {
			throw new Error(json.message || json.error?.message || `Ошибка авторизации: ${response.status}`);
		}

		const sessionData = json.data || json; // fallback in case API returns unwrapped

		return sessionData as Session;
	},

	async loginByToken(tokenStr: string): Promise<Session> {
		let token = tokenStr.trim();
		let expTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 дней по умолчанию
		let isRefreshToken = false;

		// Пытаемся распарсить JSON, если пользователь вставил auth-refresh-token или похожий объект
		try {
			const parsed = JSON.parse(token);
			if (parsed.token) {
				token = parsed.token;
				// Если это из auth-refresh-token, считаем это refresh токеном
				isRefreshToken = true; 
			}
			if (parsed.expTimestamp) {
				expTimestamp = parsed.expTimestamp;
			}
		} catch (e) {
			// Если не JSON, то считаем, что это просто строка токена (обычно osnova-aid, т.е. access token)
		}

		const sessionData: Session = {
			type: 'Bearer',
			accessToken: isRefreshToken ? '' : token,
			refreshToken: isRefreshToken ? token : '',
			accessExpTimestamp: isRefreshToken ? 0 : expTimestamp,
			refreshExpTimestamp: isRefreshToken ? expTimestamp : 0
		};
		
		authStorage.session = sessionData;

		if (isRefreshToken) {
			// Пытаемся обновить сессию, чтобы получить access_token
			const success = await refreshSession();
			if (!success) {
				if (typeof window !== 'undefined') {
					window.alert(`[DTF API Error] Не удалось обновить токен.\n\nRefresh Token: ${token}\nАвтовыход отключен.`);
				}
				throw new Error('Не удалось получить access token по refresh токену. Возможно, он устарел.');
			}
		} else {
			// Проверим access токен запросом профиля
			try {
				await fetchWithAuth(`${baseUrl}/user/me`, {}, 'x-device-token');
			} catch (e) {
				if (typeof window !== 'undefined') {
					window.alert(`[DTF API Error] Ошибка проверки токена профиля.\n\nAccess Token: ${token}\nОшибка: ${e}\nАвтовыход отключен.`);
				}
				throw new Error('Токен недействителен или устарел');
			}
		}

		return authStorage.session!;
	},

	async reactToComment(commentId: number, reactionId: number): Promise<void> {
		if (!authStorage.dtfToken) throw new Error('Необходима авторизация');

		const formData = new FormData();
		formData.append('type', reactionId.toString());

		await fetchWithAuth(`https://api.dtf.ru/v2.10/comment/${commentId}/react`, {
			method: 'POST',
			body: formData
		}, 'JWTAuthorization');
	},

	async getPosts(cursor?: { lastId: number; lastSortingValue: number }): Promise<PaginatedResult<Post>> {
		let url = `${baseUrl}/feed?pageName=popular&sorting=hotness`;
		if (cursor) {
			url += `&lastId=${cursor.lastId}&lastSortingValue=${cursor.lastSortingValue}`;
		}

		const response = await fetchWithAuth(url, {}, 'x-device-token');
		const json = await response.json();
		
		const entries = json.result.items
			.map((item: any) => item.data || item)
			.filter((entry: any) => entry.id !== undefined);

		return {
			items: entries.map((entry: any) => mapEntryToPost(entry)),
			lastId: json.result.lastId,
			lastSortingValue: json.result.lastSortingValue
		};
	},

	async getPost(id: number): Promise<Post> {
		const response = await fetchWithAuth(`${baseUrl}/content?id=${id}`, {}, 'x-device-token');
		const json = await response.json();
		return mapEntryToPost(json.result);
	},

	async getComments(postId: number, cursor?: { lastId: number; lastSortingValue: number }, sorting: string = 'date'): Promise<PaginatedResult<Comment>> {
		let url = `https://api.dtf.ru/v2.10/comments?contentId=${postId}&sorting=${sorting}`;
		if (cursor) {
			url += `&lastId=${cursor.lastId}&lastSortingValue=${cursor.lastSortingValue}`;
		}

		const response = await fetchWithAuth(url, {}, 'JWTAuthorization');
		const json = await response.json();
		
		const items = json.result.items.map((item: any) => ({
			id: item.id,
			postId,
			author: {
				id: item.author?.id || 0,
				name: item.author?.name || 'Аноним',
				avatarUrl: item.author?.avatar?.url || (item.author?.avatar?.data?.uuid ? `https://leonardo.osnova.io/${item.author.avatar.data.uuid}/-/scale_crop/64x64/` : item.author?.avatar_url)
			},
			content: item.text || '',
			createdAt: new Date((item.date || Date.now() / 1000) * 1000).toISOString(),
			replyTo: item.replyTo,
			level: item.level,
			isIgnored: item.isIgnored,
			isRemoved: item.isRemoved,
			media: item.media?.length ? item.media.map((m: any) => ({
				type: m.type === 'movie' ? 'movie' : 'image',
				data: {
					uuid: m.data?.uuid || '',
					width: m.data?.width || 0,
					height: m.data?.height || 0,
					size: m.data?.size || 0,
					type: m.data?.type || '',
					color: m.data?.color,
					base64preview: m.data?.base64preview,
					duration: m.data?.duration,
					has_audio: m.data?.has_audio
				}
			})) : undefined,
			donation: item.donation || undefined,
			reactions: item.reactions ? {
				counters: item.reactions.counters || [],
				reactionId: item.reactions.reactionId || 0
			} : undefined
		}));

		return {
			items,
			lastId: json.result.lastId,
			lastSortingValue: json.result.lastSortingValue
		};
	}
};
