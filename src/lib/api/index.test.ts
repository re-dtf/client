import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Comment, Post } from './types';
import type { SourceState } from './sources/types';

const mocks = vi.hoisted(() => ({
	dtf: { getPosts: vi.fn(), getPost: vi.fn(), getComments: vi.fn(), reactToComment: vi.fn() },
	sourceProvider: { getPosts: vi.fn(), getPost: vi.fn(), getComments: vi.fn(), getReplacedComments: undefined as any, reactToComment: undefined as any },
	registry: { activeSources: [] as any[] }
}));

vi.mock('./providers/dtf', () => ({ dtfApiProvider: mocks.dtf }));
vi.mock('./providers/source', () => ({ createSourceProvider: () => mocks.sourceProvider }));
vi.mock('./sources/registry.svelte', () => ({ sourceRegistry: mocks.registry }));
vi.mock('$lib/storage/auth.svelte', () => ({ authStorage: {} }));

import { api } from './index.svelte';

const post = (id: number, sourceId: string, createdAt: string): Post =>
	({ id, sourceId, title: `Пост ${id}`, blocks: [], author: { id: 1, name: 'a' }, commentsCount: 0, createdAt }) as Post;

const comment = (id: number, sourceId: string): Comment =>
	({ id, sourceId, postId: 1, author: { id: 1, name: 'a' }, content: 'x', createdAt: '2024-01-01T00:00:00.000Z' }) as Comment;

const source = (id: string, permissions: string[] = [], endpoints: string[] = ['getPosts']): SourceState =>
	({
		manifest: {
			id,
			endpoints: Object.fromEntries(endpoints.map((e) => [e, {}])),
			permissions: permissions.map((p) => ({ id: p, target: p.startsWith('mutate') ? 'dtf' : undefined }))
		},
		enabled: true,
		grantedPermissions: permissions.map((p) => (p.startsWith('mutate') ? `${p}:dtf` : p))
	}) as unknown as SourceState;

describe('api.getPosts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.registry.activeSources = [];
	});

	it('без дополнительных источников отдаёт посты DTF с курсором', async () => {
		mocks.dtf.getPosts.mockResolvedValue({ items: [post(1, 'dtf', '2024-01-02T00:00:00.000Z')], lastId: 1, lastSortingValue: 10 });

		const result = await api.getPosts({ pageName: 'popular', sorting: 'date' });

		expect(result.items.map((p) => p.id)).toEqual([1]);
		expect(result.cursors).toEqual({ dtf: { lastId: 1, lastSortingValue: 10 } });
	});

	it('сливает DTF и дополнительный источник, свежие посты первыми', async () => {
		mocks.registry.activeSources = [source('extra')];
		mocks.dtf.getPosts.mockResolvedValue({ items: [post(1, 'dtf', '2024-01-01T00:00:00.000Z')] });
		mocks.sourceProvider.getPosts.mockResolvedValue({ items: [post(2, 'extra', '2024-01-03T00:00:00.000Z')] });

		const result = await api.getPosts({ sorting: 'date' });

		expect(result.items.map((p) => `${p.sourceId}:${p.id}`)).toEqual(['extra:2', 'dtf:1']);
	});

	it('упавший дополнительный источник не ломает ленту и попадает в консоль', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mocks.registry.activeSources = [source('broken')];
		mocks.dtf.getPosts.mockResolvedValue({ items: [post(1, 'dtf', '2024-01-01T00:00:00.000Z')] });
		mocks.sourceProvider.getPosts.mockRejectedValue(new Error('таймаут'));

		const result = await api.getPosts();

		expect(result.items).toHaveLength(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("'broken'"), expect.any(Error));
		warn.mockRestore();
	});

	it('источники без эндпоинта getPosts не опрашиваются', async () => {
		mocks.registry.activeSources = [source('comments-only', [], ['getComments'])];
		mocks.dtf.getPosts.mockResolvedValue({ items: [] });

		await api.getPosts();

		expect(mocks.sourceProvider.getPosts).not.toHaveBeenCalled();
	});

	it('на следующей странице DTF без курсора не опрашивается', async () => {
		mocks.registry.activeSources = [source('extra')];
		mocks.sourceProvider.getPosts.mockResolvedValue({ items: [] });

		await api.getPosts({ cursors: { extra: { lastId: 1, lastSortingValue: 1 } } });

		expect(mocks.dtf.getPosts).not.toHaveBeenCalled();
		expect(mocks.sourceProvider.getPosts).toHaveBeenCalledWith(expect.objectContaining({ cursor: { lastId: 1, lastSortingValue: 1 } }));
	});
});

