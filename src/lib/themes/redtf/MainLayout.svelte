<script lang="ts">
	import type { Snippet } from 'svelte';
	import SidebarLeft from '../dtf2022/SidebarLeft.svelte';
	import MobileBar from '../dtf2022/MobileBar.svelte';
	import { sidebar } from '../dtf2022/sidebar.svelte';
	import Toasts from '../dtf2022/ui/Toasts.svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class={['layout', { 'layout--no-left': sidebar.collapsed }]}>
	<SidebarLeft />

	<main class="page-content" id="content">
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
