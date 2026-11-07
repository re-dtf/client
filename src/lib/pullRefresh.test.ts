import { describe, expect, it } from 'vitest';
import { THRESHOLD, resist, unresist } from './pullRefresh';

describe('resist', () => {
	it('порог достижим обычным ходом пальца, а дальше страница тянется всё туже', () => {
		expect(resist(-50)).toBe(0);
		const reach = [...Array(400).keys()].find((d) => resist(d) >= THRESHOLD)!;
		expect(reach).toBeGreaterThan(100);
		expect(reach).toBeLessThan(180);
		expect(resist(400) - resist(300)).toBeLessThan(resist(100) - resist(0));
		expect(resist(10_000)).toBeLessThan(260);
	});

	it('подхват посреди доезда ставит палец туда, где страница сейчас', () => {
		for (const y of [0, 20, 56, 120]) expect(resist(unresist(y))).toBeCloseTo(y);
	});
});
