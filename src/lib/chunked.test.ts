import { afterEach, describe, expect, it, vi } from 'vitest';
import { chunked } from './chunked';

describe('chunked', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('показывает порциями по кадрам, а stop() не оставляет ожидающих висеть', async () => {
		const frames = new Map<number, () => void>();
		let nextId = 1;
		vi.stubGlobal('requestAnimationFrame', (cb: () => void) => (frames.set(nextId, cb), nextId++));
		vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
		const tick = () => {
			const [id, cb] = [...frames][0];
			frames.delete(id);
			cb();
		};

		let count = 0;
		let all = 12;
		const list = chunked(() => all, () => count, (n) => (count = n), 5);

		const first = list.run();
		expect(count).toBe(5);
		expect(list.pending).toBe(first);

		tick();
		expect(count).toBe(10);
		tick();
		expect(count).toBe(12);
		expect(await first).toBe(true);
		expect(list.pending).toBeUndefined();

		// Прерванный показ отвечает false, а следующий запуск работает как обычно
		count = 0;
		all = 20;
		const aborted = list.run();
		list.stop();
		expect(await aborted).toBe(false);
		expect(frames.size).toBe(0);
		const again = list.run();
		tick();
		tick();
		expect(count).toBe(20);
		expect(await again).toBe(true);
	});
});
