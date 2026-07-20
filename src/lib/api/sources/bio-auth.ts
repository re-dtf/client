import { dtfApiProvider } from '../providers/dtf';
import { sourceStorage } from '$lib/storage/sources.svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { resolveSourceUrl } from './types';
import type { SourceState } from './types';

export const BIO_CLEANUP_TTL_MS = 10 * 60000; // 10 minutes
export const BIO_VERIFY_MAX_ATTEMPTS = 5;
export const BIO_VERIFY_RETRY_DELAY_MS = 10000;

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getBioInjection(code: string): string {
	return `\n\n[${code}]\nЭто токен авторизации re:connect (reDTF).\nУдалите его, если он не удалился автоматически.`;
}

export async function startBioVerification(source: SourceState, signal?: AbortSignal): Promise<void> {
	if (source.manifest.auth.type !== 'bio_verification' || !source.manifest.auth.bioVerification) {
		throw new Error('Source does not support bio verification');
	}

	// Wait for any previous pending cleanup to finish
	if (sourceStorage.pendingBioCleanup) {
		await cleanupHangingBio(true);
		if (sourceStorage.pendingBioCleanup) {
			throw new Error('Не удалось очистить профиль от предыдущего кода подтверждения. Пожалуйста, попробуйте позже или удалите код из профиля вручную.');
		}
	}

	const session = authStorage.session;
	if (!session || !authStorage.dtfToken) {
		throw new Error('Not authorized in DTF');
	}

	let me;
	try {
		if (!dtfApiProvider.getMe) throw new Error('DTF provider does not support getMe');
		me = await dtfApiProvider.getMe();
	} catch (e: any) {
		throw new Error('Failed to fetch DTF profile: ' + e.message);
	}

	const dtfUserId = me.id;
	const originalBio = me.description || '';
	
	const bioAuth = source.manifest.auth.bioVerification;
	const challengeUrl = resolveSourceUrl(source.manifest.api.baseUrl, bioAuth.challengeEndpoint);
	
	const headers = new Headers(source.manifest.api.defaultHeaders || {});
	const init: RequestInit = {
		method: bioAuth.challengeMethod,
		headers,
		signal: AbortSignal.timeout(5000)
	};

	if (bioAuth.challengeMethod === 'POST') {
		init.body = JSON.stringify({ dtfUserId });
		headers.set('Content-Type', 'application/json');
	}

	const urlStr = bioAuth.challengeMethod === 'GET' 
		? (() => { const u = new URL(challengeUrl); u.searchParams.set('dtfUserId', dtfUserId.toString()); return u.toString(); })()
		: challengeUrl;

	let challengeResponse;
	try {
		const res = await fetch(urlStr, init);
		if (!res.ok) throw new Error(`Challenge failed: ${res.statusText}`);
		challengeResponse = await res.json();
	} catch (e: any) {
		throw new Error('Failed to start challenge: ' + e.message);
	}

	const code = challengeResponse.code;
	if (!code) throw new Error('Source did not return a verification code');

	if (signal?.aborted) {
		throw new Error('Verification cancelled');
	}

	// Save to local storage
	sourceStorage.pendingBioCleanup = {
		originalBio,
		sourceId: source.manifest.id,
		code,
		timestamp: Date.now(),
		dtfUserId
	};

	// Write to DTF bio
	const bioAddition = getBioInjection(code);
	const newBio = originalBio + bioAddition;
	
	try {
		if (!dtfApiProvider.updateBio) throw new Error('DTF provider does not support updateBio');
		await dtfApiProvider.updateBio(newBio, dtfUserId);
	} catch (e: any) {
		// Do NOT revert sourceStorage.pendingBioCleanup here.
		// If network fails but server actually processed the update, reverting would cause us to lose the originalBio forever.
		if (e.message.includes('422') || e.message.includes('400')) {
			sourceStorage.pendingBioCleanup = null;
			throw new Error('Не удалось обновить профиль DTF. Возможно, ваше описание профиля слишком длинное. Пожалуйста, временно удалите часть текста из профиля для прохождения верификации.');
		}
		throw new Error('Failed to update DTF bio: ' + e.message);
	}
}

export async function isPendingCleanupValidForCurrentUser(): Promise<boolean> {
	const cleanup = sourceStorage.pendingBioCleanup;
	if (!cleanup) return false;
	try {
		if (!dtfApiProvider.getMe) return false;
		const me = await dtfApiProvider.getMe();
		return !!(me && me.id === cleanup.dtfUserId);
	} catch {
		return false;
	}
}

