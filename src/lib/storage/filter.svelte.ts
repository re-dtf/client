import { persistedState } from './persisted.svelte';
import type { Comment, Notification, Post } from '$lib/api/types';

/*
 * Локальный чёрный список и фильтрация контента в ленте и комментариях.
 * Позволяет скрывать посты и комментарии по тегам, ключевым словам и авторам локально на клиенте,
 * без необходимости быть авторизованным на DTF.
 */

export type FilterMode = 'soft' | 'hard';

/** Пользователь DTF, которого скрыли локально; имя хранится, чтобы показать его в настройках без запроса */
export interface HiddenUser {
	id: number;
	name: string;
}

export interface FilterSettings {
	/** Список скрытых тегов (хранятся без ведущего #) */
	tags: string[];
	/** Список скрытых ключевых слов и фраз */
	keywords: string[];
	/** Скрытые локально пользователи DTF: их посты, комментарии и уведомления от них не показываются */
	users: HiddenUser[];
	/** Режим скрытия: soft — сворачивать под плашку с кнопкой «Показать», hard — скрывать насовсем */
	mode: FilterMode;
	/** Фильтровать посты */
	filterPosts: boolean;
	/** Фильтровать комментарии */
	filterComments: boolean;
}

export interface FilterMatch {
	matched: boolean;
	kind: 'tag' | 'keyword' | 'user';
	rule: string;
}

export interface KeywordPreset {
	id: string;
	title: string;
	keywords: string[];
}

export const KEYWORD_PRESETS: KeywordPreset[] = [
	{
		id: 'gta6',
		title: 'GTA 6',
		keywords: ['gta 6', 'gta vi', 'гта 6', 'gta6', 'gtavi', 'гта6']
	}
];

export const filterSettings = persistedState<FilterSettings>('redtf:settings:filter', {
	tags: [],
	keywords: [],
	users: [],
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

/** Скрывает пользователя DTF локально: без входа и без записи в чёрный список аккаунта */
export function hideUser(id: number, name: string): boolean {
	if (isUserHidden(id)) return false;
	filterSettings.patch({ users: [...filterSettings.value.users, { id, name }] });
	return true;
}

/** Возвращает локально скрытого пользователя */
export function unhideUser(id: number) {
	filterSettings.patch({ users: filterSettings.value.users.filter((u) => u.id !== id) });
}

export function isUserHidden(id: number, users: HiddenUser[] = filterSettings.value.users): boolean {
	return users.some((u) => u.id === id);
}

/** Уведомление, у которого все авторы скрыты: «Имя и ещё двое оценили» остаётся, пока виден хоть кто-то из них */
export function isNotificationHidden(
	notification: Pick<Notification, 'userIds'>,
	users: HiddenUser[] = filterSettings.value.users
): boolean {
	const ids = notification.userIds;
	return !!ids?.length && ids.every((id) => isUserHidden(id, users));
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

/** Добавляет группу ключевых слов (пресет) в локальный фильтр */
export function addIgnoredKeywords(keywords: string[]): number {
	const current = new Set(filterSettings.value.keywords);
	let added = 0;
	for (const kw of keywords) {
		const clean = kw.trim().toLowerCase();
		if (clean && !current.has(clean)) {
			current.add(clean);
			added++;
		}
	}
	if (added > 0) {
		filterSettings.patch({ keywords: Array.from(current) });
	}
	return added;
}

/** Удаляет группу ключевых слов из локального фильтра */
export function removeIgnoredKeywords(keywords: string[]): void {
	const toRemove = new Set(keywords.map((k) => k.trim().toLowerCase()));
	filterSettings.patch({
		keywords: filterSettings.value.keywords.filter((k) => !toRemove.has(k))
	});
}

/** Проверяет, активен ли пресет (все ли его слова присутствуют в списке скрытых) */
export function isKeywordPresetActive(
	preset: KeywordPreset,
	keywords: string[] = filterSettings.value.keywords
): boolean {
	const current = new Set(keywords);
	return preset.keywords.every((kw) => current.has(kw.trim().toLowerCase()));
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
	const { tags, keywords, users } = settings;
	if (tags.length === 0 && keywords.length === 0 && users.length === 0) return null;

	const author = post.sourceId === 'dtf' && post.author ? users.find((u) => u.id === post.author.id) : undefined;
	if (author) return { matched: true, kind: 'user', rule: author.name };

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
	const { tags, keywords, users } = settings;
	if (tags.length === 0 && keywords.length === 0 && users.length === 0) return null;

	const author = comment.sourceId === 'dtf' ? users.find((u) => u.id === comment.author.id) : undefined;
	if (author) return { matched: true, kind: 'user', rule: author.name };

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
