/**
 * Кэш в памяти для запросов к источникам данных, привязанных к посту.
 * Используется в первую очередь для источников без пагинации (paged: false):
 * - выполняет сетевой запрос ровно один раз на пару (sourceId, postId, endpointKey);
 * - схлопывает одновременные запросы (deduplication / inflight coalescing);
 * - сохраняет результат в памяти с коротким TTL (по умолчанию 60 сек);
 * - кэширует ошибки и статусы "данных нет", предотвращая спам-запросы при пагинации;
 * - не пишет ничего в localStorage.
 */

interface CacheEntry<T> {
	value?: T;
	error?: unknown;
	expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();

export const DEFAULT_POST_CACHE_TTL_MS = 60000;

function makeKey(sourceId: string, postId: number, endpointKey: string): string {
	return `${sourceId}:${postId}:${endpointKey}`;
}

/**
 * Получить данные из кэша или выполнить fetcher с дедупликацией параллельных вызовов.
 */
export async function getOrFetchPostSourceData<T>(
	sourceId: string,
	postId: number,
	endpointKey: string,
	fetcher: () => Promise<T>,
	ttlMs: number = DEFAULT_POST_CACHE_TTL_MS
): Promise<T> {
	const key = makeKey(sourceId, postId, endpointKey);
	const now = Date.now();

	// 1. Проверяем кэш в памяти
	const cached = memoryCache.get(key);
	if (cached && now < cached.expiresAt) {
		if (cached.error !== undefined) {
			throw cached.error;
		}
		return cached.value as T;
	}

	// 2. Проверяем текущий выполняющийся запрос (in-flight coalescing)
	const inFlight = pendingRequests.get(key);
	if (inFlight) {
		return (await inFlight) as T;
	}

	// 3. Выполняем новый запрос
	const promise = (async () => {
		try {
			const res = await fetcher();
			memoryCache.set(key, {
				value: res,
				expiresAt: Date.now() + ttlMs
			});
			return res;
		} catch (err) {
			memoryCache.set(key, {
				error: err,
				expiresAt: Date.now() + ttlMs
			});
			throw err;
		} finally {
			pendingRequests.delete(key);
		}
	})();

	pendingRequests.set(key, promise);
	return await promise;
}

/**
 * Очистить весь кэш (для тестов или сброса сессии).
 */
export function clearPostSourceCache(): void {
	memoryCache.clear();
	pendingRequests.clear();
}
