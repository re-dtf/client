<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import PostOverlay from '$lib/components/PostOverlay.svelte';
	import { navigation } from '$lib/navigation.svelte';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	let mounted = $state(false);
	let postActive = $derived(navigation.activePostId !== null);

	function onPopState(e: PopStateEvent) {
		navigation._handlePopState(e.state);
	}
	
	onMount(() => {
		// Minimum duration for the splash screen
		setTimeout(() => mounted = true, 1000);
	});
</script>

<svelte:window onpopstate={onPopState} />

<div class="splash" class:hidden={mounted}>
	<span>:re</span>
</div>

<div class="app">
	<ThemeLoader componentName="Header" />

	<main class="container">
		<div style:display={postActive ? 'none' : undefined}>
			{@render children()}
		</div>
		{#if postActive}
			<PostOverlay />
		{/if}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		background: #f4f5f7;
		color: #1a1a1a;
	}

	/* ── Comment theme tokens: Classic ── */
	:global(.theme-classic) {
		--comment-bg: transparent;
		--comment-bg-highlight: #fffde7;
		--comment-thread-color: #d0d0d0;
		--comment-thread-hover: #888;
		--comment-author-color: #333;
		--comment-date-color: #888;
		--comment-text-color: #333;
		--comment-reaction-bg: #f0f0f0;
		--comment-reaction-hover: #e0e0e0;
		--comment-reaction-active: rgba(76, 175, 80, 0.1);
		--comment-reaction-active-border: #4caf50;
		--comment-donation-bg: #fff8e1;
		--comment-donation-color: #e65100;
		--comment-donation-border: rgba(230, 81, 0, 0.15);
		--comment-section-border: #ddd;
		--comment-section-bg: transparent;
		--comment-expand-bg: rgba(0, 0, 0, 0.05);
		--comment-expand-color: #555;
		--comment-expand-bg-hover: rgba(0, 0, 0, 0.08);
		--comment-breadcrumb-bg: rgba(0, 0, 0, 0.04);
		--comment-breadcrumb-color: #666;
		--comment-breadcrumb-bg-hover: rgba(0, 0, 0, 0.08);
		--comment-preview-bg: rgba(255, 255, 255, 0.98);
		--comment-preview-border: rgba(0, 0, 0, 0.1);
		--comment-media-radius: 4px;
		--comment-radius: 0;
		--comment-select-bg: #f9f9f9;
		--comment-select-border: #ccc;
		--comment-select-color: #333;
		--comment-header-color: #333;
		--comment-count-color: #666;
	}

	/* ── Comment theme tokens: Modern ── */
	:global(.theme-modern) {
		--comment-bg: transparent;
		--comment-bg-highlight: rgba(110, 142, 251, 0.08);
		--comment-thread-color: #e8e8e8;
		--comment-thread-hover: #6e8efb;
		--comment-author-color: #1a1a1a;
		--comment-date-color: #aaa;
		--comment-text-color: #333;
		--comment-reaction-bg: #f5f6f8;
		--comment-reaction-hover: #ebedf0;
		--comment-reaction-active: rgba(110, 142, 251, 0.1);
		--comment-reaction-active-border: #6e8efb;
		--comment-donation-bg: linear-gradient(135deg, #fff8e1, #ffecb3);
		--comment-donation-color: #f57f17;
		--comment-donation-border: rgba(245, 127, 23, 0.15);
		--comment-section-border: transparent;
		--comment-section-bg: #ffffff;
		--comment-expand-bg: rgba(110, 142, 251, 0.08);
		--comment-expand-color: #6e8efb;
		--comment-expand-bg-hover: rgba(110, 142, 251, 0.15);
		--comment-breadcrumb-bg: rgba(110, 142, 251, 0.06);
		--comment-breadcrumb-color: #6e8efb;
		--comment-breadcrumb-bg-hover: rgba(110, 142, 251, 0.12);
		--comment-preview-bg: rgba(255, 255, 255, 0.97);
		--comment-preview-border: rgba(0, 0, 0, 0.06);
		--comment-media-radius: 10px;
		--comment-radius: 16px;
		--comment-select-bg: #f5f6f8;
		--comment-select-border: #e8e8e8;
		--comment-select-color: #333;
		--comment-header-color: #1a1a1a;
		--comment-count-color: #888;
	}
	
	.splash {
		position: fixed;
		inset: 0;
		background: #f4f5f7;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9999;
		transition: opacity 0.25s ease, visibility 0.25s ease;
	}
	
	.splash.hidden {
		opacity: 0;
		visibility: hidden;
	}
	
	.splash span {
		color: #007bff;
		font-size: 3rem;
		font-weight: bold;
		letter-spacing: -2px;
	}

	.app {
		min-height: 100vh;
	}

	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 20px;
	}

	main {
		padding: 30px 20px;
	}
</style>
