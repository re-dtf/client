import { sourceStorage } from '$lib/storage/sources.svelte';
import { resolveSourceUrl } from './types';
import type { SourceState } from './types';
import { base } from '$app/paths';

function generateRandomString(length: number): string {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
	let result = '';
	const values = new Uint32Array(length);
	crypto.getRandomValues(values);
	for (let i = 0; i < length; i++) {
		result += charset[values[i] % charset.length];
	}
	return result;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	
	// Base64URL encode
	const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startOAuth2PKCE(source: SourceState): Promise<void> {
	if (source.manifest.auth.type !== 'oauth2_pkce' || !source.manifest.auth.oauth2) {
		throw new Error('Source does not support OAuth2 PKCE');
	}

	const oauth2 = source.manifest.auth.oauth2;
	
	// 1. СРАЗУ открываем окно СИНХРОННО до любых await (паттерн обхода Popup Blocker'ов в Safari/Chrome)
	const width = 600;
	const height = 700;
	const left = window.screenX + (window.outerWidth - width) / 2;
	const top = window.screenY + (window.outerHeight - height) / 2;
	
	const popup = window.open(
		'',
		'oauth2_popup',
		`width=${width},height=${height},left=${left},top=${top}`
	);
	
	if (!popup) {
		throw new Error('Не удалось открыть всплывающее окно для авторизации. Пожалуйста, разрешите всплывающие окна для этого сайта.');
	}

	// 2. Теперь спокойно делаем асинхронные вычисления
	const codeVerifier = generateRandomString(64);
	const codeChallenge = await generateCodeChallenge(codeVerifier);
	const state = generateRandomString(16);
	
	// Учитываем base path приложения (например, для хостинга на GitHub Pages, где app на /reDTF)
	// base из $app/paths содержит строку, например, '/reDTF' (или пустую строку, если корень)
	const redirectUri = window.location.origin + base;

	const authUrlStr = resolveSourceUrl(source.manifest.api.baseUrl, oauth2.authorizationUrl);
	const authUrl = new URL(authUrlStr);
	
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('client_id', oauth2.clientId);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	authUrl.searchParams.set('code_challenge', codeChallenge);
	authUrl.searchParams.set('code_challenge_method', 'S256');
	authUrl.searchParams.set('state', state);
	if (oauth2.scopes && oauth2.scopes.length > 0) {
		authUrl.searchParams.set('scope', oauth2.scopes.join(' '));
	}

	// 3. Направляем попап на нужный URL
	popup.location.href = authUrl.toString();

	return new Promise((resolve, reject) => {
		const checkInterval = setInterval(async () => {
			if (popup.closed) {
				clearInterval(checkInterval);
				reject(new Error('Окно авторизации было закрыто до завершения процесса.'));
				return;
			}
			
			try {
				const popupUrl = popup.location.href;
				
				// Если popup перенаправился на наш redirect_uri
				if (popupUrl && popupUrl.startsWith(redirectUri)) {
					const urlParams = new URL(popupUrl).searchParams;
					const code = urlParams.get('code');
					const returnedState = urlParams.get('state');
					const error = urlParams.get('error');
					
					// Только если это не страница авторизации провайдера, 
					// а реальный редирект с параметрами
					if (code || error) {
						clearInterval(checkInterval);
						popup.close();

						if (error) {
							reject(new Error(`Ошибка авторизации: ${error}`));
							return;
						}

						if (returnedState !== state) {
							reject(new Error('Ошибка безопасности: несовпадение state'));
							return;
						}

						if (code) {
							try {
								await exchangeCodeForToken(source, code, codeVerifier, redirectUri);
								resolve();
							} catch (e: any) {
								reject(new Error(`Не удалось обменять код на токен: ${e.message}`));
							}
						}
					}
				}
			} catch (e) {
				// Скорее всего, DOMException из-за Cross-Origin. 
				// Игнорируем, ждем пока провайдер перенаправит обратно на наш домен.
			}
		}, 500);
	});
}

async function exchangeCodeForToken(source: SourceState, code: string, codeVerifier: string, redirectUri: string) {
	const oauth2 = source.manifest.auth.oauth2!;
	const tokenUrl = resolveSourceUrl(source.manifest.api.baseUrl, oauth2.tokenUrl);

	const body = new URLSearchParams();
	body.append('grant_type', 'authorization_code');
	body.append('code', code);
	body.append('redirect_uri', redirectUri);
	body.append('client_id', oauth2.clientId);
	body.append('code_verifier', codeVerifier);

	const headers = new Headers(source.manifest.api.defaultHeaders || {});
	headers.set('Content-Type', 'application/x-www-form-urlencoded');

	const res = await fetch(tokenUrl, {
		method: 'POST',
		headers,
		body,
		signal: AbortSignal.timeout(10000)
	});

	if (!res.ok) {
		const errorText = await res.text().catch(() => '');
		throw new Error(`HTTP ${res.status} ${res.statusText} ${errorText}`);
	}

	const data = await res.json();
	if (!data.access_token) {
		throw new Error('Ответ не содержит access_token');
	}

	let expiresAt: number | undefined;
	if (data.expires_in) {
		expiresAt = Date.now() + data.expires_in * 1000;
	}

	sourceStorage.setToken(source.manifest.id, data.access_token, expiresAt);
}
