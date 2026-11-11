import { describe, it, expect } from 'vitest';
import { mergePosts, mergeComments } from './merger';
import type { Post, PaginatedResult, Comment, CommentPatch } from '../types';

describe('mergePosts', () => {
	it('should merge empty results correctly', () => {
		const result = mergePosts([]);
		expect(result.items).toEqual([]);
		expect(result.cursors).toEqual({});
	});

	it('should merge multiple sources and sort by createdAt descending', () => {
		const post1: Post = {
			id: 1, sourceId: 'src1', title: 'Old Post', blocks: [], commentsCount: 0,
			author: { id: 1, name: 'A' },
			createdAt: '2023-01-01T12:00:00Z'
		};
		const post2: Post = {
			id: 2, sourceId: 'src1', title: 'New Post', blocks: [], commentsCount: 0,
			author: { id: 1, name: 'A' },
			createdAt: '2023-01-03T12:00:00Z'
		};
		const post3: Post = {
			id: 1, sourceId: 'src2', title: 'Medium Post', blocks: [], commentsCount: 0,
			author: { id: 2, name: 'B' },
			createdAt: '2023-01-02T12:00:00Z'
		};

		const result1: PaginatedResult<Post> = {
			items: [post1, post2],
			lastId: 2,
			lastSortingValue: 100
		};

		const result2: PaginatedResult<Post> = {
			items: [post3],
			lastId: 1,
			lastSortingValue: 50
		};

		const merged = mergePosts([
			{ sourceId: 'src1', result: result1 },
			{ sourceId: 'src2', result: result2 }
		]);

		// Sorting should be: post2 (Jan 3), post3 (Jan 2), post1 (Jan 1)
		expect(merged.items).toHaveLength(3);
		expect(merged.items[0]).toEqual(post2);
		expect(merged.items[1]).toEqual(post3);
		expect(merged.items[2]).toEqual(post1);

		// Cursors should be merged
		expect(merged.cursors).toEqual({
			'src1': { lastId: 2, lastSortingValue: 100 },
			'src2': { lastId: 1, lastSortingValue: 50 }
		});
	});

	it('should ignore cursors if lastId or lastSortingValue is undefined', () => {
		const post1: Post = {
			id: 1, sourceId: 'src1', title: 'P1', blocks: [], commentsCount: 0,
			author: { id: 1, name: 'A' },
			createdAt: '2023-01-01T12:00:00Z'
		};
		const post2: Post = {
			id: 1, sourceId: 'src2', title: 'P2', blocks: [], commentsCount: 0,
			author: { id: 2, name: 'B' },
			createdAt: '2023-01-02T12:00:00Z'
		};

		const result1: PaginatedResult<Post> = {
			items: [post1] // no cursors
		};

		const result2: PaginatedResult<Post> = {
			items: [post2],
			lastId: 1,
			lastSortingValue: 50
		};

		const merged = mergePosts([
			{ sourceId: 'src1', result: result1 },
			{ sourceId: 'src2', result: result2 }
		]);

		expect(merged.items).toHaveLength(2);
		expect(merged.cursors).toEqual({
			'src2': { lastId: 1, lastSortingValue: 50 }
		});
		// src1 should not be in cursors
		expect(merged.cursors!['src1']).toBeUndefined();
	});

	it('should handle invalid dates safely by placing them at the end', () => {
		const postValid: Post = {
			id: 1, sourceId: 'src1', title: 'P1', blocks: [], commentsCount: 0,
			author: { id: 1, name: 'A' },
			createdAt: '2023-01-01T12:00:00Z'
		};
		const postInvalid: Post = {
			id: 2, sourceId: 'src1', title: 'P2', blocks: [], commentsCount: 0,
			author: { id: 2, name: 'B' },
			createdAt: 'invalid-date'
		};

		const merged = mergePosts([
			{ sourceId: 'src1', result: { items: [postInvalid, postValid] } }
		]);

		// postValid should be first because invalid date is treated as 0 (Jan 1 1970)
		expect(merged.items[0]).toEqual(postValid);
		expect(merged.items[1]).toEqual(postInvalid);
	});
});

describe('mergeComments', () => {
	const createComment = (id: number, overrides: Partial<Comment> = {}): Comment => ({
		id,
		sourceId: 'dtf',
		postId: 100,
		author: { id: 10, name: 'User 10' },
		content: `Comment ${id}`,
		createdAt: '2023-01-01T12:00:00Z',
		...overrides
	});

	it('mode restore: applies restored overlay ONLY to isRemoved comments and does NOT overwrite original fields', () => {
		const liveComment = createComment(1, { content: 'Live text' });
		const removedComment = createComment(2, {
			content: 'Комментарий удален модератором',
			isRemoved: true,
			removedByModerator: true,
			author: { id: 20, name: 'Author 20' }
		});

		const patch: CommentPatch = {
			id: 2,
			authorId: 20,
			content: 'Original archived text',
			media: [{ type: 'image', data: { uuid: 'img-1', width: 100, height: 100, size: 50, type: 'jpg' } }]
		};

		// Also try to restore the liveComment (should be ignored!)
		const patchLive: CommentPatch = {
			id: 1,
			authorId: 10,
			content: 'Attempted overwrite of live comment'
		};

		const merged = mergeComments([liveComment, removedComment], [
			{
				sourceId: 'archive',
				comments: [patch, patchLive],
				mode: 'restore'
			}
		]);

		// Live comment should NOT be altered
		expect(merged[0].content).toBe('Live text');
		expect(merged[0].restored).toBeUndefined();

		// Removed comment keeps isRemoved: true and content stub, but gains restored field
		expect(merged[1].isRemoved).toBe(true);
		expect(merged[1].content).toBe('Комментарий удален модератором');
		expect(merged[1].restored).toEqual({
			content: 'Original archived text',
			media: patch.media,
			sourceId: 'archive'
		});
	});

	it('mode restore: rejects restoration if authorId does not match comment author', () => {
		const removedComment = createComment(2, {
			isRemoved: true,
			author: { id: 20, name: 'Real Author' }
		});

		const maliciousPatch: CommentPatch = {
			id: 2,
			authorId: 999, // Mismatched author!
			content: 'Fake attribution'
		};

		const merged = mergeComments([removedComment], [
			{
				sourceId: 'archive',
				comments: [maliciousPatch],
				mode: 'restore'
			}
		]);

		expect(merged[0].restored).toBeUndefined();
	});
});
