import { persistedState } from './persisted.svelte';
import type { Comment, Post } from '$lib/api/types';

/*
 * Локальный чёрный список и фильтрация контента в ленте и комментариях.
 * Позволяет скрывать посты и комментарии по тегам и ключевым словам локально на клиенте,
 * без необходимости быть авторизованным на DTF.
 */

export type FilterMode = 'soft' | 'hard';

export interface FilterSettings {
	/** Список скрытых тегов (хранятся без ведущего #) */
	tags: string[];
	/** Список скрытых ключевых слов и фраз */
	keywords: string[];
	/** Режим скрытия: soft — сворачивать под плашку с кнопкой «Показать», hard — скрывать насовсем */
	mode: FilterMode;
	/** Фильтровать посты */
	filterPosts: boolean;
	/** Фильтровать комментарии */
	filterComments: boolean;
}

export interface FilterMatch {
	matched: boolean;
	kind: 'tag' | 'keyword';
	rule: string;
}

export const filterSettings = persistedState<FilterSettings>('redtf:settings:filter', {
	tags: [],
	keywords: [],
	mode: 'soft',
	filterPosts: true,
	filterComments: true
});

/** Нормализует тег: убирает # в начале, пробелы и приводит к нижнему регистру */
export function normalizeTag(tag: string): string {
	return tag.trim().replace(/^#+/, '').toLowerCase();
}

/** Добавляет тег в локальный фильтр */
export function addIgnoredTag(tag: string): boolean {
	const clean = normalizeTag(tag);
	if (!clean || filterSettings.value.tags.includes(clean)) return false;
	filterSettings.patch({ tags: [...filterSettings.value.tags, clean] });
	return true;
}

/** Удаляет тег из локального фильтра */
export function removeIgnoredTag(tag: string) {
	const clean = normalizeTag(tag);
	filterSettings.patch({ tags: filterSettings.value.tags.filter((t) => t !== clean) });
}

/** Добавляет ключевое слово в локальный фильтр */
export function addIgnoredKeyword(keyword: string): boolean {
	const clean = keyword.trim().toLowerCase();
	if (!clean || filterSettings.value.keywords.includes(clean)) return false;
	filterSettings.patch({ keywords: [...filterSettings.value.keywords, clean] });
	return true;
}

/** Удаляет ключевое слово из локального фильтра */
export function removeIgnoredKeyword(keyword: string) {
	const clean = keyword.trim().toLowerCase();
	filterSettings.patch({ keywords: filterSettings.value.keywords.filter((k) => k !== clean) });
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Извлекает весь текст из заголовка, подсайта, автора и блоков поста для поиска */
export function getPostSearchText(post: Post): string {
	const parts: string[] = [post.title || ''];
	if (post.subsite?.name) parts.push(post.subsite.name);
	if (post.author?.name) parts.push(post.author.name);
	if (Array.isArray(post.blocks)) {
		for (const b of post.blocks) {
			if (!b?.data) continue;
			if (typeof b.data.text === 'string') parts.push(b.data.text);
			if (typeof b.data.title === 'string') parts.push(b.data.title);
			if (Array.isArray(b.data.items)) {
				for (const item of b.data.items) {
					if (typeof item === 'string') parts.push(item);
					else if (item && typeof item.title === 'string') parts.push(item.title);
					else if (item && typeof item.text === 'string') parts.push(item.text);
				}
			}
		}
	}
	return parts.join(' ');
}

/** Проверяет, попадает ли пост под фильтр по тегам или ключевым словам */
export function matchPostFilter(
	post: Post,
	settings: FilterSettings = filterSettings.value
): FilterMatch | null {
	if (!settings.filterPosts) return null;
	const { tags, keywords } = settings;
	if (tags.length === 0 && keywords.length === 0) return null;

	const subsiteName = post.subsite?.name ? normalizeTag(post.subsite.name) : '';
	const fullText = getPostSearchText(post);
	const lowerText = fullText.toLowerCase();

	// 1. Проверяем теги
	for (const tag of tags) {
		if (!tag) continue;
		// Совпадение с названием подсайта (на DTF подсайты часто выступают тегами категорий)
		if (subsiteName && subsiteName === tag) {
			return { matched: true, kind: 'tag', rule: `#${tag}` };
		}
		// Хэштег в тексте: #тег с границей слова (не буква, не цифра, не подчеркивание)
		const tagRegex = new RegExp('#' + escapeRegex(tag) + '(?![-_a-zA-Z0-9а-яА-ЯёЁ])', 'i');
		if (tagRegex.test(fullText)) {
			return { matched: true, kind: 'tag', rule: `#${tag}` };
		}
	}

	// 2. Проверяем ключевые слова
	for (const kw of keywords) {
		if (!kw) continue;
		if (lowerText.includes(kw)) {
			return { matched: true, kind: 'keyword', rule: kw };
		}
	}

	return null;
}

/** Проверяет, попадает ли комментарий под фильтр по тегам или ключевым словам */
export function matchCommentFilter(
	comment: Comment,
	settings: FilterSettings = filterSettings.value
): FilterMatch | null {
	if (!settings.filterComments) return null;
	const { tags, keywords } = settings;
	if (tags.length === 0 && keywords.length === 0) return null;

	const content = comment.content || '';
	const lowerContent = content.toLowerCase();

	// 1. Проверяем теги (#тег в тексте комментария)
	for (const tag of tags) {
		if (!tag) continue;
		const tagRegex = new RegExp('#' + escapeRegex(tag) + '(?![-_a-zA-Z0-9а-яА-ЯёЁ])', 'i');
		if (tagRegex.test(content)) {
			return { matched: true, kind: 'tag', rule: `#${tag}` };
		}
	}

	// 2. Проверяем ключевые слова
	for (const kw of keywords) {
		if (!kw) continue;
		if (lowerContent.includes(kw)) {
			return { matched: true, kind: 'keyword', rule: kw };
		}
	}

	return null;
}
