<script lang="ts">
	import type { Snippet } from 'svelte';
	import SidebarLeft from './SidebarLeft.svelte';
	import MobileBar from '../dtf2022/MobileBar.svelte';
	import { sidebar } from '../dtf2022/sidebar.svelte';
	import Toasts from '../dtf2022/ui/Toasts.svelte';

	let { children }: { children?: Snippet } = $props();

	/**
	 * Картинки и видео постов догружаются позже текста. Событие load не всплывает, поэтому слушаем в фазе перехвата:
	 * загрузившееся медиа помечается классом, и CSS запускает плавное проявление (обратное растворение).
	 */
	function mediaFade(main: HTMLElement) {
		const fade = (e: Event) => {
			const el = e.target;
			if (!(el instanceof HTMLImageElement || el instanceof HTMLVideoElement)) return;
			const placeholder = el.closest('.media-placeholder');
			if (!placeholder) return;
			placeholder.classList.add('media-placeholder--loaded');
		};
		// Отмечаем уже готовые картинки (например, из кэша памяти)
		for (const img of main.querySelectorAll<HTMLImageElement>('.media-placeholder img')) {
			if (img.complete && img.naturalWidth > 0) img.closest('.media-placeholder')?.classList.add('media-placeholder--loaded');
		}
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
		transition: grid-template-columns 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
	}

	/* Хватает места: справа резервируем столько же, сколько слева, и контент встаёт по центру окна */
	@media (min-width: 1400px) {
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

	/* Левую колонку свернули бургером: плавно сжимаем боковые колонки до 0px */
	.layout.layout--no-left {
		grid-template-columns: 0px minmax(0, 1fr);
	}

	@media (min-width: 1400px) {
		.layout.layout--no-left {
			grid-template-columns: 0px minmax(0, 1fr) 0px;
		}
	}

	@media (max-width: 859px) {
		.layout {
			display: flex;
			justify-content: center;
			transition: none;
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

	@media (prefers-reduced-motion: reduce) {
		.layout {
			transition: none;
		}
	}
</style>
