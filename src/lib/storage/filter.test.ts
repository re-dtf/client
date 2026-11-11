import { describe, it, expect, beforeEach, vi } from 'vitest';

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
	addIgnoredKeyword,
	addIgnoredKeywords,
	addIgnoredTag,
	filterSettings,
	hideUser,
	isKeywordPresetActive,
	isNotificationHidden,
	KEYWORD_PRESETS,
	matchCommentFilter,
	matchPostFilter,
	normalizeTag,
	removeIgnoredKeyword,
	removeIgnoredKeywords,
	removeIgnoredTag,
	unhideUser
} from './filter.svelte';
import type { Comment, Post } from '$lib/api/types';

describe('filter storage', () => {
	beforeEach(() => {
		localStorage.clear();
		filterSettings.patch({
			tags: [],
			keywords: [],
			users: [],
			mode: 'soft',
			filterPosts: true,
			filterComments: true
		});
	});

	it('нормализует теги', () => {
		expect(normalizeTag('#игры')).toBe('игры');
		expect(normalizeTag('###Аниме  ')).toBe('аниме');
		expect(normalizeTag('кино')).toBe('кино');
	});

	it('добавляет и удаляет теги', () => {
		expect(addIgnoredTag('#игры')).toBe(true);
		expect(filterSettings.value.tags).toEqual(['игры']);

		// повторное добавление дубликата
		expect(addIgnoredTag('Игры')).toBe(false);
		expect(filterSettings.value.tags).toEqual(['игры']);

		removeIgnoredTag('игры');
		expect(filterSettings.value.tags).toEqual([]);
	});

	it('добавляет и удаляет ключевые слова', () => {
		expect(addIgnoredKeyword('Спойлер')).toBe(true);
		expect(filterSettings.value.keywords).toEqual(['спойлер']);

		expect(addIgnoredKeyword('спойлер')).toBe(false);

		removeIgnoredKeyword('СПОЙЛЕР');
		expect(filterSettings.value.keywords).toEqual([]);
	});

	it('поддерживает пресеты ключевых слов (GTA 6)', () => {
		const gtaPreset = KEYWORD_PRESETS.find((p) => p.id === 'gta6');
		expect(gtaPreset).toBeDefined();
		expect(gtaPreset?.keywords).toEqual(['gta 6', 'gta vi', 'гта 6', 'gta6', 'gtavi', 'гта6']);

		expect(isKeywordPresetActive(gtaPreset!)).toBe(false);

		// Добавляем пресет
		const added = addIgnoredKeywords(gtaPreset!.keywords);
		expect(added).toBe(6);
		expect(filterSettings.value.keywords).toEqual(['gta 6', 'gta vi', 'гта 6', 'gta6', 'gtavi', 'гта6']);
		expect(isKeywordPresetActive(gtaPreset!)).toBe(true);

		// Повторное добавление не дублирует слова
		expect(addIgnoredKeywords(gtaPreset!.keywords)).toBe(0);

		// Если удалить хотя бы одно слово, пресет перестаёт быть активным
		removeIgnoredKeyword('гта 6');
		expect(isKeywordPresetActive(gtaPreset!)).toBe(false);

		// Удаление всех слов пресета
		removeIgnoredKeywords(gtaPreset!.keywords);
		expect(filterSettings.value.keywords).toEqual([]);
		expect(isKeywordPresetActive(gtaPreset!)).toBe(false);
	});

	it('фильтрует посты по тегам и подсайтам', () => {
		addIgnoredTag('щитпост');

		const postWithSubsite: Post = {
			id: 1,
			sourceId: 'dtf',
			title: 'Интересный пост',
			blocks: [],
			author: { id: 10, name: 'User' },
			commentsCount: 0,
			createdAt: '',
			subsite: { id: 5, name: 'Щитпост' }
		};

		const match = matchPostFilter(postWithSubsite);
		expect(match).toEqual({ matched: true, kind: 'tag', rule: '#щитпост' });

		const postWithTagInText: Post = {
			id: 2,
			sourceId: 'dtf',
			title: 'Мой пост #щитпост!',
			blocks: [],
			author: { id: 10, name: 'User' },
			commentsCount: 0,
			createdAt: ''
		};

		const match2 = matchPostFilter(postWithTagInText);
		expect(match2).toEqual({ matched: true, kind: 'tag', rule: '#щитпост' });

		const postDifferentTag: Post = {
			id: 3,
			sourceId: 'dtf',
			title: 'Пост про #щитпостинг',
			blocks: [],
			author: { id: 10, name: 'User' },
			commentsCount: 0,
			createdAt: ''
		};
		// Не должно матчить часть другого слова
		expect(matchPostFilter(postDifferentTag)).toBeNull();
	});

	it('фильтрует посты по ключевым словам', () => {
		addIgnoredKeyword('спойлер к фильму');

		const post: Post = {
			id: 1,
			sourceId: 'dtf',
			title: 'Осторожно, СПОЙЛЕР К ФИЛЬМУ внутри',
			blocks: [],
			author: { id: 10, name: 'User' },
			commentsCount: 0,
			createdAt: ''
		};

		const match = matchPostFilter(post);
		expect(match).toEqual({ matched: true, kind: 'keyword', rule: 'спойлер к фильму' });
	});

	it('учитывает флаг filterPosts', () => {
		addIgnoredKeyword('спойлер');
		filterSettings.patch({ filterPosts: false });

		const post: Post = {
			id: 1,
			sourceId: 'dtf',
			title: 'Тут есть спойлер',
			blocks: [],
			author: { id: 10, name: 'User' },
			commentsCount: 0,
			createdAt: ''
		};

		expect(matchPostFilter(post)).toBeNull();
	});

	it('фильтрует комментарии по ключевым словам и тегам', () => {
		addIgnoredKeyword('реклама');
		addIgnoredTag('спам');

		const comment1: Comment = {
			id: 100,
			sourceId: 'dtf',
			postId: 1,
			author: { id: 5, name: 'Bot' },
			content: 'Лучшая Реклама только у нас',
			createdAt: ''
		};

		expect(matchCommentFilter(comment1)).toEqual({ matched: true, kind: 'keyword', rule: 'реклама' });

		const comment2: Comment = {
			id: 101,
			sourceId: 'dtf',
			postId: 1,
			author: { id: 6, name: 'Spammer' },
			content: 'Осторожно #спам!',
			createdAt: ''
		};

		expect(matchCommentFilter(comment2)).toEqual({ matched: true, kind: 'tag', rule: '#спам' });

		// Если выключить фильтр комментариев
		filterSettings.patch({ filterComments: false });
		expect(matchCommentFilter(comment1)).toBeNull();
		expect(matchCommentFilter(comment2)).toBeNull();
	});

	it('скрытый пользователь прячет свои посты, комментарии и уведомления', () => {
		expect(hideUser(10, 'User')).toBe(true);
		expect(hideUser(10, 'User')).toBe(false);

		const post = { id: 1, sourceId: 'dtf', title: '', blocks: [], author: { id: 10, name: 'User' }, commentsCount: 0, createdAt: '' } as Post;
		const comment = { id: 2, sourceId: 'dtf', postId: 1, author: { id: 10, name: 'User' }, content: 'привет', createdAt: '' } as Comment;
		expect(matchPostFilter(post)).toEqual({ matched: true, kind: 'user', rule: 'User' });
		expect(matchCommentFilter(comment)).toEqual({ matched: true, kind: 'user', rule: 'User' });
		expect(matchPostFilter({ ...post, author: { id: 11, name: 'Other' } })).toBeNull();

		// уведомление пропадает, только если скрыты все, кто его вызвал
		expect(isNotificationHidden({ userIds: [10] })).toBe(true);
		expect(isNotificationHidden({ userIds: [10, 11] })).toBe(false);
		expect(isNotificationHidden({})).toBe(false);

		unhideUser(10);
		expect(matchPostFilter(post)).toBeNull();
	});
});
