/*
 * Ограничение частоты запросов поиска в веб-версии: не более 5 запросов за 20 минут.
 * Хранится в localStorage (слой cache).
 */
import { persistedState } from './persisted.svelte';
import { isNative } from '$lib/capacitor';
import { ApiError } from '$lib/api/errors';

export const SEARCH_RATE_LIMIT_MAX = 5;
export const SEARCH_RATE_LIMIT_WINDOW_MS = 20 * 60 * 1000; // 20 минут

export const searchRateLimit = persistedState<number[]>(
	'redtf:cache:search-rate-limit',
	[]
);

/**
 * Проверяет клиентский лимит поиска.
 * В нативном приложении (Capacitor) и в локальной разработке лимит не применяется (если не задан forceCheck).
 * Если лимит превышен, выбрасывает ApiError со статусом 429.
 */
export function checkAndConsumeSearchLimit(options?: { now?: number; forceCheck?: boolean }): void {
	if (!options?.forceCheck && (isNative() || import.meta.env.DEV)) {
		return;
	}

	const now = options?.now ?? Date.now();
	const active = (searchRateLimit.value || []).filter(
		(t) => typeof t === 'number' && now - t < SEARCH_RATE_LIMIT_WINDOW_MS
	);

	if (active.length >= SEARCH_RATE_LIMIT_MAX) {
		const oldest = Math.min(...active);
		const remainingMs = oldest + SEARCH_RATE_LIMIT_WINDOW_MS - now;
		const remainingMin = Math.max(1, Math.ceil(remainingMs / 60_000));
		throw new ApiError(
			`Лимит поиска в веб-версии исчерпан (не более ${SEARCH_RATE_LIMIT_MAX} запросов за 20 минут). Попробуйте через ${remainingMin} мин. или воспользуйтесь приложением reDTF.`,
			{ status: 429 }
		);
	}

	searchRateLimit.value = [...active, now];
}
