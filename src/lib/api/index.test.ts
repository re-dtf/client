import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Comment, Post } from './types';
import type { SourceState } from './sources/types';

const mocks = vi.hoisted(() => ({
	dtf: { getPosts: vi.fn(), getPost: vi.fn(), getComments: vi.fn(), reactToComment: vi.fn(), addComment: vi.fn() },
	sourceProvider: { getPosts: vi.fn(), getPost: vi.fn(), getComments: vi.fn(), getReplacedComments: undefined as any, reactToComment: undefined as any },
	registry: { activeSources: [] as any[] }
}));

vi.mock('./providers/dtf', () => ({ dtfApiProvider: mocks.dtf }));
vi.mock('./providers/source', () => ({ createSourceProvider: () => mocks.sourceProvider }));
vi.mock('./sources/registry.svelte', () => ({ sourceRegistry: mocks.registry }));
vi.mock('$lib/storage/auth.svelte', () => ({ authStorage: {} }));

import { api } from './index.svelte';
import { reactionSettings } from '$lib/storage/reactions.svelte';
import { settings } from '$lib/storage/settings.svelte';
import { clearPostCache } from '$lib/postCache';
import { clearPostSourceCache } from './sources/post-cache';

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
		clearPostCache();
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

describe('ранжирование по реакциям', () => {
	const reacted = <T extends object>(item: T, counters: { id: number; count: number }[]) => ({ ...item, reactions: { counters, reactionId: 0 } });
	// 1 ❤️ плюсовая, 25 🤡 минусовая
	beforeEach(() => {
		vi.clearAllMocks();
		clearPostCache();
		mocks.registry.activeSources = [];
		reactionSettings.value = { rules: {}, like: 1, dislike: 23, favorites: [], rank: true };
	});

	it('популярное: задизлайканный пост уходит вниз, свежее не трогается', async () => {
		const posts = [reacted(post(1, 'dtf', '2024-01-01T00:00:00.000Z'), [{ id: 25, count: 9 }]), reacted(post(2, 'dtf', '2024-01-02T00:00:00.000Z'), [{ id: 1, count: 1 }])];
		mocks.dtf.getPosts.mockResolvedValue({ items: posts });

		expect((await api.getPosts({ pageName: 'popular', sorting: 'week' })).items.map((p) => p.id)).toEqual([2, 1]);
		expect((await api.getPosts({ pageName: 'new', sorting: 'all' })).items.map((p) => p.id)).toEqual([1, 2]);
	});

	it('комментарии «Лучшие» ранжируются, «Худшие» инвертируют порядок, «Последние» нет, с выключенной настройкой порядок сервера', async () => {
		const comments = [reacted(comment(1, 'dtf'), [{ id: 25, count: 4 }]), reacted(comment(2, 'dtf'), [{ id: 1, count: 2 }])];
		mocks.dtf.getComments.mockResolvedValue({ items: comments });
		const ids = async (sorting: string) => (await api.getComments(1, 'dtf', undefined, sorting)).items.map((c) => c.id);

		expect(await ids('hotness')).toEqual([2, 1]);
		expect(await ids('worst')).toEqual([1, 2]);
		expect(await ids('date')).toEqual([1, 2]);

		reactionSettings.patch({ rank: false });
		expect(await ids('hotness')).toEqual([1, 2]);
		expect(await ids('worst')).toEqual([1, 2]);
	});
});