// Check and cleanup hanging bio requests (used in +layout.svelte)
export async function cleanupHangingBio(force: boolean = false): Promise<void> {
	const cleanup = sourceStorage.pendingBioCleanup;
	if (!cleanup) return;

	const timePassed = Date.now() - cleanup.timestamp;
	if (force || timePassed > BIO_CLEANUP_TTL_MS) {
		// Time passed, we should clean up
		try {
			if (!dtfApiProvider.getMe || !dtfApiProvider.updateBio) return;
			const me = await dtfApiProvider.getMe();
			if (me && me.id === cleanup.dtfUserId) {
				// We are the same user, restore bio safely without overwriting manual changes
				const currentBio = me.description || '';
				const safeCode = escapeRegExp(cleanup.code);
				const injectionRegex = new RegExp(`\\s*\\[${safeCode}\\][\\s\\S]*?Удалите его, если он не удалился автоматически\\.`);
				
				if (injectionRegex.test(currentBio)) {
					const cleanBio = currentBio.replace(injectionRegex, '');
					await dtfApiProvider.updateBio(cleanBio, cleanup.dtfUserId);
				}
				sourceStorage.pendingBioCleanup = null;
			} else if (me && me.id !== cleanup.dtfUserId) {
				// We are a different user. We cannot modify the old user's bio, 
				// but we must clear the flag so this new user is not locked out.
				sourceStorage.pendingBioCleanup = null;
			}
		} catch (e) {
			// Silent fail, will retry on next reload
		}
	}
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function verifyBioAuth(source: SourceState, onProgress?: (attempt: number, max: number) => boolean): Promise<void> {
	const cleanup = sourceStorage.pendingBioCleanup;
	if (!cleanup) throw new Error("Нет активного процесса верификации");
	if (cleanup.sourceId !== source.manifest.id) throw new Error("Активный процесс верификации относится к другому источнику");
	if (Date.now() - cleanup.timestamp > BIO_CLEANUP_TTL_MS) {
		await cleanupHangingBio(true);
		throw new Error("Время, отведенное на верификацию, истекло");
	}

	const bioAuth = source.manifest.auth.bioVerification;
	if (!bioAuth) throw new Error("Источник не поддерживает данный тип верификации");

	const verifyUrl = resolveSourceUrl(source.manifest.api.baseUrl, bioAuth.verifyEndpoint);
	
	for (let attempt = 1; attempt <= BIO_VERIFY_MAX_ATTEMPTS; attempt++) {
		if (onProgress) {
			const shouldAbort = onProgress(attempt, BIO_VERIFY_MAX_ATTEMPTS);
			if (shouldAbort) throw new Error("Верификация прервана пользователем");
		}
		try {
			const headers = new Headers(source.manifest.api.defaultHeaders || {});
			const init: RequestInit = {
				method: bioAuth.verifyMethod,
				headers,
				signal: AbortSignal.timeout(5000)
			};

			if (bioAuth.verifyMethod === 'POST') {
				init.body = JSON.stringify({
					dtfUserId: cleanup.dtfUserId,
					code: cleanup.code
				});
				headers.set('Content-Type', 'application/json');
			}

			const urlStr = bioAuth.verifyMethod === 'GET'
				? (() => {
					const u = new URL(verifyUrl);
					u.searchParams.set('dtfUserId', cleanup.dtfUserId.toString());
					u.searchParams.set('code', cleanup.code);
					return u.toString();
				})()
				: verifyUrl;

			const res = await fetch(urlStr, init);
			const data = await res.json().catch(() => ({}));

			if (res.ok && data.token) {
				// Успешная авторизация
				let expiresAt: number | undefined;
				if (data.expiresAt) {
					const parsed = typeof data.expiresAt === 'number' 
						? data.expiresAt 
						: new Date(data.expiresAt).getTime();
					if (!Number.isNaN(parsed)) expiresAt = parsed;
				}

				sourceStorage.setToken(source.manifest.id, data.token, expiresAt);
				await cleanupHangingBio(true);
				return;
			}
			
			// Если сервер вернул конкретную ошибку (например, не тот код, или исчерпаны лимиты)
			// можно прервать цикл, но план предполагает просто ретрай.
			// Оставим ретрай для любых ошибок (в т.ч. not_verified_yet).
			
		} catch (e) {
			// Сетевая ошибка, продолжаем ретраи
		}

		if (attempt < BIO_VERIFY_MAX_ATTEMPTS) {
			await sleep(BIO_VERIFY_RETRY_DELAY_MS);
		}
	}

	throw new Error("Не удалось подтвердить код. Убедитесь, что код добавлен в описание профиля и попробуйте снова.");
}
