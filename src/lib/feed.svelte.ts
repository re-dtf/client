import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';

/** Ленты на главной. Выбранная лента лежит в адресе: /?feed=new */
export const FEEDS = ['popular', 'new', 'my'] as const;
export type FeedName = (typeof FEEDS)[number];

export const DEFAULT_FEED: FeedName = 'popular';

export function parseFeed(value: string | null): FeedName {
	return FEEDS.find((feed) => feed === value) ?? DEFAULT_FEED;
}

export function feedPath(feed: FeedName): string {
	return feed === DEFAULT_FEED ? '/' : `/?feed=${feed}`;
}

// Лента, которую пользователь смотрит. Нужна боковой панели, чтобы подсвечивать её
// и тогда, когда поверх ленты открыт пост (в адресе тогда /post/123)
let current = $state<FeedName>(DEFAULT_FEED);
let refreshCount = $state(0);

/** Лента из адреса. Пока поверх ленты открыт оверлей, в адресе его путь, а не лента, и остаётся прежняя */
export function feedFromUrl(): FeedName {
	if (page.state.overlays?.length) return current;
	return parseFeed(page.url.searchParams.get('feed'));
}

export const feed = {
	get current() {
		return current;
	},
	/** Страница ленты сообщает, какая лента открыта */
	setCurrent(next: FeedName) {
		current = next;
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
export function openFeedTab(name: FeedName) {
	return goto(resolve(feedPath(name) as '/'), { reset: false });
}
