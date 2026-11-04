import { persistedState } from './persisted.svelte';

/*
 * Локальный чёрный список и фильтрация контента в ленте.
 * Позволяет скрывать посты по тегам и ключевым словам локально на клиенте,
 * без необходимости быть авторизованным на DTF.
 */

export interface FilterSettings {
	/** Список скрытых тегов (хранятся без ведущего #) */
	tags: string[];
	/** Список скрытых ключевых слов и фраз */
	keywords: string[];
}

export const filterSettings = persistedState<FilterSettings>('redtf:settings:filter', {
	tags: [],
	keywords: []
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
