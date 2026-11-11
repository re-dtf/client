import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	formatAmount,
	normalizeSupportersData,
	safeJsonParse,
	fetchSupportersFromNetwork,
	resetSupportersMemoryCache
} from './supporters';

describe('supporters', () => {
	beforeEach(() => {
		resetSupportersMemoryCache();
		vi.restoreAllMocks();
	});

	describe('formatAmount', () => {
		it('форматирует числа в рубли', () => {
			expect(formatAmount(500)).toBe('500 ₽');
			expect(formatAmount(1000)).toBe('1 000 ₽');
		});

		it('форматирует числовые строки', () => {
			expect(formatAmount('1500')).toBe('1 500 ₽');
		});

		it('сохраняет строки с валютой без изменений', () => {
			expect(formatAmount('500 ₽')).toBe('500 ₽');
			expect(formatAmount('$10')).toBe('$10');
			expect(formatAmount('10 USDT')).toBe('10 USDT');
		});

		it('обрабатывает пустые значения', () => {
			expect(formatAmount(undefined)).toBeUndefined();
			expect(formatAmount('')).toBeUndefined();
		});
	});

	describe('normalizeSupportersData', () => {
		it('обрабатывает массив простых строк', () => {
			const raw = ['Ник 1', 'Ник 2'];
			const result = normalizeSupportersData(raw);
			expect(result.supporters).toEqual([
				{ name: 'Ник 1' },
				{ name: 'Ник 2' }
			]);
		});

		it('обрабатывает массив объектов с суммами и комментариями', () => {
			const raw = [
				{ name: 'Джамиль', amount: 1000, comment: 'На хостинг', link: 'https://dtf.ru/u/120658' },
				{ name: 'Аноним', amount: '500 ₽' }
			];
			const result = normalizeSupportersData(raw);
			expect(result.supporters).toEqual([
				{ name: 'Джамиль', amount: '1 000 ₽', comment: 'На хостинг', link: 'https://dtf.ru/u/120658' },
				{ name: 'Аноним', amount: '500 ₽', comment: undefined, link: undefined }
			]);
		});

		it('обрабатывает объект с полем supporters и метаданными', () => {
			const raw = {
				updatedAt: '2026-11-11',
				description: 'Спасибо всем!',
				supporters: [
					'Герой',
					{ name: 'Спонсор', amount: 500 }
				]
			};
			const result = normalizeSupportersData(raw);
			expect(result.updatedAt).toBe('2026-11-11');
			expect(result.description).toBe('Спасибо всем!');
			expect(result.supporters).toEqual([
				{ name: 'Герой' },
				{ name: 'Спонсор', amount: '500 ₽', comment: undefined, link: undefined }
			]);
		});

		it('обрабатывает словарь ник:сумма', () => {
			const raw = {
				'Вася': 500,
				'Петя': '1 000 ₽',
				'Маша': { amount: 2000, comment: 'Вперёд!' }
			};
			const result = normalizeSupportersData(raw);
			expect(result.supporters).toEqual([
				{ name: 'Вася', amount: '500 ₽' },
				{ name: 'Петя', amount: '1 000 ₽' },
				{ name: 'Маша', amount: '2 000 ₽', comment: 'Вперёд!', link: undefined }
			]);
		});

		it('безопасно возвращает дефолты при повреждённых данных', () => {
			expect(normalizeSupportersData(null)).toEqual({ supporters: [] });
			expect(normalizeSupportersData(undefined)).toEqual({ supporters: [] });
			expect(normalizeSupportersData('строка')).toEqual({ supporters: [] });
		});
	});

	describe('safeJsonParse', () => {
		it('парсит валидный JSON', () => {
			expect(safeJsonParse('{"a": 1}')).toEqual({ a: 1 });
		});

		it('успешно парсит JSON с висячими запятыми (trailing commas)', () => {
			const raw = `{
				"name": "Тест",
				"amount": 1000,
				"comment": "Привет",
			}`;
			expect(safeJsonParse(raw)).toEqual({
				name: 'Тест',
				amount: 1000,
				comment: 'Привет'
			});
		});

		it('удаляет однострочные комментарии', () => {
			const raw = `{
				// комментарий
				"name": "Тест"
			}`;
			expect(safeJsonParse(raw)).toEqual({ name: 'Тест' });
		});
	});

	describe('fetchSupportersFromNetwork', () => {
		it('успешно загружает данные и сохраняет в память', async () => {
			const mockText = JSON.stringify({
				updatedAt: '2026-11-11',
				supporters: [{ name: 'Тестовый спонсор', amount: 500 }]
			});

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				text: async () => mockText
			});
			globalThis.fetch = mockFetch;

			const result = await fetchSupportersFromNetwork();
			expect(result.supporters[0].name).toBe('Тестовый спонсор');
			expect(result.supporters[0].amount).toBe('500 ₽');

			// Второй вызов берет из памяти без повторного fetch
			const cachedResult = await fetchSupportersFromNetwork();
			expect(cachedResult.supporters[0].name).toBe('Тестовый спонсор');
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('пробует зеркало при ошибке первого URL', async () => {
			const mockText = JSON.stringify(['Спонсор из зеркала']);
			const mockFetch = vi.fn()
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce({
					ok: true,
					text: async () => mockText
				});
			globalThis.fetch = mockFetch;

			const result = await fetchSupportersFromNetwork();
			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(result.supporters[0].name).toBe('Спонсор из зеркала');
		});
	});
});