describe('api.getPost и реакции', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearPostCache();
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

	it('посты из getPosts попадают в кэш и открываются через getPost без сети', async () => {
		const cachedPost = post(10, 'dtf', '2024-01-01T00:00:00.000Z');
		mocks.dtf.getPosts.mockResolvedValue({ items: [cachedPost] });

		await api.getPosts();

		expect(api.peekPost(10)).toEqual(cachedPost);

		const result = await api.getPost(10);
		expect(result).toEqual(cachedPost);
		expect(mocks.dtf.getPost).not.toHaveBeenCalled();
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
		clearPostCache();
		clearPostSourceCache();
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

	it('для restore-источника без пагинации (paged: false) вызывает его один раз и восстанавливает на всех страницах', async () => {
		const unpagedSource = source('archive', ['mutate:comments:restore'], ['getComments']);
		unpagedSource.manifest.endpoints.getComments = { paged: false } as any;
		mocks.registry.activeSources = [unpagedSource];

		const removed = (id: number) => ({ ...comment(id, 'dtf'), isRemoved: true });
		mocks.sourceProvider.getComments.mockResolvedValueOnce({
			items: [{ id: 1, content: 'Первый' }, { id: 3, content: 'Третий' }]
		});

		mocks.dtf.getComments.mockResolvedValueOnce({ items: [removed(1)], lastId: 1, lastSortingValue: 1 });
		const page1 = await api.getComments(1, 'dtf');
		expect(page1.items[0].restored?.content).toBe('Первый');
		// Курсор для archive не должен устанавливаться
		expect(page1.cursors).toEqual({ dtf: { lastId: 1, lastSortingValue: 1 } });

		// Страница 2: у archive курсора нет, ответ берётся из кэша
		mocks.dtf.getComments.mockResolvedValueOnce({ items: [removed(3)], lastId: 3, lastSortingValue: 3 });
		const page2 = await api.getComments(1, 'dtf', page1.cursors);

		expect(mocks.sourceProvider.getComments).toHaveBeenCalledTimes(1);
		expect(page2.items[0].restored?.content).toBe('Третий');
	});

	it('не ждёт основной источник, чтобы запросить append-источник', async () => {
		mocks.registry.activeSources = [source('archive', ['mutate:comments:append'], ['getComments'])];
		let resolveDtf!: (v: unknown) => void;
		mocks.dtf.getComments.mockReturnValue(new Promise((r) => (resolveDtf = r)));
		mocks.sourceProvider.getComments.mockResolvedValue({ items: [comment(2, 'archive')] });

		const pending = api.getComments(1, 'dtf');
		await Promise.resolve();
		expect(mocks.sourceProvider.getComments).toHaveBeenCalledTimes(1);

		resolveDtf({ items: [comment(1, 'dtf')] });
		expect((await pending).items).toHaveLength(2);
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

	it('ленивый запуск restore: не делает сетевых запросов к архиву, если нет удаленных комментариев', async () => {
		mocks.registry.activeSources = [source('archive', ['mutate:comments:restore'], ['getComments'])];
		// На DTF нет удаленных комментариев
		mocks.dtf.getComments.mockResolvedValue({ items: [comment(1, 'dtf')] });

		const res = await api.getComments(1, 'dtf');

		expect(res.items).toHaveLength(1);
		expect(mocks.sourceProvider.getComments).not.toHaveBeenCalled();
	});

	it('ленивый запуск restore: вызывает архив, если на DTF есть удаленный комментарий', async () => {
		mocks.registry.activeSources = [source('archive', ['mutate:comments:restore'], ['getComments'])];
		const removedComment = comment(2, 'dtf');
		removedComment.isRemoved = true;
		removedComment.removedByModerator = true;
		removedComment.author = { id: 20, name: 'Author' };

		mocks.dtf.getComments.mockResolvedValue({ items: [comment(1, 'dtf'), removedComment] });
		mocks.sourceProvider.getComments.mockResolvedValue({
			items: [{ id: 2, authorId: 20, content: 'Restored text' }]
		});

		const res = await api.getComments(1, 'dtf');

		expect(mocks.sourceProvider.getComments).toHaveBeenCalledTimes(1);
		expect(res.items[1].isRemoved).toBe(true);
		expect(res.items[1].restored?.content).toBe('Restored text');
	});
});

describe('api.addComment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settings.patch({ autoUpvoteComments: false });
	});

	it('без autoUpvoteComments отправляет комментарий и не ставит реакцию', async () => {
		const created = comment(123, 'dtf');
		mocks.dtf.addComment.mockResolvedValue(created);

		const result = await api.addComment(1, 'Привет');

		expect(mocks.dtf.addComment).toHaveBeenCalledWith(1, 'Привет');
		expect(mocks.dtf.reactToComment).not.toHaveBeenCalled();
		expect(result).toBe(created);
		expect(result.reactions).toBeUndefined();
	});

	it('при включенном autoUpvoteComments ставит плюс своему комментарию (как на Reddit)', async () => {
		settings.patch({ autoUpvoteComments: true });
		const created = { ...comment(123, 'dtf'), reactions: { counters: [], reactionId: 0 }, likes: { count: 0, myVote: 0 } };
		mocks.dtf.addComment.mockResolvedValue(created);
		mocks.dtf.reactToComment.mockResolvedValue(undefined);

		const result = await api.addComment(1, 'Привет');

		expect(mocks.dtf.addComment).toHaveBeenCalledWith(1, 'Привет');
		expect(mocks.dtf.reactToComment).toHaveBeenCalledWith(123, 1);
		expect(result.reactions?.reactionId).toBe(1);
		expect(result.reactions?.counters).toEqual([{ id: 1, count: 1 }]);
		expect(result.likes).toEqual({ count: 1, myVote: 1 });
	});

	it('ошибка запроса реакции не ломает публикацию комментария', async () => {
		settings.patch({ autoUpvoteComments: true });
		const created = { ...comment(123, 'dtf'), reactions: { counters: [], reactionId: 0 } };
		mocks.dtf.addComment.mockResolvedValue(created);
		mocks.dtf.reactToComment.mockRejectedValue(new Error('Сеть упала'));

		const result = await api.addComment(1, 'Привет');

		expect(mocks.dtf.addComment).toHaveBeenCalledWith(1, 'Привет');
		expect(result.id).toBe(123);
	});
});
