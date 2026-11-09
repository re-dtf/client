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

	it('при другой версии формата берёт значение по умолчанию без функции migrate', () => {
		persistedState('redtf:test:e', 'old', 1).value = 'saved';

		expect(persistedState('redtf:test:e', 'new', 2).value).toBe('new');
	});

	it('при наличии функции migrate успешно переносит данные старой версии и сохраняет новую версию', () => {
		persistedState('redtf:test:migrate', { count: 10 }, 1).value = { count: 10 };

		const migrated = persistedState(
			'redtf:test:migrate',
			{ count: 0, multiplier: 1 },
			2,
			(oldData: any, oldVersion: number) => {
				expect(oldVersion).toBe(1);
				return { count: oldData.count * 2, multiplier: 2 };
			}
		);

		expect(migrated.value).toEqual({ count: 20, multiplier: 2 });
		// Проверяем, что в localStorage записалась версия 2 с новыми данными
		const stored = JSON.parse(localStorage.getItem('redtf:test:migrate')!);
		expect(stored).toEqual({ v: 2, d: { count: 20, multiplier: 2 } });
	});

	it('при битом JSON берёт значение по умолчанию', () => {
		localStorage.setItem('redtf:test:f', '{not json');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(persistedState('redtf:test:f', 'fallback').value).toBe('fallback');
		error.mockRestore();
	});
});
