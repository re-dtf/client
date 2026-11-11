import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrFetchPostSourceData, clearPostSourceCache } from './post-cache';

describe('post-cache', () => {
	beforeEach(() => {
		clearPostSourceCache();
		vi.useRealTimers();
	});

	it('should call fetcher and return result on cache miss', async () => {
		const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });
		const result = await getOrFetchPostSourceData('src1', 123, 'getComments', fetcher);

		expect(result).toEqual({ items: [1, 2, 3] });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('should return cached value on subsequent calls without calling fetcher again', async () => {
		const fetcher = vi.fn().mockResolvedValue({ items: ['a', 'b'] });

		const res1 = await getOrFetchPostSourceData('src1', 123, 'getComments', fetcher);
		const res2 = await getOrFetchPostSourceData('src1', 123, 'getComments', fetcher);

		expect(res1).toEqual({ items: ['a', 'b'] });
		expect(res2).toEqual({ items: ['a', 'b'] });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('should coalesce concurrent in-flight requests into a single call', async () => {
		let resolveCall: (v: any) => void;
		const fetcher = vi.fn().mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveCall = resolve;
				})
		);

		const p1 = getOrFetchPostSourceData('src1', 123, 'getComments', fetcher);
		const p2 = getOrFetchPostSourceData('src1', 123, 'getComments', fetcher);

		resolveCall!({ success: true });

		const [r1, r2] = await Promise.all([p1, p2]);
		expect(r1).toEqual({ success: true });
		expect(r2).toEqual({ success: true });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('should cache errors for the duration of TTL to prevent hammering the server', async () => {
		const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

		await expect(getOrFetchPostSourceData('src1', 123, 'getComments', fetcher)).rejects.toThrow('Network error');
		// Second call within TTL should throw cached error without calling fetcher again
		await expect(getOrFetchPostSourceData('src1', 123, 'getComments', fetcher)).rejects.toThrow('Network error');

		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('should expire cache after TTL', async () => {
		vi.useFakeTimers();
		const fetcher = vi.fn().mockResolvedValue({ count: 1 });

		await getOrFetchPostSourceData('src1', 123, 'getComments', fetcher, 1000);
		expect(fetcher).toHaveBeenCalledTimes(1);

		// Advance 500ms - still cached
		vi.advanceTimersByTime(500);
		await getOrFetchPostSourceData('src1', 123, 'getComments', fetcher, 1000);
		expect(fetcher).toHaveBeenCalledTimes(1);

		// Advance 600ms (total 1100ms) - expired
		vi.advanceTimersByTime(600);
		fetcher.mockResolvedValueOnce({ count: 2 });
		const res = await getOrFetchPostSourceData('src1', 123, 'getComments', fetcher, 1000);
		expect(res).toEqual({ count: 2 });
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
