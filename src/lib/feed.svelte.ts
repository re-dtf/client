import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { untrack } from 'svelte';
import { scrollBehavior } from './motion';
import { haptics } from './haptics';

/** Ленты на главной в порядке вкладок (и свайпа). Выбранная лента лежит в адресе: /?feed=new */
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

/** Соседняя лента в порядке вкладок: -1 — слева, 1 — справа */
export const neighborFeed = (name: FeedName, dir: -1 | 1): FeedName | undefined => FEEDS[FEEDS.indexOf(name) + dir];

// Лента, которую пользователь смотрит. Нужна боковой панели, чтобы подсвечивать её
// и тогда, когда поверх ленты открыт пост (в адресе тогда /post/123)
let current = $state<FeedName>(DEFAULT_FEED);
// Период есть только у «Популярного» и остаётся за ним, пока смотрят другие ленты
let popularPeriod = $state<Period>(DEFAULT_PERIOD);
// Открытые ленты остаются в памяти страницы со своими постами, чтобы возврат и свайп были мгновенными
let kept = $state<FeedName[]>([DEFAULT_FEED]);
let refreshCount = $state(0);
// Обновление начато жестом: индикатор рисует жест, у ленты своего не нужно
let refreshQuiet = $state(false);
// Кто ждёт конца обновления (жест держит загрузку, пока лента не обновится)
let refreshWaiters: (() => void)[] = [];

// Прокрутка каждой ленты. Не состояние: её пишет прокрутка окна, а читают только при смене ленты
const scrolls = new Map<FeedName, number>();
// Куда прокрутить ленту, когда закроются оверлеи (ленту выбрали из-под поста)
let pendingScroll: number | undefined;

const periodOf = (name: FeedName) => (name === 'popular' ? popularPeriod : DEFAULT_PERIOD);

// Без подписки: адрес ленту синхронизирует эффект страницы, и чтение списка зациклило бы его
function select(name: FeedName, period: Period) {
	current = name;
	if (name === 'popular') popularPeriod = period;
	untrack(() => feed.keep(name));
}

/** Лента из адреса. Пока поверх ленты открыт оверлей, в адресе его путь, а не лента, и остаётся прежняя */
export function feedFromUrl(): FeedName {
	if (page.state.overlays?.length) return current;
	return parseFeed(page.url.searchParams.get('feed'));
}

/** Период из адреса. Только у «Популярного»; поверх оверлея остаётся прежний */
export function periodFromUrl(): Period {
	if (page.state.overlays?.length) return periodOf(current);
	return feedFromUrl() === DEFAULT_FEED ? parsePeriod(page.url.searchParams.get('period')) : DEFAULT_PERIOD;
}

export const feed = {
	get current() {
		return current;
	},
	/** Период открытой ленты */
	get period() {
		return periodOf(current);
	},
	periodOf,
	/** Ленты, которые держит страница (открытые и подготовленные для свайпа) */
	get kept(): readonly FeedName[] {
		return kept;
	},
	/** Страница ленты сообщает, какая лента в адресе */
	setCurrent(next: FeedName, period: Period = DEFAULT_PERIOD) {
		select(next, period);
	},
	/** Подготовить ленту заранее (соседняя для свайпа): она загрузится и будет ждать скрытой */
	keep(name: FeedName) {
		if (!kept.includes(name)) kept.push(name);
	},
	/** Страница ленты построена заново: прежних списков нет, остаётся только открытая лента */
	reset() {
		kept = [current];
		scrolls.clear();
		pendingScroll = undefined;
	},
	scrollOf(name: FeedName) {
		return scrolls.get(name) ?? 0;
	},
	rememberScroll(name: FeedName, top: number) {
		scrolls.set(name, top);
	},
	/** Прокрутка для ленты, выбранной из-под оверлея. Забирает её слой при закрытии оверлеев */
	consumeScrollTarget() {
		const target = pendingScroll;
		pendingScroll = undefined;
		return target;
	},
	/** Увеличивается, когда ленту просят перезагрузить (клик по логотипу на самой ленте, жест) */
	get refreshCount() {
		return refreshCount;
	},
	/** Обновление начато жестом: лента не показывает своего индикатора */
	get refreshQuiet() {
		return refreshQuiet;
	},
	/** Перезагрузить открытую ленту. Промис выполняется, когда она обновилась или не смогла */
	refresh(quiet = false): Promise<void> {
		if (!quiet) haptics.double();
		refreshQuiet = quiet;
		refreshCount++;
		return new Promise((done) => refreshWaiters.push(done));
	},
	/** Открытая лента закончила обновление */
	refreshed() {
		for (const done of refreshWaiters.splice(0)) done();
	}
};

/**
 * Открыть ленту. Работает из любого места, в том числе из-под оверлея или со страницы поста.
 * Другая лента открывается там, где её оставили. Нажатие на ту ленту, что уже открыта, обновляет её, как клик по логотипу;
 * другой период «Популярного» начинается сверху. Без `period` у «Популярного» остаётся выбранный раньше.
 */
export function openFeedTab(name: FeedName, period?: Period) {
	haptics.tick();
	const nextPeriod = name === 'popular' ? (period ?? popularPeriod) : DEFAULT_PERIOD;
	const onFeed = page.route.id === '/' && !page.state.overlays?.length;
	if (onFeed && name === current && nextPeriod === popularPeriod) {
		window.scrollTo({ top: 0, behavior: scrollBehavior() });
		refreshQuiet = false;
		refreshCount++;
		return Promise.resolve();
	}

	// Та же лента (другой период или выбрана из-под поста) начинается сверху
	if (name === current) {
		scrolls.delete(name);
		if (onFeed) window.scrollTo({ top: 0, behavior: 'instant' });
	}
	if (!onFeed) pendingScroll = scrolls.get(name) ?? 0;

	// Вкладка подсвечивается и лента показывается сразу, не дожидаясь смены адреса
	select(name, nextPeriod);
	return goto(resolve(feedPath(name, nextPeriod) as '/'), { reset: false });
}
