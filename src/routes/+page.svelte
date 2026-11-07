<script lang="ts">
	import { page, navigating } from '$app/state';
	import { disableScrollHandling } from '$app/navigation';
	import { flushSync, onMount, untrack } from 'svelte';
	import FeedList from '$lib/components/FeedList.svelte';
	import { FEEDS, feed, feedFromUrl, neighborFeed, openFeedTab, periodFromUrl, type FeedName } from '$lib/feed.svelte';
	import { feedSwipe, swipeAllowed } from '$lib/feedSwipe';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { play } from '$lib/motion';
	import { pageReady } from '$lib/ready';

	/*
	 * Главная держит открытые ленты все сразу: неактивные скрыты, но со своими постами, раскладкой и прокруткой.
	 * Смена ленты показывает нужную там, где её оставили; на сенсорном экране ленты листаются свайпом.
	 */

	// Адрес задаёт ленту при входе, по ссылке и кнопкой «Назад». Нажатие и свайп меняют её сразу, адрес догоняет
	feed.setCurrent(feedFromUrl(), periodFromUrl());
	feed.reset();
	$effect(() => {
		const name = feedFromUrl();
		const period = periodFromUrl();
		untrack(() => {
			// «Назад» на другую ленту: прокрутку ставим сами, SvelteKit поставил бы прокрутку старого шага истории
			if (name !== feed.current && navigating.type) disableScrollHandling();
			feed.setCurrent(name, period);
		});
	});

	let track = $state<HTMLElement>();
	const slotOf = (name: FeedName) => track?.querySelector<HTMLElement>(`:scope > [data-feed="${name}"]`) ?? null;

	// Лента на экране: над ней нет страницы (пост, профиль). Окна её не прячут
	const feedVisible = () => !page.state.overlays?.some((o) => o.presentation === 'page');

	// Прокрутка открытой ленты. Пока сверху страница, окно прокручивает её, а не ленту
	function rememberScroll() {
		if (feedVisible()) feed.rememberScroll(feed.current, scrollY);
	}

	// Там, где листают свайпом, соседние ленты готовятся заранее, в простое: свайп сразу показывает посты, а не загрузку
	const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
	function warmNeighbors() {
		if (!touch || !swipeAllowed()) return;
		(window.requestIdleCallback ?? setTimeout)(() => {
			for (const dir of [-1, 1] as const) {
				const name = neighborFeed(feed.current, dir);
				if (name) feed.keep(name);
			}
		});
	}

	// Смена ленты: прежняя прячется со своей прокруткой, новая встаёт на свою
	let shown = untrack(() => feed.current);
	let animateNext = false;
	let swiped = false;

	$effect.pre(() => {
		const next = feed.current;
		untrack(() => {
			if (next === shown || !feedVisible()) return;
			feed.rememberScroll(shown, scrollY);
			// Сохранённую ленту выводит анимация темы; новая проиграет своё появление сама, когда загрузится. После свайпа ничего не нужно
			animateNext = !swiped && slotOf(next) !== null;
		});
	});

	$effect(() => {
		const next = feed.current;
		untrack(() => {
			if (next === shown) return;
			shown = next;
			// Под страницей лента сменилась скрыто: прокрутку поставит слой, когда страницу закроют
			if (feedVisible()) {
				const top = feed.scrollOf(next);
				window.scrollTo({ top, behavior: 'instant' });
				const slot = slotOf(next);
				// На проскролленной ленте сдвиг многотысячепиксельного слоя рвёт кадры: там только проявление
				if (animateNext && slot) play(slot, top < 300 ? activeTheme.motion?.feedIn : activeTheme.motion?.pageIn);
			}
			animateNext = swiped = false;
			warmNeighbors();
		});
	});

	const swipe = feedSwipe({
		enabled: () => !page.state.overlays?.length,
		current: () => feed.current,
		slot(name) {
			if (!feed.kept.includes(name)) {
				feed.keep(name);
				flushSync();
			}
			return slotOf(name);
		},
		scrollOf: feed.scrollOf,
		commit(name) {
			swiped = true;
			flushSync(() => openFeedTab(name));
		}
	});

	onMount(() => {
		pageReady().then(warmNeighbors);
	});
</script>

<svelte:head>
	<title>reDTF - Лента</title>
</svelte:head>

<svelte:window onscroll={rememberScroll} />

<div class="feeds">
	<div class={['feeds__track', { 'feeds__track--swipe': activeTheme.gestures }]} bind:this={track} {@attach activeTheme.gestures ? swipe : undefined}>
		{#each FEEDS as name (name)}
			{#if feed.kept.includes(name)}
				<div class={['feeds__slot', { 'feeds__slot--active': name === feed.current }]} data-feed={name}>
					<FeedList {name} period={feed.periodOf(name)} active={name === feed.current} />
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	/* В темах с flex-раскладкой (dtf2022) иначе ленты сжимаются по контенту. Вбок ленты едут только внутри своей полосы */
	.feeds {
		width: 100%;
		overflow-x: clip;
	}

	.feeds__track {
		position: relative;
	}

	/* Горизонтальный жест — свайп лент, вертикальный и щипок остаются браузеру */
	.feeds__track--swipe {
		touch-action: pan-y pinch-zoom;
	}

	/* Скрытая лента не рисуется и не занимает места, но браузер хранит её раскладку: возврат на неё мгновенный.
	   Абсолютной она стоит заранее: жест только сдвигает её и делает видимой, без смены позиционирования в первом кадре */
	.feeds__slot:not(.feeds__slot--active) {
		content-visibility: hidden;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
	}

	@supports not (content-visibility: hidden) {
		.feeds__slot:not(.feeds__slot--active) {
			display: none;
		}
	}
</style>
