import type { Post } from '$lib/api/types';

/*
 * Кэш постов в памяти.
 * Посты, загруженные лентой, сохраняются здесь целиком (включая все блоки статьи).
 * При переходе из ленты в пост он открывается мгновенно (0 мс), без ожидания сети.
 */

const MAX_POSTS = 100;
const FRESH_MS = 60_000;

interface CacheEntry {
	post: Post;
	time: number;
}

const posts = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Post>>();

export function postCacheKey(id: number, sourceId: string = 'dtf'): string {
	return `${sourceId}:${id}`;
}

/** Сохранить пост в кэш */
export function cachePost(post: Post): void {
	if (!post?.id) return;
	const key = postCacheKey(post.id, post.sourceId);
	posts.delete(key);
	posts.set(key, { post, time: Date.now() });
	if (posts.size > MAX_POSTS) {
		const oldest = posts.keys().next().value;
		if (oldest !== undefined) posts.delete(oldest);
	}
}

/** Сохранить список постов */
export function cachePosts(items: Post[]): void {
	for (const post of items) {
		cachePost(post);
	}
}

/** Получить пост синхронно из памяти, если он уже был загружен */
export function peekPost(id: number, sourceId: string = 'dtf'): Post | undefined {
	return posts.get(postCacheKey(id, sourceId))?.post;
}

/** Проверить, свежий ли пост в кэше */
export function isPostFresh(id: number, sourceId: string = 'dtf'): boolean {
	const entry = posts.get(postCacheKey(id, sourceId));
	return !!entry && Date.now() - entry.time < FRESH_MS;
}

/**
 * Загрузить пост: возвращает свежий из кэша, объединяет параллельные запросы
 * и обновляет кэш после ответа сети. При ошибке сети отдаёт устаревший пост из кэша, если есть.
 */
export function loadPost(
	id: number,
	sourceId: string = 'dtf',
	force = false,
	fetcher: () => Promise<Post> = () => Promise.reject(new Error('No fetcher'))
): Promise<Post> {
	const key = postCacheKey(id, sourceId);
	const cached = posts.get(key);

	if (cached && !force && Date.now() - cached.time < FRESH_MS) {
		return Promise.resolve(cached.post);
	}

	let promise = inflight.get(key);
	if (!promise) {
		promise = Promise.resolve()
			.then(() => fetcher())
			.then((post) => {
				if (post) cachePost(post);
				return post;
			})
			.catch((err) => {
				if (cached?.post) return cached.post;
				throw err;
			})
			.finally(() => inflight.delete(key));

		inflight.set(key, promise);
	}

	return promise;
}

/** Очистить кэш (для тестов) */
export function clearPostCache(): void {
	posts.clear();
	inflight.clear();
}
