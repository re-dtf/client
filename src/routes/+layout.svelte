<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import PostOverlay from '$lib/components/PostOverlay.svelte';
	import ProfileContent from '$lib/components/ProfileContent.svelte';
	import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';
	import LoginOverlay from '$lib/components/LoginOverlay.svelte';
	import NotificationsContent from '$lib/components/NotificationsContent.svelte';
	import EditorOverlay from '$lib/components/overlays/EditorOverlay.svelte';
	import LightboxOverlay from '$lib/components/overlays/LightboxOverlay.svelte';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { dev } from '$app/env';
	import { closeOverlay } from '$lib/navigation';
	import { cleanupHangingBio } from '$lib/api/sources/bio-auth';
	import { startTracking, type TickContext } from '$lib/storage/stats.svelte';
	
	import '../app.css';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { loadThemeStyles } from '$lib/themes/registry';
	
	let { children } = $props();
	let isFirstVisit = $state(false);
	
	let overlays = $derived(page.state.overlays || []);

	// Для статистики: где пользователь и какой пост у него открыт (под верхним оверлеем посты не считаются)
	let statsContext = $derived.by((): TickContext => {
		const theme = activeTheme.id;
		const top = overlays.findLast(o => o.presentation === 'page');
		if (top?.type === 'post') return { area: 'post', theme, post: `${top.data.sourceId ?? 'dtf'}_${top.data.postId}` };
		if (top) return { area: top.type === 'profile' ? 'profile' : 'other', theme };

		const route = page.route.id ?? '';
		if (route === '/') return { area: 'feed', theme };
		if (route.startsWith('/post/')) return { area: 'post', theme, post: `${page.url.searchParams.get('source') || 'dtf'}_${page.params.id}` };
		return { area: route.startsWith('/u/') ? 'profile' : 'other', theme };
	});

	// Determine the topmost 'page' overlay. Layers beneath it should be hidden.
	let topmostPageOverlayIndex = $derived(overlays.findLastIndex(o => o.presentation === 'page'));

	// Модалки и просмотр картинок закрывают страницу целиком: она под ними не прокручивается
	let hasModalActive = $derived(overlays.some(o => o.presentation !== 'page'));
	
	// Scroll Restoration Stack
	let scrollPositions = new Map<string, number>();
	let activeScrollId = $derived(overlays.findLast(o => o.presentation === 'page')?.id ?? '__feed__');
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

	// Стили темы подключаются лениво. data-theme ставится после загрузки стилей, чтобы не было
	// вспышки без оформления. Значение — цепочка тем ("my-fork dtf2022"), стили ищут тему через [data-theme~="..."]
	$effect(() => {
		const chain = activeTheme.chain;
		let outdated = false;
		loadThemeStyles(chain).then(() => {
			if (!outdated) document.documentElement.setAttribute('data-theme', chain.join(' '));
		});
		return () => (outdated = true);
	});
	
	onMount(() => {
		cleanupHangingBio(true);
		const stopTracking = startTracking(() => statsContext);
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

		return stopTracking;
	});
</script>

<svelte:body style:overflow={hasModalActive ? 'hidden' : 'auto'} />



{#snippet overlayContent(overlay: App.OverlayState)}
	{#if overlay.type === 'post'}
		<PostOverlay {...overlay.data} />
	{:else if overlay.type === 'profile'}
		<ProfileContent {...overlay.data} />
	{:else if overlay.type === 'settings'}
		<SettingsOverlay />
	{:else if overlay.type === 'notifications'}
		<NotificationsContent />
	{:else if overlay.type === 'login'}
		<LoginOverlay />
	{:else if overlay.type === 'editor'}
		<EditorOverlay {...overlay.data} />
	{:else if overlay.type === 'lightbox'}
		<LightboxOverlay {...overlay.data} />
	{/if}
{/snippet}

<div class="app">
	<ThemeLoader componentName="Header" />

	<ThemeLoader componentName="MainLayout">
		<!-- display: contents — обёртки не должны ломать раскладку темы (flex/grid в MainLayout) -->
		<div style:display={topmostPageOverlayIndex >= 0 ? 'none' : 'contents'}>
			{@render children()}
		</div>

		{#each overlays as overlay, index (overlay.id)}
			{#if overlay.presentation === 'page'}
				<div class="overlay-wrapper"style:display={index < topmostPageOverlayIndex ? 'none' : 'contents'}>
					{@render overlayContent(overlay)}
				</div>
			{/if}
		{/each}
	</ThemeLoader>

	{#each overlays as overlay, index (overlay.id)}
		{#if overlay.presentation === 'modal'}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="overlay-wrapper is-modal"
				style:z-index={100 + index}
				onclick={(e) => {
					if (e.target === e.currentTarget) closeOverlay();
				}}
			>
				{@render overlayContent(overlay)}
			</div>
		{:else if overlay.presentation === 'fullscreen'}
			{@render overlayContent(overlay)}
		{/if}
	{/each}
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
	/* Темы настраивают фон модалок через CSS-переменные (см. dtf2022/theme.css) */
	.overlay-wrapper.is-modal {
		position: fixed;
		inset: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background: var(--modal-backdrop, rgba(0, 0, 0, 0.4));
		backdrop-filter: var(--modal-backdrop-filter, blur(4px));
		-webkit-backdrop-filter: var(--modal-backdrop-filter, blur(4px));
		padding: var(--modal-padding, 20px);
		overflow-y: var(--modal-overflow-y, visible);
		box-sizing: border-box;
	}

	.app {
		min-height: 100vh;
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
