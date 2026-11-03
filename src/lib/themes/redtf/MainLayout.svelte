<script lang="ts">
	import type { Snippet } from 'svelte';
	import SidebarLeft from './SidebarLeft.svelte';
	import MobileBar from '../dtf2022/MobileBar.svelte';
	import { sidebar } from '../dtf2022/sidebar.svelte';
	import Toasts from '../dtf2022/ui/Toasts.svelte';
	import { play } from '$lib/motion';
	import { activeTheme } from '../index.svelte';

	let { children }: { children?: Snippet } = $props();

	/**
	 * Картинки и видео постов догружаются позже текста. Событие load не всплывает, поэтому слушаем в фазе перехвата:
	 * загрузившееся медиа проявляется поверх цветной заглушки, а не выскакивает рывком.
	 */
	function mediaFade(main: HTMLElement) {
		// Картинка из кэша тоже шлёт load, но она появляется сразу: проявлять есть смысл, только если её только что скачали
		const justLoaded = (src: string) => {
			const entry = performance.getEntriesByName(src).at(-1) as PerformanceResourceTiming | undefined;
			return !!entry && performance.now() - entry.responseEnd < 800;
		};
		const fade = (e: Event) => {
			const el = e.target;
			if (!(el instanceof HTMLImageElement || el instanceof HTMLVideoElement) || !el.closest('.media-placeholder')) return;
			if (el instanceof HTMLImageElement && !justLoaded(el.currentSrc)) return;
			play(el, activeTheme.motion?.mediaIn);
		};
		main.addEventListener('load', fade, true);
		main.addEventListener('loadeddata', fade, true);
		return () => {
			main.removeEventListener('load', fade, true);
			main.removeEventListener('loadeddata', fade, true);
		};
	}
</script>

<div class={['layout', { 'layout--no-left': sidebar.collapsed }]}>
	<SidebarLeft />

	<main class="page-content" id="content" {@attach mediaFade}>
		{@render children?.()}
	</main>
</div>

<MobileBar />

<Toasts />

<style>
	/*
	 * Раскладка: область контента между левым сайдбаром и краем окна, в ней колонка шириной --content-width по центру.
	 * Поля области (--page-gutter) заданы в theme.css; колонка у́же области на эти поля, а не вылезает за них.
	 * minmax(0, 1fr) и min-width: 0 не дают широкому содержимому растянуть саму область.
	 */
	.layout {
		display: grid;
		grid-template-columns: var(--sidebar-left-width) minmax(0, 1fr);
		min-height: 100vh;
	}

	/* Хватает места: справа резервируем столько же, сколько слева, и контент встаёт по центру окна */
	@media (min-width: 1300px) {
		.layout {
			grid-template-columns: var(--sidebar-left-width) minmax(0, 1fr) var(--sidebar-left-width);
		}
	}

	.layout > :global(.sidebar-left) {
		grid-column: 1;
	}

	.page-content {
		grid-column: 2;
		display: flex;
		align-items: center;
		flex-direction: column;
		min-width: 0;
		padding-inline: var(--page-gutter);
	}

	/* Левую колонку свернули бургером: контент на всю ширину */
	.layout.layout--no-left {
		grid-template-columns: minmax(0, 1fr);
	}

	.layout--no-left > .page-content {
		grid-column: 1;
	}

	@media (max-width: 859px) {
		.layout {
			display: flex;
			justify-content: center;
		}

		.page-content {
			width: 100%;
		}
	}

	@media (max-width: 719px) {
		/* Иначе низ страницы прячется под фиксированной мобильной строкой */
		.page-content {
			padding-bottom: var(--mobile-bar-height);
		}
	}
</style>
