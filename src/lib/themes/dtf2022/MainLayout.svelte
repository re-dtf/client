<script lang="ts">
	import type { Snippet } from 'svelte';
	import SidebarLeft from './SidebarLeft.svelte';
	import SidebarRight from './SidebarRight.svelte';
	import MobileBar from './MobileBar.svelte';
	import { sidebar } from './sidebar.svelte';
	import Toasts from './ui/Toasts.svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class={['layout', { 'layout--no-left': sidebar.collapsed }]}>
	<SidebarLeft />

	<main class="page-content" id="content">
		{@render children?.()}
	</main>

	<SidebarRight />
</div>

<MobileBar />

<Toasts />

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
	.layout:has(:global([data-layer]:not([style*="display: none"]) .profile-section)) {
		grid-template-columns: var(--sidebar-left-width) 1fr;
	}

	.layout:has(:global([data-layer]:not([style*="display: none"]) .profile-section)) > :global(.sidebar-right) {
		display: none;
	}

	/* Левую колонку свернули бургером: у DTF правая остаётся с 960px, у профиля её нет */
	.layout.layout--no-left {
		grid-template-columns: 1fr var(--sidebar-right-width);
	}

	@media (max-width: 959px) {
		.layout.layout--no-left {
			grid-template-columns: 1fr;
		}
	}

	.layout.layout--no-left:has(:global([data-layer]:not([style*="display: none"]) .profile-section)) {
		grid-template-columns: 1fr;
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
