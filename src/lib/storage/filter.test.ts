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

import { addIgnoredKeyword, addIgnoredTag, filterSettings, normalizeTag, removeIgnoredKeyword, removeIgnoredTag } from './filter.svelte';

describe('filter storage', () => {
	beforeEach(() => {
		localStorage.clear();
		filterSettings.patch({ tags: [], keywords: [] });
	});

	it('нормализует теги', () => {
		expect(normalizeTag('#игры')).toBe('игры');
		expect(normalizeTag('###Аниме  ')).toBe('аниме');
		expect(normalizeTag('кино')).toBe('кино');
	});

	it('добавляет и удаляет теги', () => {
		expect(addIgnoredTag('#игры')).toBe(true);
		expect(filterSettings.value.tags).toEqual(['игры']);

		// повторное добавление дубликата
		expect(addIgnoredTag('Игры')).toBe(false);
		expect(filterSettings.value.tags).toEqual(['игры']);

		removeIgnoredTag('игры');
		expect(filterSettings.value.tags).toEqual([]);
	});

	it('добавляет и удаляет ключевые слова', () => {
		expect(addIgnoredKeyword('Спойлер')).toBe(true);
		expect(filterSettings.value.keywords).toEqual(['спойлер']);

		expect(addIgnoredKeyword('спойлер')).toBe(false);

		removeIgnoredKeyword('СПОЙЛЕР');
		expect(filterSettings.value.keywords).toEqual([]);
	});
});
