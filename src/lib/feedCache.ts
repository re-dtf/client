import { api } from '$lib/api/index.svelte';
import type { PaginatedResult, Post } from '$lib/api/types';
import { authStorage } from '$lib/storage/auth.svelte';
import { DEFAULT_PERIOD, type FeedName, type Period } from './feed.svelte';

/*
 * Первая страница каждой ленты в памяти. Возврат на ленту показывает её сразу, а свежие данные подтягиваются
 * следом. Подсказка на вкладке (наведение, касание) начинает загрузку заранее, и нажатие подхватывает её же.
 */

type Result = PaginatedResult<Post>;

const SORTING: Record<FeedName, string> = { new: 'all', popular: 'hotness', my: 'new' };
const MAX_ENTRIES = 12;

// За выбранный период «Популярное» сортируется по самому периоду (day, week, …)
export function sortingOf(feed: FeedName, period: Period): string {
	return feed === 'popular' && period !== 'now' ? period : SORTING[feed];
}

const results = new Map<string, { result: Result; time: number }>();
const inflight = new Map<string, Promise<Result>>();

// Лента подписок и вход меняют выдачу, поэтому вошедший пользователь и гость кэшируются порознь
const keyOf = (feed: FeedName, period: Period) => `${authStorage.isAuthenticated}:${feed}:${sortingOf(feed, period)}`;

/** Что показать сразу: последняя загруженная страница ленты, если она есть */
export const peekFeed = (feed: FeedName, period: Period = DEFAULT_PERIOD) => results.get(keyOf(feed, period))?.result;

const FRESH = 30_000;

/** Загрузить первую страницу ленты. Свежая страница отдаётся сразу, `force` берёт новую. Параллельные вызовы делят один запрос */
export function loadFeed(feed: FeedName, period: Period = DEFAULT_PERIOD, force = false): Promise<Result> {
	const key = keyOf(feed, period);
	const cached = results.get(key);
	if (cached && !force && Date.now() - cached.time < FRESH) return Promise.resolve(cached.result);

	let promise = inflight.get(key);
	if (!promise) {
		promise = api
			.getPosts({ pageName: feed, sorting: sortingOf(feed, period) })
			.then((result) => {
				results.delete(key);
				results.set(key, { result, time: Date.now() });
				if (results.size > MAX_ENTRIES) results.delete(results.keys().next().value!);
				return result;
			})
			.finally(() => inflight.delete(key));
		inflight.set(key, promise);
	}
	return promise;
}

/** Начать загрузку заранее; ошибку покажет настоящая загрузка */
export const prefetchFeed = (feed: FeedName, period: Period = DEFAULT_PERIOD) => void loadFeed(feed, period).catch(() => {});
