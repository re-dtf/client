import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cachePost, cachePosts, clearPostCache, isPostFresh, loadPost, peekPost } from './postCache';
import type { Post } from '$lib/api/types';

const makePost = (id: number, sourceId = 'dtf', title = `Post ${id}`): Post =>
	({
		id,
		sourceId,
		title,
		blocks: [{ type: 'text', data: { text: 'content' } }],
		author: { id: 1, name: 'Author' },
		commentsCount: 0,
		createdAt: '2024-01-01T00:00:00.000Z'
	}) as Post;

describe('postCache', () => {
	beforeEach(() => {
		clearPostCache();
		vi.useRealTimers();
	});

	it('peekPost возвращает undefined для отсутствующего поста', () => {
		expect(peekPost(123)).toBeUndefined();
	});

	it('cachePost сохраняет пост и peekPost его возвращает', () => {
		const post = makePost(42);
		cachePost(post);
		expect(peekPost(42)).toBe(post);
		expect(peekPost(42, 'dtf')).toBe(post);
		expect(peekPost(42, 'extra')).toBeUndefined();
	});

	it('cachePosts сохраняет список постов', () => {
		const p1 = makePost(1);
		const p2 = makePost(2);
		cachePosts([p1, p2]);
		expect(peekPost(1)).toBe(p1);
		expect(peekPost(2)).toBe(p2);
	});

	it('isPostFresh отслеживает возраст записи', () => {
		vi.useFakeTimers();
		const post = makePost(10);
		cachePost(post);

		expect(isPostFresh(10)).toBe(true);

		vi.advanceTimersByTime(30_000);
		expect(isPostFresh(10)).toBe(true);

		vi.advanceTimersByTime(31_000);
		expect(isPostFresh(10)).toBe(false);
	});

	it('loadPost возвращает свежий пост из кэша без вызова fetcher', async () => {
		const post = makePost(7);
		cachePost(post);
		const fetcher = vi.fn();

		const result = await loadPost(7, 'dtf', false, fetcher);
		expect(result).toBe(post);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('loadPost с force=true вызывает fetcher и обновляет кэш', async () => {
		const oldPost = makePost(7, 'dtf', 'Old');
		const newPost = makePost(7, 'dtf', 'New');
		cachePost(oldPost);

		const fetcher = vi.fn().mockResolvedValue(newPost);
		const result = await loadPost(7, 'dtf', true, fetcher);

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(result).toBe(newPost);
		expect(peekPost(7)).toBe(newPost);
	});

	it('loadPost объединяет параллельные вызовы к одному посту', async () => {
		const freshPost = makePost(99);
		let resolveFetcher!: (p: Post) => void;
		const fetcher = vi.fn().mockReturnValue(new Promise((r) => (resolveFetcher = r)));

		const p1 = loadPost(99, 'dtf', false, fetcher);
		const p2 = loadPost(99, 'dtf', false, fetcher);

		resolveFetcher(freshPost);
		const [r1, r2] = await Promise.all([p1, p2]);

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(r1).toBe(freshPost);
		expect(r2).toBe(freshPost);
	});

	it('при ошибке сети loadPost отдаёт устаревший пост из кэша', async () => {
		vi.useFakeTimers();
		const stalePost = makePost(50);
		cachePost(stalePost);
		vi.advanceTimersByTime(70_000); // устарел

		const fetcher = vi.fn().mockRejectedValue(new Error('Сеть упала'));
		const result = await loadPost(50, 'dtf', false, fetcher);

		expect(result).toBe(stalePost);
	});

	it('LRU вытесняет старые посты при превышении лимита (100)', () => {
		for (let i = 1; i <= 105; i++) {
			cachePost(makePost(i));
		}
		// Первые 5 должны быть вытеснены
		for (let i = 1; i <= 5; i++) {
			expect(peekPost(i)).toBeUndefined();
		}
		// 6..105 на месте
		for (let i = 6; i <= 105; i++) {
			expect(peekPost(i)).toBeDefined();
		}
	});
});
