import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPosts = vi.fn();
vi.mock('$lib/api/index.svelte', () => ({ api: { getPosts } }));
vi.mock('$lib/storage/auth.svelte', () => ({ authStorage: { isAuthenticated: false } }));

const { loadFeed, peekFeed } = await import('./feedCache');

describe('feedCache', () => {
	beforeEach(() => getPosts.mockReset());

	it('делит один запрос между вызовами и отдаёт свежую страницу без нового', async () => {
		getPosts.mockResolvedValue({ items: [] });

		const [a, b] = await Promise.all([loadFeed('new'), loadFeed('new')]);
		expect(a).toBe(b);
		expect(getPosts).toHaveBeenCalledTimes(1);

		expect(peekFeed('new')).toBe(a);
		await loadFeed('new');
		expect(getPosts).toHaveBeenCalledTimes(1);

		await loadFeed('new', 'now', true);
		expect(getPosts).toHaveBeenCalledTimes(2);
	});
});
