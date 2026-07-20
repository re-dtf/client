<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import PostOverlay from '$lib/components/PostOverlay.svelte';
	import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';
	import LoginOverlay from '$lib/components/LoginOverlay.svelte';
	import EditorOverlay from '$lib/components/overlays/EditorOverlay.svelte';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { dev } from '$app/environment';
	import { cleanupHangingBio } from '$lib/api/sources/bio-auth';
	
	import '../app.css';
	// Статические импорты CSS тем оставлены намеренно: 
	// при ленивой загрузке через JS происходило бы FOUC (Flash of Unstyled Content)
	import '$lib/themes/classic/theme.css';
	import '$lib/themes/modern/theme.css';
	import '$lib/themes/dtf2022/theme.css';
	import { themeState } from '$lib/themes/index.svelte.js';
	
	let { children } = $props();
	let isFirstVisit = $state(false);
	
	let overlays = $derived(page.state.overlays || []);
	
	// Determine the topmost 'page' overlay. Layers beneath it should be hidden.
	let topmostPageOverlayIndex = $derived(overlays.findLastIndex(o => o.presentation !== 'modal'));
	
	let hasModalActive = $derived(overlays.some(o => o.presentation === 'modal'));
	
	// Scroll Restoration Stack
	let scrollPositions = new Map<string, number>();
	let activeScrollId = $derived(overlays.findLast(o => o.presentation !== 'modal')?.id ?? '__feed__');
	let previousScrollId = '__feed__';

	$effect.pre(() => {
		// Save scroll of the outgoing layer before DOM hides it
		if (activeScrollId !== previousScrollId) {
			scrollPositions.set(previousScrollId, window.scrollY);
		}
	});

	$effect(() => {
		// Restore scroll of the incoming layer after DOM shows it
		if (activeScrollId !== previousScrollId) {
			const savedScroll = scrollPositions.get(activeScrollId) || 0;
			previousScrollId = activeScrollId;
			tick().then(() => {
				window.scrollTo({ top: savedScroll, left: 0, behavior: 'instant' });
			});
		}
	});

	$effect(() => {
		document.documentElement.setAttribute('data-theme', themeState.value);
	});
	
	onMount(() => {
		cleanupHangingBio(true);
		// Check if the user has completed the first setup
		const firstSetupCompleted = localStorage.getItem('redtf:setup:completed');
		if (!firstSetupCompleted) {
			isFirstVisit = true;
		}

		// Minimum duration for the splash screen
		setTimeout(() => {
			// Fade out the native splash screens
			const normalSplash = document.getElementById('native-splash-normal');
			const firstSplash = document.getElementById('native-splash-first');
			
			if (normalSplash) normalSplash.classList.add('hidden');
			if (firstSplash) firstSplash.classList.add('hidden');
			
			// Remove them from DOM after the 0.25s fade transition finishes
			setTimeout(() => {
				if (normalSplash) normalSplash.remove();
				if (firstSplash) firstSplash.remove();
			}, 300);
		}, isFirstVisit ? 3000 : 1000);
	});
</script>

<svelte:body style:overflow={hasModalActive ? 'hidden' : 'auto'} />



<div class="app">
	<ThemeLoader componentName="Header" />

	<main class="container">
		<div style:display={topmostPageOverlayIndex >= 0 ? 'none' : undefined}>
			{@render children()}
		</div>
		
		{#each overlays as overlay, index (overlay.id)}
			{@const isModal = overlay.presentation === 'modal'}
			{@const isHidden = !isModal && index < topmostPageOverlayIndex}
			
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div 
				class={['overlay-wrapper', { 'is-modal': isModal }]}
				style:display={isHidden ? 'none' : undefined}
				style:z-index={100 + index}
				onclick={(e) => {
					if (isModal && e.target === e.currentTarget) {
						history.back();
					}
				}}
			>
				{#if overlay.type === 'post'}
					<PostOverlay postId={overlay.data.postId} sourceId={overlay.data.sourceId} />
				{:else if overlay.type === 'settings'}
					<SettingsOverlay />
				{:else if overlay.type === 'login'}
					<LoginOverlay />
				{:else if overlay.type === 'editor'}
					<EditorOverlay postId={overlay.data?.postId} />
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
<ThemeLoader componentName="ReloadPrompt" />

<style>



	.overlay-wrapper.is-modal {
		position: fixed;
		inset: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		padding: 20px;
		box-sizing: border-box;
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
