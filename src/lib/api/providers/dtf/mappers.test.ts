import { describe, it, expect } from 'vitest';
import { REDTF_WATERMARK } from '$lib/watermark';
import { mapAvatarUrl, mapComment, mapCurrentUser, mapEntryToPost, mapIgnoredSubsite, mapLikes, mapNotification, mapSearchSnippet, parseNotificationHtml } from './mappers';

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

		expect(post).toMatchObject({ id: 7, sourceId: 'dtf', title: '', commentsCount: 0, blocks: [] });
		expect(post.author.name).toBe('Аноним');
		expect(post.unreadCommentsCount).toBeUndefined();
	});

	it('оставляет заголовок пустым, если он не указан', () => {
		expect(mapEntryToPost({ id: 1, title: '' }).title).toBe('');
		expect(mapEntryToPost({ id: 2, title: '   ' }).title).toBe('');
		expect(mapEntryToPost({ id: 3, title: undefined }).title).toBe('');
		expect(mapEntryToPost({ id: 4, title: 'Нормальный заголовок' }).title).toBe('Нормальный заголовок');
	});

	it('считает непрочитанные комментарии', () => {
		const post = mapEntryToPost({ id: 1, counters: { comments: 10 }, commentsSeenCount: { count: 4 } });

		expect(post.commentsCount).toBe(10);
		expect(post.unreadCommentsCount).toBe(6);
	});

	it('репост: исходная запись из repostData, недоступная — только id', () => {
		const embed = { original_id: 55, title: 'Оригинал', author: { id: 3, name: 'Автор' }, blocks: [{ type: 'text' }] };
		const repost = mapEntryToPost({ id: 1, repostId: 55, repostData: { type: 'osnovaEmbed', data: embed }, counters: { reposts: 2 } });

		expect(repost.repost?.id).toBe(55);
		expect(repost.repost?.original).toMatchObject({ id: 55, title: 'Оригинал', author: { name: 'Автор' } });
		expect(repost.repostsCount).toBe(2);

		const hidden = mapEntryToPost({ id: 2, repostId: 55, repostData: { data: { original_id: 55, isNotAvailable: true } } });
		expect(hidden.repost).toEqual({ id: 55, original: undefined });
		expect(mapEntryToPost({ id: 3, repostId: null, repostData: null }).repost).toBeUndefined();
	});
});

describe('mapComment', () => {
	it('превращает ответ в Comment и оставляет postId', () => {
		const comment = mapComment({ id: 3, text: 'привет', date: 1700000000, author: { id: 2, name: 'Ник' } }, 99);

		expect(comment).toMatchObject({ id: 3, sourceId: 'dtf', postId: 99, content: 'привет' });
		expect(comment.createdAt).toBe(new Date(1700000000 * 1000).toISOString());
		expect(comment.media).toBeUndefined();
	});

	it('оставляет тип вложения, чтобы неизвестные показать заглушкой', () => {
		const comment = mapComment({ id: 3, media: [{ type: 'link', data: { url: 'https://habr.com/' } }] }, 99);

		expect(comment.media?.[0].type).toBe('link');
	});

	it('берёт закладку и заголовок поста из списка комментариев профиля', () => {
		const comment = mapComment({ id: 3, isFavorited: true, entry: { id: 8, title: 'Пост' } }, 8);

		expect(comment).toMatchObject({ isFavorited: true, postTitle: 'Пост' });
	});

	it('распознаёт невидимый водяной знак reDTF и очищает текст', () => {
		const rawText = 'Привет из reDTF' + REDTF_WATERMARK;
		const comment = mapComment({ id: 10, text: rawText }, 1);

		expect(comment.isRedtf).toBe(true);
		expect(comment.content).toBe('Привет из reDTF');
	});

	it('сохраняет deviceSource из ответа API (например, android-app, ios-app)', () => {
		const comment = mapComment({ id: 11, text: 'тест', source: 'android-app' }, 1);
		expect(comment.deviceSource).toBe('android-app');
	});
});

describe('mapNotification', () => {
	it('статус 1 — не прочитано, аватар берётся у первого пользователя', () => {
		const unread = mapNotification({ id: 1, status: 1, text: 'Ответили', date: 1700000000, users: [{ avatar_url: 'https://x/a.png' }] });

		expect(unread).toMatchObject({ id: 1, isRead: false, text: 'Ответили', avatarUrl: 'https://x/a.png' });
		expect(mapNotification({ id: 2, status: 2 }).isRead).toBe(true);
	});

	it('обрезает аватар первого пользователя через scale_crop при наличии uuid', () => {
		const notification = mapNotification({
			id: 3,
			text: 'Ответили',
			users: [{ avatar: { data: { uuid: 'notif-avatar-uuid' } } }]
		});

		expect(notification.avatarUrl).toContain('/notif-avatar-uuid/-/scale_crop/64x64/');
	});
});

describe('mapCurrentUser', () => {
	it('оставляет био как есть', () => {
		expect(mapCurrentUser({ id: 1, name: 'Ник', description: 'о себе' })).toMatchObject({ id: 1, name: 'Ник', description: 'о себе' });
		expect(mapCurrentUser({ id: 1 }).name).toBe('Аноним');
	});
});

describe('parseNotificationHtml', () => {
	it('оставляет текст, выделение и ссылки только https', () => {
		const parts = parseNotificationHtml('<a href="https://dtf.ru/id1"><b>Ник &amp; Ко</b></a> ответил на <a href="javascript:x">пост</a>');

		expect(parts).toEqual([
			{ text: 'Ник & Ко', bold: true, href: 'https://dtf.ru/id1' },
			{ text: ' ответил на ', bold: undefined, href: undefined },
			{ text: 'пост', bold: undefined, href: undefined }
		]);
	});

	it('без html берётся простой текст', () => {
		expect(mapNotification({ id: 1, text: 'Ответили' }).parts).toEqual([{ text: 'Ответили' }]);
	});
});

describe('mapIgnoredSubsite', () => {
	it('отличает тему от пользователя по type', () => {
		expect(mapIgnoredSubsite({ id: 1, name: 'Кино', type: 2, avatar: { data: { uuid: 'abc' } } })).toMatchObject({ id: 1, isCommunity: true });
		expect(mapIgnoredSubsite({ id: 2, type: 1 })).toMatchObject({ name: 'Аноним', isCommunity: false });
	});
});

describe('mapSearchSnippet', () => {
	it('убирает из начала фрагмента заголовок записи вместе с его выделением', () => {
		expect(mapSearchSnippet('<mark>Xbox</mark> представила контроллер Nano<mark>Xbox</mark> анонсировала геймпад', 'Xbox представила контроллер Nano')).toBe(
			'<mark>Xbox</mark> анонсировала геймпад'
		);
		expect(mapSearchSnippet('Ник &amp; Ко: итогиТекст про <mark>итоги</mark>', 'Ник & Ко: итоги')).toBe('Текст про <mark>итоги</mark>');
	});

	it('фрагмент без заголовка в начале и запись без заголовка остаются как есть', () => {
		expect(mapSearchSnippet('Совсем другой <mark>текст</mark>', 'Заголовок')).toBe('Совсем другой <mark>текст</mark>');
		expect(mapSearchSnippet('Текст <mark>без</mark> заголовка', '')).toBe('Текст <mark>без</mark> заголовка');
	});

	it('если кроме заголовка ничего нет, фрагмента нет', () => {
		expect(mapSearchSnippet('<mark>Заголовок</mark>', 'Заголовок')).toBeUndefined();
		expect(mapSearchSnippet(undefined, 'Заголовок')).toBeUndefined();
	});
});
