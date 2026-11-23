<script lang="ts">
	import type { Snippet } from 'svelte';
	import SidebarLeft from './SidebarLeft.svelte';
	import SidebarRight from './SidebarRight.svelte';
	import MobileBar from './MobileBar.svelte';
	import { sidebar } from './sidebar.svelte';
	import Toasts from './ui/Toasts.svelte';
	import RemarkEditor from './ui/RemarkEditor.svelte';
	import { remarkEditor } from './actions.svelte';
	import { page } from '$app/state';
	import { pageTransition } from '$lib/pageTransition.svelte';
	import { themeSettings } from './themeSettings.svelte';

	let { children }: { children?: Snippet } = $props();

	// Свёрнутая колонка Live сужается до 80px: ширину читают и шапка, и сетка страницы, поэтому флаг ставим на корень
	let liveCollapsed = $derived(themeSettings.liveEnabled && themeSettings.liveCollapsed);
	$effect(() => {
		document.documentElement.toggleAttribute('data-live-collapsed', liveCollapsed);
		return () => document.documentElement.removeAttribute('data-live-collapsed');
	});

	let isProfile = $derived.by(() => {
		const overlays = page.state.overlays as App.OverlayState[] | undefined;
		let top = overlays?.findLast((o) => o.presentation === 'page');
		if (pageTransition.active && pageTransition.incomingHidden && pageTransition.outgoingId) {
			const outgoing = overlays?.find((o) => o.id === pageTransition.outgoingId);
			if (outgoing) top = outgoing;
			else if (pageTransition.outgoingId === '__feed__') top = undefined;
		}
		if (top) return top.type === 'profile';
		return page.route.id?.startsWith('/u/') ?? false;
	});
</script>

<div class={['layout', { 'layout--no-left': sidebar.collapsed, 'layout--profile': isProfile }]}>
	<SidebarLeft />

	<main class="page-content" id="content">
		{@render children?.()}
	</main>

	<SidebarRight />
</div>

<MobileBar />

<Toasts />

{#if remarkEditor.target}
	{#key remarkEditor.target}
		<RemarkEditor user={remarkEditor.target} />
	{/key}
{/if}

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
	.layout.layout--profile {
		grid-template-columns: var(--sidebar-left-width) 1fr;
	}

	.layout.layout--profile > :global(.sidebar-right) {
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

	.layout.layout--no-left.layout--profile {
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
