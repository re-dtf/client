import { describe, it, expect, beforeEach } from 'vitest';
import { cacheComments, peekComments, clearCommentsCache } from './commentsCache';
import type { Comment } from '$lib/api/types';

function makeComment(id: number, text: string): Comment {
	return {
		id,
		sourceId: 'dtf',
		postId: 100,
		author: { id: 1, name: 'User' },
		content: text,
		createdAt: new Date().toISOString()
	};
}

describe('commentsCache', () => {
	beforeEach(() => {
		clearCommentsCache();
	});

	it('сохраняет и возвращает комментарии поста', () => {
		const comments = [makeComment(1, 'Hello'), makeComment(2, 'World')];
		cacheComments(100, 'dtf', 'hotness', { flatComments: comments, hasMore: false });

		const cached = peekComments(100, 'dtf', 'hotness');
		expect(cached).toBeDefined();
		expect(cached?.flatComments).toHaveLength(2);
		expect(cached?.flatComments[0].content).toBe('Hello');
	});

	it('возвращает undefined для отсутствующей записи', () => {
		expect(peekComments(999, 'dtf', 'hotness')).toBeUndefined();
	});

	it('разделяет кэш по типу сортировки', () => {
		cacheComments(100, 'dtf', 'hotness', { flatComments: [makeComment(1, 'Best')], hasMore: false });
		cacheComments(100, 'dtf', 'date', { flatComments: [makeComment(2, 'Latest')], hasMore: false });
		cacheComments(100, 'dtf', 'worst', { flatComments: [makeComment(3, 'Worst')], hasMore: false });

		expect(peekComments(100, 'dtf', 'hotness')?.flatComments[0].content).toBe('Best');
		expect(peekComments(100, 'dtf', 'date')?.flatComments[0].content).toBe('Latest');
		expect(peekComments(100, 'dtf', 'worst')?.flatComments[0].content).toBe('Worst');
	});

	it('вытесняет старые записи при переполнении лимита', () => {
		for (let i = 1; i <= 25; i++) {
			cacheComments(i, 'dtf', 'hotness', { flatComments: [makeComment(i, `Comment ${i}`)], hasMore: false });
		}

		// Первые 5 должны быть вытеснены (лимит 20)
		expect(peekComments(1, 'dtf', 'hotness')).toBeUndefined();
		expect(peekComments(5, 'dtf', 'hotness')).toBeUndefined();
		expect(peekComments(6, 'dtf', 'hotness')).toBeDefined();
		expect(peekComments(25, 'dtf', 'hotness')).toBeDefined();
	});
});
