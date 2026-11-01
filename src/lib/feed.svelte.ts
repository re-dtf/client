import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';

/** Ленты на главной. Выбранная лента лежит в адресе: /?feed=new */
export const FEEDS = ['popular', 'new', 'my'] as const;
export type FeedName = (typeof FEEDS)[number];

export const DEFAULT_FEED: FeedName = 'popular';

/** Периоды «Популярного». Выбранный лежит в адресе: /?period=week. `now` — обычное популярное, у него есть новости */
export const PERIODS = ['now', 'day', 'week', 'month', 'year', 'all'] as const;
export type Period = (typeof PERIODS)[number];

export const DEFAULT_PERIOD: Period = 'now';

export function parseFeed(value: string | null): FeedName {
	return FEEDS.find((feed) => feed === value) ?? DEFAULT_FEED;
}

export function parsePeriod(value: string | null): Period {
	return PERIODS.find((period) => period === value) ?? DEFAULT_PERIOD;
}

export function feedPath(feed: FeedName, period: Period = DEFAULT_PERIOD): string {
	if (feed !== DEFAULT_FEED) return `/?feed=${feed}`;
	return period === DEFAULT_PERIOD ? '/' : `/?period=${period}`;
}

// Лента, которую пользователь смотрит. Нужна боковой панели, чтобы подсвечивать её
// и тогда, когда поверх ленты открыт пост (в адресе тогда /post/123)
let current = $state<FeedName>(DEFAULT_FEED);
let currentPeriod = $state<Period>(DEFAULT_PERIOD);
let refreshCount = $state(0);

/** Лента из адреса. Пока поверх ленты открыт оверлей, в адресе его путь, а не лента, и остаётся прежняя */
export function feedFromUrl(): FeedName {
	if (page.state.overlays?.length) return current;
	return parseFeed(page.url.searchParams.get('feed'));
}

/** Период из адреса. Только у «Популярного»; поверх оверлея остаётся прежний */
export function periodFromUrl(): Period {
	if (page.state.overlays?.length) return currentPeriod;
	return feedFromUrl() === DEFAULT_FEED ? parsePeriod(page.url.searchParams.get('period')) : DEFAULT_PERIOD;
}

export const feed = {
	get current() {
		return current;
	},
	/** Страница ленты сообщает, какая лента открыта */
	setCurrent(next: FeedName, period: Period = DEFAULT_PERIOD) {
		current = next;
		currentPeriod = period;
	},
	/** Увеличивается, когда ленту просят перезагрузить (клик по логотипу на самой ленте) */
	get refreshCount() {
		return refreshCount;
	},
	refresh() {
		refreshCount++;
	}
};

/** Открыть ленту. Работает из любого места, в том числе из-под оверлея или со страницы поста */
export function openFeedTab(name: FeedName, period?: Period) {
	return goto(resolve(feedPath(name, period) as '/'), { reset: false });
}
