import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Comment } from '$lib/api/types';

const { getComments } = vi.hoisted(() => ({ getComments: vi.fn() }));

vi.mock('$lib/api/index.svelte', () => ({ api: { getComments } }));
vi.mock('$lib/commentsCache', () => ({
	cacheComments: vi.fn(),
	peekComments: vi.fn(() => null)
}));

import { CommentsLogic } from './commentsLogic.svelte';

const makeComment = (id: number, overrides: Partial<Comment> = {}): Comment => ({
	id,
	sourceId: 'dtf',
	postId: 100,
	author: { id: id * 10, name: `User ${id}` },
	content: `text ${id}`,
	createdAt: '2026-01-01T00:00:00.000Z',
	...overrides
});

describe('CommentsLogic ($state.raw)', () => {
	let logic: CommentsLogic;

	beforeEach(async () => {
		getComments.mockReset().mockResolvedValue({
			items: [makeComment(1), makeComment(2, { replyTo: 1 })],
			cursors: undefined
		});
		logic = new CommentsLogic(() => 100);
		await logic.loadComments();
	});

	it('patchComment меняет ссылку на дерево, карту и целевой узел', () => {
		const prevRoots = logic.comments;
		const prevNode = logic.comments[0].children[0];

		logic.patchComment('dtf_2', { isFavorited: true });

		expect(logic.comments).not.toBe(prevRoots);
		const nextNode = logic.comments[0].children[0];
		expect(nextNode).not.toBe(prevNode);
		expect(nextNode.isFavorited).toBe(true);
		expect(logic.allCommentsMap.get('dtf_2')).toBe(nextNode);
	});

	it('addComment добавляет корень и ответ с обновлением родителя', () => {
		const prevParent = logic.comments[0];

		logic.addComment(makeComment(3));
		expect(logic.comments).toHaveLength(2);
		expect(logic.allCommentsMap.has('dtf_3')).toBe(true);

		logic.addComment(makeComment(4, { replyTo: 1 }));
		const nextParent = logic.comments[0];
		expect(nextParent).not.toBe(prevParent);
		expect(nextParent.children.map((c) => c.id)).toEqual([2, 4]);
		expect(nextParent._totalReplies).toBe(2);
	});

	it('updateComment обновляет flatComments и пересоздаёт узел в дереве', () => {
		const prevNode = logic.comments[0];
		logic.updateComment(makeComment(1, { content: 'edited' }));

		expect(logic.flatComments.find((c) => c.id === 1)?.content).toBe('edited');
		expect(logic.comments[0]).not.toBe(prevNode);
		expect(logic.comments[0].content).toBe('edited');
	});
});
