<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import PostOverlay from '$lib/components/PostOverlay.svelte';
	import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';
	import LoginOverlay from '$lib/components/LoginOverlay.svelte';
	import ReloadPrompt from '$lib/components/ReloadPrompt.svelte';
	import { page } from '$app/stores';
	import { onMount, tick } from 'svelte';
	import { dev } from '$app/environment';
	
	let { children } = $props();
	let mounted = $state(false);
	
	let overlays = $derived($page.state.overlays || []);
	let anyOverlayActive = $derived(overlays.length > 0);
	
	// Scroll Restoration Stack
	let scrollPositions = new Map<string, number>();
	let currentActiveId = $derived(overlays.length > 0 ? overlays[overlays.length - 1].id : '__feed__');
	let previousActiveId = '__feed__';

	$effect.pre(() => {
		// Save scroll of the outgoing layer before DOM hides it
		if (currentActiveId !== previousActiveId) {
			scrollPositions.set(previousActiveId, window.scrollY);
		}
	});

	$effect(() => {
		// Restore scroll of the incoming layer after DOM shows it
		if (currentActiveId !== previousActiveId) {
			const savedScroll = scrollPositions.get(currentActiveId) || 0;
			previousActiveId = currentActiveId;
			tick().then(() => {
				window.scrollTo({ top: savedScroll, left: 0, behavior: 'instant' });
			});
		}
	});
	
	onMount(() => {
		// Minimum duration for the splash screen
		setTimeout(() => mounted = true, 1000);
	});
</script>

<div class="splash" class:hidden={mounted}>
	<span>:re</span>
</div>

<div class="app">
	<ThemeLoader componentName="Header" />

	<main class="container">
		<div style:display={anyOverlayActive ? 'none' : undefined}>
			{@render children()}
		</div>
		
		{#each overlays as overlay, index (overlay.id)}
			<div style:display={index === overlays.length - 1 ? 'block' : 'none'}>
				{#if overlay.type === 'post'}
					<PostOverlay postId={overlay.data.postId} />
				{:else if overlay.type === 'settings'}
					<SettingsOverlay />
				{:else if overlay.type === 'login'}
					<LoginOverlay />
				{/if}
			</div>
		{/each}
	</main>
</div>

{#if dev}
	<div class="debug-panel">
		<div class="debug-title">Overlay Stack ({overlays.length})</div>
		<div class="debug-item {overlays.length === 0 ? 'active' : ''}">0: feed</div>
		{#each overlays as overlay, i}
			<div class="debug-item {i === overlays.length - 1 ? 'active' : ''}">
				{i + 1}: {overlay.type} <span class="debug-id">({overlay.id})</span>
			</div>
		{/each}
	</div>
{/if}

<ReloadPrompt />

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		background: #f4f5f7;
		color: #1a1a1a;
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

	.debug-panel {
		position: fixed;
		bottom: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.85);
		color: #00ffcc;
		padding: 12px 16px;
		border-radius: 8px;
		font-family: monospace;
		font-size: 13px;
		z-index: 10000;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		backdrop-filter: blur(4px);
		pointer-events: none;
	}

	.debug-title {
		color: #fff;
		font-weight: bold;
		margin-bottom: 8px;
		border-bottom: 1px solid rgba(255,255,255,0.2);
		padding-bottom: 4px;
	}

	.debug-item {
		margin-bottom: 4px;
		opacity: 0.5;
	}

	.debug-item.active {
		opacity: 1;
		color: #fff;
		font-weight: bold;
	}

	.debug-id {
		color: #888;
		font-size: 0.9em;
	}
</style>
