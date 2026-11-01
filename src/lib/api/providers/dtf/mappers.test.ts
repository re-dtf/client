import { describe, it, expect } from 'vitest';
import { mapAvatarUrl, mapComment, mapCurrentUser, mapEntryToPost, mapLikes } from './mappers';

describe('mapLikes', () => {
	it('нет данных — нет лайков', () => {
		expect(mapLikes(undefined)).toBeUndefined();
	});

	it('в постах голос приходит числом, в комментариях boolean', () => {
		expect(mapLikes({ counterLikes: 5, isLiked: -1 })?.myVote).toBe(-1);
		expect(mapLikes({ counterLikes: 5, isLiked: true })?.myVote).toBe(1);
		expect(mapLikes({ counterLikes: 5, isLiked: false })?.myVote).toBe(0);
		expect(mapLikes({ counterLikes: 5 })?.myVote).toBe(0);
	});
});

describe('mapAvatarUrl', () => {
	it('берёт готовый url или собирает адрес по uuid', () => {
		expect(mapAvatarUrl({ avatar: { url: 'https://x/a.png' } })).toBe('https://x/a.png');
		expect(mapAvatarUrl({ avatar: { data: { uuid: 'abc' } } }, '80x80')).toContain('/abc/-/scale_crop/80x80/');
		expect(mapAvatarUrl({})).toBeUndefined();
	});
});

describe('mapEntryToPost', () => {
	it('подставляет значения по умолчанию для пустой записи', () => {
		const post = mapEntryToPost({ id: 7 });

		expect(post).toMatchObject({ id: 7, sourceId: 'dtf', title: 'Без заголовка', commentsCount: 0, blocks: [] });
		expect(post.author.name).toBe('Аноним');
		expect(post.unreadCommentsCount).toBeUndefined();
	});

	it('считает непрочитанные комментарии', () => {
		const post = mapEntryToPost({ id: 1, counters: { comments: 10 }, commentsSeenCount: { count: 4 } });

		expect(post.commentsCount).toBe(10);
		expect(post.unreadCommentsCount).toBe(6);
	});
});

describe('mapComment', () => {
	it('превращает ответ в Comment и оставляет postId', () => {
		const comment = mapComment({ id: 3, text: 'привет', date: 1700000000, author: { id: 2, name: 'Ник' } }, 99);

		expect(comment).toMatchObject({ id: 3, sourceId: 'dtf', postId: 99, content: 'привет' });
		expect(comment.createdAt).toBe(new Date(1700000000 * 1000).toISOString());
		expect(comment.media).toBeUndefined();
	});
});

describe('mapCurrentUser', () => {
	it('оставляет био как есть', () => {
		expect(mapCurrentUser({ id: 1, name: 'Ник', description: 'о себе' })).toMatchObject({ id: 1, name: 'Ник', description: 'о себе' });
		expect(mapCurrentUser({ id: 1 }).name).toBe('Аноним');
	});
});
