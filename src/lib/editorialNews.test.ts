import { afterEach, expect, it, vi } from 'vitest';
import type { PaginatedResult, Post } from '$lib/api/types';

const { getEditorialNews } = vi.hoisted(() => ({ getEditorialNews: vi.fn() }));
vi.mock('$lib/api/index.svelte', () => ({ api: { getEditorialNews } }));

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
	getEditorialNews.mockReset();
});

it('ждёт общий запрос новостей, сохраняет порции и обновляет устаревшее', async () => {
	const { editorialNews } = await import('./editorialNews.svelte');
	const first = { id: 1 } as Post;
	const next = { id: 2 } as Post;
	let finish!: (page: PaginatedResult<Post>) => void;
	getEditorialNews.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));

	const pending = editorialNews.loadInitial();
	expect(editorialNews.loadInitial()).toBe(pending);
	expect(editorialNews.loading).toBe(true);
	expect(editorialNews.ready).toBe(false);
	finish({ items: [first], lastId: 10 });
	await pending;
	expect(editorialNews.ready).toBe(true);
	expect(editorialNews.loading).toBe(false);
	await editorialNews.loadInitial();
	expect(getEditorialNews).toHaveBeenCalledTimes(1);

	getEditorialNews.mockResolvedValueOnce({ items: [next], lastId: 20 });
	await editorialNews.loadMore();
	expect(getEditorialNews).toHaveBeenLastCalledWith(10);
	expect(editorialNews.items).toEqual([first, next]);
	await editorialNews.loadInitial();
	expect(editorialNews.items).toEqual([first, next]);

	vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5 * 60_000);
	getEditorialNews.mockResolvedValueOnce({ items: [] });
	await editorialNews.loadInitial();
	expect(getEditorialNews).toHaveBeenLastCalledWith(0);
	expect(editorialNews.items).toEqual([]);
	expect(editorialNews.hasMore).toBe(false);
});

it('ошибка новостей завершает ожидание ленты и позволяет повторить запрос, сохраняя показанное', async () => {
	const { editorialNews } = await import('./editorialNews.svelte');
	vi.spyOn(console, 'error').mockImplementation(() => {});
	getEditorialNews.mockRejectedValueOnce(new Error('Нет сети'));
	await expect(editorialNews.loadInitial()).resolves.toBeUndefined();
	expect(editorialNews.loading).toBe(false);
	expect(editorialNews.ready).toBe(true);
	expect(editorialNews.items).toEqual([]);

	const first = { id: 1 } as Post;
	getEditorialNews.mockResolvedValueOnce({ items: [first], lastId: 10 });
	await editorialNews.loadInitial();
	expect(editorialNews.items).toEqual([first]);

	getEditorialNews.mockRejectedValueOnce(new Error('Нет сети'));
	await expect(editorialNews.loadInitial(true)).resolves.toBeUndefined();
	expect(editorialNews.items).toEqual([first]);
	expect(editorialNews.loading).toBe(false);
});

it('принудительное обновление во время подгрузки порции перезапрашивает начало и сбрасывает lastId', async () => {
	const { editorialNews } = await import('./editorialNews.svelte');
	const initial = { id: 1 } as Post;
	getEditorialNews.mockResolvedValueOnce({ items: [initial], lastId: 10 });
	await editorialNews.loadInitial();

	let finishMore!: (page: PaginatedResult<Post>) => void;
	getEditorialNews.mockReturnValueOnce(new Promise((resolve) => { finishMore = resolve; }));
	const morePromise = editorialNews.loadMore();

	const fresh = { id: 2 } as Post;
	getEditorialNews.mockResolvedValueOnce({ items: [fresh] });
	const refreshPromise = editorialNews.loadInitial(true);

	finishMore({ items: [{ id: 99 } as Post], lastId: 20 });
	await Promise.all([morePromise, refreshPromise]);

	expect(editorialNews.items).toEqual([fresh]);

	getEditorialNews.mockResolvedValueOnce({ items: [] });
	await editorialNews.loadMore();
	expect(getEditorialNews).toHaveBeenLastCalledWith(0);
});
