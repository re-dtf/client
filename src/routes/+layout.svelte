<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import PostOverlay from '$lib/components/PostOverlay.svelte';
	import ReloadPrompt from '$lib/components/ReloadPrompt.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	let mounted = $state(false);
	let postActive = $derived($page.state.selectedPostId !== undefined);
	
	
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
		<div style:display={postActive ? 'none' : undefined}>
			{@render children()}
		</div>
		{#if postActive}
			<PostOverlay />
		{/if}
	</main>
</div>

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
</style>