describe('api.getPost и реакции', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.registry.activeSources = [];
		mocks.sourceProvider.reactToComment = undefined;
	});

	it('пост берётся у провайдера нужного источника', async () => {
		mocks.registry.activeSources = [source('extra')];
		mocks.sourceProvider.getPost.mockResolvedValue(post(5, 'extra', '2024-01-01T00:00:00.000Z'));

		await api.getPost(5, 'extra');
		await api.getPost(6);

		expect(mocks.sourceProvider.getPost).toHaveBeenCalledWith(5);
		expect(mocks.dtf.getPost).toHaveBeenCalledWith(6);
	});

	it('неизвестный или выключенный источник — понятная ошибка', () => {
		expect(() => api.getPost(1, 'ghost')).toThrow(/ghost/);
	});

	it('реакция в источнике без разрешения write:reactions запрещена', async () => {
		mocks.registry.activeSources = [source('extra', [], ['reactToComment'])];
		mocks.sourceProvider.reactToComment = vi.fn();

		await expect(api.reactToComment(1, 2, 'extra')).rejects.toThrow(/разрешения/);
		expect(mocks.sourceProvider.reactToComment).not.toHaveBeenCalled();
	});

	it('с разрешением реакция уходит в источник', async () => {
		mocks.registry.activeSources = [source('extra', ['write:reactions'], ['reactToComment'])];
		mocks.sourceProvider.reactToComment = vi.fn().mockResolvedValue(undefined);

		await api.reactToComment(1, 2, 'extra');

		expect(mocks.sourceProvider.reactToComment).toHaveBeenCalledWith(1, 2);
	});

	it('реакция у DTF идёт напрямую', async () => {
		mocks.dtf.reactToComment.mockResolvedValue(undefined);

		await api.reactToComment(1, 2);

		expect(mocks.dtf.reactToComment).toHaveBeenCalledWith(1, 2);
	});
});

describe('api.getComments', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.registry.activeSources = [];
		mocks.sourceProvider.getReplacedComments = undefined;
	});

	it('дополняет комментарии DTF комментариями источника с разрешением append', async () => {
		mocks.registry.activeSources = [source('archive', ['mutate:comments:append'], ['getComments'])];
		mocks.dtf.getComments.mockResolvedValue({ items: [comment(1, 'dtf')], lastId: 1, lastSortingValue: 1 });
		mocks.sourceProvider.getComments.mockResolvedValue({ items: [comment(2, 'archive')], lastId: 2, lastSortingValue: 2 });

		const result = await api.getComments(1, 'dtf');

		expect(result.items.map((c) => `${c.sourceId}:${c.id}`).sort()).toEqual(['archive:2', 'dtf:1']);
		expect(result.cursors).toEqual({
			dtf: { lastId: 1, lastSortingValue: 1 },
			archive: { lastId: 2, lastSortingValue: 2 }
		});
	});

	it('источник без разрешения комментарии не добавляет', async () => {
		mocks.registry.activeSources = [source('nope', [], ['getComments'])];
		mocks.dtf.getComments.mockResolvedValue({ items: [comment(1, 'dtf')] });

		const result = await api.getComments(1, 'dtf');

		expect(result.items).toHaveLength(1);
		expect(mocks.sourceProvider.getComments).not.toHaveBeenCalled();
	});

	it('с разрешением replace берёт getReplacedComments', async () => {
		mocks.registry.activeSources = [source('fixer', ['mutate:comments:replace'], ['getComments', 'getReplacedComments'])];
		mocks.sourceProvider.getReplacedComments = vi.fn().mockResolvedValue({ items: [] });
		mocks.dtf.getComments.mockResolvedValue({ items: [comment(1, 'dtf')] });

		await api.getComments(1, 'dtf');

		expect(mocks.sourceProvider.getReplacedComments).toHaveBeenCalled();
		expect(mocks.sourceProvider.getComments).not.toHaveBeenCalled();
	});
});
