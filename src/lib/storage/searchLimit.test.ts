import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
	const data: Record<string, string> = {};
	Object.defineProperty(globalThis, 'localStorage', {
		value: {
			getItem: (key: string) => data[key] ?? null,
			setItem: (key: string, value: string) => {
				data[key] = String(value);
			},
			removeItem: (key: string) => {
				delete data[key];
			},
			clear: () => {
				for (const key in data) delete data[key];
			}
		},
		writable: true
	});
});

import {
	checkAndConsumeSearchLimit,
	searchRateLimit,
	SEARCH_RATE_LIMIT_MAX,
	SEARCH_RATE_LIMIT_WINDOW_MS
} from './searchLimit.svelte';
import { ApiError } from '$lib/api/errors';

describe('search rate limit', () => {
	beforeEach(() => {
		localStorage.clear();
		searchRateLimit.value = [];
	});

	it('пропускает до 5 запросов подряд', () => {
		const baseTime = 1_000_000_000;
		for (let i = 0; i < SEARCH_RATE_LIMIT_MAX; i++) {
			expect(() =>
				checkAndConsumeSearchLimit({ now: baseTime + i * 1000, forceCheck: true })
			).not.toThrow();
		}
		expect(searchRateLimit.value).toHaveLength(5);
	});

	it('выбрасывает ApiError со статусом 429 на 6-й запрос', () => {
		const baseTime = 1_000_000_000;
		for (let i = 0; i < SEARCH_RATE_LIMIT_MAX; i++) {
			checkAndConsumeSearchLimit({ now: baseTime + i * 1000, forceCheck: true });
		}

		try {
			checkAndConsumeSearchLimit({ now: baseTime + 5000, forceCheck: true });
			expect.unreachable('Должна была выброситься ошибка');
		} catch (e) {
			expect(e).toBeInstanceOf(ApiError);
			const err = e as ApiError;
			expect(err.status).toBe(429);
			expect(err.message).toContain('Лимит поиска в веб-версии исчерпан');
			expect(err.message).toContain('не более 5 запросов за 20 минут');
		}
	});

	it('разрешает новые запросы после истечения окна в 20 минут', () => {
		const baseTime = 1_000_000_000;
		for (let i = 0; i < SEARCH_RATE_LIMIT_MAX; i++) {
			checkAndConsumeSearchLimit({ now: baseTime + i * 1000, forceCheck: true });
		}

		// Спустя 20 минут после последнего запроса
		const nextTime = baseTime + (SEARCH_RATE_LIMIT_MAX - 1) * 1000 + SEARCH_RATE_LIMIT_WINDOW_MS + 1000;
		expect(() =>
			checkAndConsumeSearchLimit({ now: nextTime, forceCheck: true })
		).not.toThrow();

		// Устаревшие 5 записей удалились, осталась только новая
		expect(searchRateLimit.value).toHaveLength(1);
		expect(searchRateLimit.value[0]).toBe(nextTime);
	});
});
