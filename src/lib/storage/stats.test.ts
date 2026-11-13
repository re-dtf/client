import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Post } from '$lib/api/types';

vi.hoisted(() => {
	const data: Record<string, string> = {};
	Object.defineProperty(globalThis, 'localStorage', {
		value: {
			getItem: (key: string) => data[key] ?? null,
			setItem: (key: string, value: string) => {
				data[key] = String(value);
			},
			removeItem: (key: string) => {
				delete data[key];
			},
			clear: () => {
				for (const key in data) delete data[key];
			}
		},
		writable: true
	});
});

import {
	READ_AFTER, addReaction, addRead, addTick, dayStreaks, emptyStats, flush, markCommentsStart, statsStore, tick, trackPostClosed, trackPostLoaded, withComments
} from './stats.svelte';

const post = (id: number): Post => ({
	id,
	sourceId: 'dtf',
	title: 't',
	blocks: [],
	author: { id: 7, name: 'Автор' },
	subsite: { id: 3, name: 'Игры' },
	commentsCount: 0,
	createdAt: ''
});

describe('stats', () => {
	beforeEach(() => statsStore.reset());

	it('считает время по дням, часам, разделам и темам', () => {
		const stats = addTick(addTick(emptyStats(), { day: '2026-11-02', hour: 23, area: 'post', theme: 'dtf2022' }), { day: '2026-11-03', hour: 0, area: 'feed', theme: 'dtf2022' });

		expect(stats.seconds).toBe(2);
		expect(stats.days).toEqual({ '2026-11-02': 1, '2026-11-03': 1 });
		expect([stats.hours[0], stats.hours[23]]).toEqual([1, 1]);
		expect(stats.byArea).toMatchObject({ post: 1, feed: 1 });
		expect(stats.byTheme).toEqual({ dtf2022: 2 });
	});

	it('серии дней: текущая живёт, если заходили вчера, самая длинная запоминается', () => {
		const days = { '2026-10-28': 5, '2026-10-29': 5, '2026-10-30': 5, '2026-11-01': 5, '2026-11-02': 5 };

		expect(dayStreaks(days, new Date(2026, 10, 2))).toEqual({ current: 2, longest: 3 });
		expect(dayStreaks(days, new Date(2026, 10, 3))).toEqual({ current: 2, longest: 3 });
		expect(dayStreaks(days, new Date(2026, 10, 5))).toEqual({ current: 0, longest: 3 });
	});

	it('прочитанные посты попадают в авторов, подсайты и список недавних', () => {
		const stats = addRead(addRead(emptyStats(), post(1)), post(2));

		expect(stats).toMatchObject({ postsRead: 2, recentPosts: ['dtf_1', 'dtf_2'] });
		expect(stats.authorsRead['dtf_7']).toMatchObject({ name: 'Автор', count: 2 });
		expect(stats.subsitesRead['dtf_3'].count).toBe(2);
	});

	it('реакции считает по типам и авторам, снятие (0) не считает', () => {
		let stats = addReaction(emptyStats(), 'post', 1, { id: 7, name: 'Автор' });
		stats = addReaction(stats, 'comment', 23);
		stats = addReaction(stats, 'post', 0, { id: 7, name: 'Автор' });

		expect(stats.reactions).toEqual({ post: { 1: 1 }, comment: { 23: 1 } });
		expect(stats.authorsReacted['dtf_7'].count).toBe(1);
	});

	it('пост засчитывается после READ_AFTER секунд на нём и только один раз', () => {
		trackPostLoaded(post(10));
		const context = { area: 'post' as const, theme: 'dtf2022', post: 'dtf_10' };

		for (let i = 0; i < READ_AFTER - 1; i++) tick(context);
		expect(statsStore.value.postsRead).toBe(0);

		tick(context);
		tick(context);
		expect(statsStore.value.postsRead).toBe(1);
		expect(statsStore.value.recentPosts).toEqual(['dtf_10']);

		// Страницу перезагрузили: в памяти поста нет, но хранилище помнит, что он прочитан
		trackPostClosed({ id: 10, sourceId: 'dtf' });
		trackPostLoaded(post(10));
		for (let i = 0; i < READ_AFTER + 1; i++) tick(context);
		expect(statsStore.value.postsRead).toBe(1);

		flush();
		expect(statsStore.value.seconds).toBe(READ_AFTER * 2 + 2);
	});

	it('markCommentsStart переключает область на comments через IntersectionObserver без getBoundingClientRect', () => {
		let callback: ((entries: Array<{ isIntersecting: boolean }>) => void) | undefined;
		let disconnected = false;
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
					callback = cb;
				}
				observe() {}
				disconnect() {
					disconnected = true;
				}
			}
		);
		try {
			const ctx = { area: 'post' as const, theme: 'dtf2022', post: 'dtf_42' };
			const cleanup = markCommentsStart({ id: 42, sourceId: 'dtf' }, {} as HTMLElement);
			expect(withComments(ctx).area).toBe('post');

			callback?.([{ isIntersecting: true }]);
			expect(withComments(ctx).area).toBe('comments');

			callback?.([{ isIntersecting: false }]);
			expect(withComments(ctx).area).toBe('post');

			callback?.([{ isIntersecting: true }]);
			cleanup();
			expect(disconnected).toBe(true);
			expect(withComments(ctx).area).toBe('post');
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
