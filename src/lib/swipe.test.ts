import { describe, expect, it } from 'vitest';
import { settle } from './swipe';

describe('settle', () => {
	const width = 400;

	it('медленный жест доезжает до соседа только после трети ширины', () => {
		expect(settle(100, 0, width)).toBe(0);
		expect(settle(200, 0, width)).toBe(-1);
		expect(settle(-200, 0, width)).toBe(1);
	});

	it('бросок решает сам: по ходу открывает соседа, против хода возвращает', () => {
		expect(settle(30, 0.8, width)).toBe(-1);
		expect(settle(-30, -0.8, width)).toBe(1);
		expect(settle(300, -0.8, width)).toBe(0);
	});

	it('без сдвига остаётся на месте', () => {
		expect(settle(0, 2, width)).toBe(0);
	});
});
