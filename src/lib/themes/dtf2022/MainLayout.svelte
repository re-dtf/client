<script lang="ts">
	import type { Snippet } from 'svelte';
	import SidebarLeft from './SidebarLeft.svelte';
	import SidebarRight from './SidebarRight.svelte';
	import MobileBar from './MobileBar.svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="layout">
	<SidebarLeft />

	<main class="page-content" id="content">
		{@render children?.()}
	</main>

	<SidebarRight />
</div>

<MobileBar />

<style>
	/* Контент в пространстве между сайдбарами */
	.layout {
		display: grid;
		grid-template-columns: var(--sidebar-left-width) 1fr var(--sidebar-right-width);
		min-height: 100vh;
	}

	.page-content {
		display: flex;
		align-items: center;
		flex-direction: column;
	}

	/* Правая колонка у DTF пропадает при ≤1179px, левая — при ≤859px */
	@media (max-width: 1179px) {
		.layout {
			grid-template-columns: var(--sidebar-left-width) 1fr;
		}
	}

	/* У страницы профиля своя сетка (контент 640 + сайдбар 300), правой колонки у неё нет */
	.layout:has(:global(.profile-section)) {
		grid-template-columns: var(--sidebar-left-width) 1fr;
	}

	.layout:has(:global(.profile-section)) > :global(.sidebar-right) {
		display: none;
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
