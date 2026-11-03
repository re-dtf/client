import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { scrollBehavior } from './motion';
import { haptics } from './haptics';

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
let resetScrollPending = false;

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
		haptics.double();
		refreshCount++;
	},
	/** Запрос на сброс скролла ленты к началу (при явном клике по табам в шапке/меню) */
	resetScroll() {
		resetScrollPending = true;
	},
	consumeScrollReset() {
		const pending = resetScrollPending;
		resetScrollPending = false;
		return pending;
	}
};

/**
 * Открыть ленту. Работает из любого места, в том числе из-под оверлея или со страницы поста.
 * Нажатие на ту ленту, что уже открыта, обновляет её, как клик по логотипу.
 */
export function openFeedTab(name: FeedName, period: Period = DEFAULT_PERIOD) {
	haptics.tick();
	const onFeed = page.route.id === '/' && !page.state.overlays?.length;
	if (onFeed && feedFromUrl() === name && periodFromUrl() === period) {
		window.scrollTo({ top: 0, behavior: scrollBehavior() });
		refreshCount++;
		return Promise.resolve();
	}

	// Вкладка подсвечивается и лента начинает грузиться сразу, не дожидаясь смены адреса
	current = name;
	currentPeriod = period;
	feed.resetScroll();
	if (onFeed) {
		window.scrollTo({ top: 0, behavior: 'instant' });
	}
	return goto(resolve(feedPath(name, period) as '/'), { reset: false });
}
