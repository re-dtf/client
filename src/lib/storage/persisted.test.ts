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

import { persistedState } from './persisted.svelte';

describe('persistedState', () => {
	beforeEach(() => localStorage.clear());

	it('возвращает значение по умолчанию, если ничего не сохранено', () => {
		expect(persistedState('redtf:test:a', { x: 1 }).value).toEqual({ x: 1 });
	});

	it('сохраняет значение сразу при присваивании и читает его в новом экземпляре', () => {
		persistedState('redtf:test:b', 'a').value = 'b';

		expect(JSON.parse(localStorage.getItem('redtf:test:b')!)).toEqual({ v: 1, d: 'b' });
		expect(persistedState('redtf:test:b', 'a').value).toBe('b');
	});

	it('patch заменяет только указанные поля', () => {
		const store = persistedState('redtf:test:c', { a: 1, b: 2 });
		store.patch({ b: 3 });

		expect(store.value).toEqual({ a: 1, b: 3 });
	});

	it('не теряет поля, добавленные в defaults после сохранения', () => {
		persistedState('redtf:test:d', { a: 1 }).value = { a: 5 };

		expect(persistedState('redtf:test:d', { a: 1, b: 2 }).value).toEqual({ a: 5, b: 2 });
	});

	it('при другой версии формата берёт значение по умолчанию', () => {
		persistedState('redtf:test:e', 'old', 1).value = 'saved';

		expect(persistedState('redtf:test:e', 'new', 2).value).toBe('new');
	});

	it('при битом JSON берёт значение по умолчанию', () => {
		localStorage.setItem('redtf:test:f', '{not json');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(persistedState('redtf:test:f', 'fallback').value).toBe('fallback');
		error.mockRestore();
	});
});
