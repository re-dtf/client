import type { Comment } from '$lib/api/types';

/*
 * Кэш комментариев в памяти.
 * Комментарии, загруженные для открытых постов, сохраняются здесь.
 * При возврате к посту из глубины стека оверлеев комментарии восстанавливаются мгновенно (0 мс),
 * без ожидания сети и без потери состояния.
 */

const MAX_POSTS_COMMENTS = 20;

export interface CachedComments {
	flatComments: Comment[];
	cursor?: Record<string, { lastId: number; lastSortingValue: number }>;
	hasMore: boolean;
	time: number;
}

const cache = new Map<string, CachedComments>();

export function commentsCacheKey(postId: number, sourceId: string = 'dtf', sorting: string = 'hotness'): string {
	return `${sourceId}:${postId}:${sorting}`;
}

/** Сохранить список комментариев поста в памяти */
export function cacheComments(
	postId: number,
	sourceId: string = 'dtf',
	sorting: string = 'hotness',
	data: { flatComments: Comment[]; cursor?: Record<string, { lastId: number; lastSortingValue: number }>; hasMore: boolean }
): void {
	if (!postId) return;
	const key = commentsCacheKey(postId, sourceId, sorting);
	cache.delete(key);
	cache.set(key, { ...data, time: Date.now() });
	if (cache.size > MAX_POSTS_COMMENTS) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
}

/** Получить комментарии поста синхронно из памяти */
export function peekComments(postId: number, sourceId: string = 'dtf', sorting: string = 'hotness'): CachedComments | undefined {
	return cache.get(commentsCacheKey(postId, sourceId, sorting));
}

/** Очистить кэш комментариев (для тестов) */
export function clearCommentsCache(): void {
	cache.clear();
}
