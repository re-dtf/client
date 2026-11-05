import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appear } from './appear';

describe('appear', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('возвращает стабильную ссылку на обработчик для одного ключа', () => {
		expect(appear('feedIn')).toBe(appear('feedIn'));
	});

	it('анимирует элемент при первом вызове и игнорирует повторные', () => {
		const animate = vi.fn();
		const el = { animate } as unknown as Element;

		const handler = appear('feedIn');
		handler(el);
		expect(animate).toHaveBeenCalledTimes(1);

		// Повторный вызов на том же элементе (например, при обновлении компонента или открытии модалки)
		handler(el);
		expect(animate).toHaveBeenCalledTimes(1);
	});

	it('анимирует новый элемент ровно один раз', () => {
		const animate1 = vi.fn();
		const el1 = { animate: animate1 } as unknown as Element;
		const animate2 = vi.fn();
		const el2 = { animate: animate2 } as unknown as Element;

		const handler = appear('feedIn');
		handler(el1);
		handler(el2);

		expect(animate1).toHaveBeenCalledTimes(1);
		expect(animate2).toHaveBeenCalledTimes(1);
	});
});
