<script lang="ts">
	import ThemeLoader, { preloadThemeComponent } from '$lib/themes/ThemeLoader.svelte';
	import PostOverlay from '$lib/components/PostOverlay.svelte';
	import ProfileContent from '$lib/components/ProfileContent.svelte';
	import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';
	import LoginOverlay from '$lib/components/LoginOverlay.svelte';
	import NotificationsContent from '$lib/components/NotificationsContent.svelte';
	import EditorOverlay from '$lib/components/overlays/EditorOverlay.svelte';
	import LightboxOverlay from '$lib/components/overlays/LightboxOverlay.svelte';
	import ModalShell from '$lib/components/overlays/ModalShell.svelte';
	import Welcome from '$lib/components/Welcome.svelte';
	import { dotsAtRest, hideSplash, holdSplash, introDone, showWelcomeBackdrop } from '$lib/splash';
	import { pageReady } from '$lib/ready';
	import { setupCompleted } from '$lib/storage/setup.svelte';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { dev } from '$app/env';
	import type { ThemeComponents } from '$lib/themes/contract';
	import { cleanupHangingBio } from '$lib/api/sources/bio-auth';
	import { startTracking, type TickContext } from '$lib/storage/stats.svelte';
	
	import '../app.css';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { play, playChildren, reducedMotion } from '$lib/motion';
	import { feed } from '$lib/feed.svelte';
	import { loadThemeStyles, themeSettingsSchema } from '$lib/themes/registry';
	import { activeThemeSettings } from '$lib/themes/settings.svelte';
	
	let { children } = $props();
	let showWelcome = $state(false);

	// Компонент темы, который окно должно загрузить до показа (иначе оно мелькает спиннером)
	const MODAL_COMPONENT: Partial<Record<App.OverlayData['type'], keyof ThemeComponents>> = {
		login: 'LoginModal',
		editor: 'EditorScreen'
	};

	// Закрытие страницы-оверлея. Svelte не уничтожает элемент, пока идёт переход, поэтому короткий
	// переход переносит размонтирование (тысячи узлов поста) на кадр позже показа ленты.
	// Анимации ухода у страниц нет: лента под ними показывается сразу и встала бы рядом.
	function deferDestroy(node: HTMLElement) {
		node.style.display = 'none';
		return { duration: 1 };
	}
	
	// Геометрия страницы, которую закрывают: снимается до того, как DOM поменяет слои
	let leaving: { layer: string; rect: DOMRect } | undefined;

	/**
	 * Закрытие страницы с анимацией темы (`pageOut`): страница остаётся на месте, но «прилипает» к окну, пока тает поверх ленты,
	 * которая проявляется под ней. Без анимации темы работает короткий `deferDestroy`.
	 */
	function leavePage(node: HTMLElement) {
		const anim = activeTheme.motion?.pageOut;
		const screen = node.firstElementChild as HTMLElement | null;
		const from = leaving && leaving.layer === node.dataset.layer ? leaving.rect : undefined;
		if (!anim || reducedMotion() || !screen || !from?.height) return deferDestroy(node);

		// Слой ограничен экраном (длинная страница с размытием иначе рендерилась бы целиком): прокруткой внутри него показываем ту же часть
		const top = Math.max(from.top, 0);
		Object.assign(screen.style, { position: 'fixed', top: `${top}px`, left: `${from.left}px`, width: `${from.width}px`, height: `${innerHeight - top}px`, overflow: 'hidden', margin: '0', zIndex: '90', pointerEvents: 'none' });
		screen.scrollTop = top - from.top;
		screen.animate(anim.keyframes, { duration: anim.duration, easing: anim.easing, fill: 'forwards' });
		return { duration: anim.duration };
	}

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
	let previousDepth = 0;

	$effect.pre(() => {
		// Save scroll of the outgoing layer before DOM hides it
		if (activeScrollId !== previousScrollId) {
			scrollPositions.set(previousScrollId, window.scrollY);
			const outgoing = document.querySelector(`[data-layer="${previousScrollId}"]`)?.firstElementChild;
			leaving = outgoing ? { layer: previousScrollId, rect: outgoing.getBoundingClientRect() } : undefined;
		}
	});

	$effect(() => {
		// Restore scroll of the incoming layer after DOM shows it
		if (activeScrollId !== previousScrollId) {
			if (activeScrollId === '__feed__' && feed.consumeScrollReset()) {
				scrollPositions.set('__feed__', 0);
			}
			const savedScroll = scrollPositions.get(activeScrollId) || 0;
			const layer = activeScrollId;
			const closing = overlays.length < previousDepth;
			previousScrollId = layer;
			// Сразу, до первой отрисовки слоя: иначе на кадр виден верх страницы. После tick позиция ставится ещё раз —
			// SvelteKit при возврате по истории прокручивает сам и может перебить
			window.scrollTo({ top: savedScroll, left: 0, behavior: 'instant' });
			tick().then(() => {
				window.scrollTo({ top: savedScroll, left: 0, behavior: 'instant' });

				// Слои сменяются мгновенно, поэтому новый проявляется, а не выскакивает.
				// На проскролленной ленте сдвиг многотысячепиксельного слоя рвёт кадры — берём pageIn (только прозрачность)
				const anim = closing && savedScroll < 300 ? (activeTheme.motion?.pageBack ?? activeTheme.motion?.pageIn) : activeTheme.motion?.pageIn;
				const target = document.querySelector(`[data-layer="${layer}"]`);
				if (target) playChildren(target, anim);




			});
		}
		previousDepth = overlays.length;
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
	
	// Ползунки темы выставляют CSS-переменные корня (инлайн-стиль сильнее стилей темы)
	$effect(() => {
		const values = activeThemeSettings().value;
		const vars: Record<string, string> = {};
		for (const field of themeSettingsSchema(activeTheme.id)) {
			if (field.type === 'slider') Object.assign(vars, field.cssVars(Number(values[field.key] ?? field.default)));
		}
		const style = document.documentElement.style;
		for (const [name, value] of Object.entries(vars)) style.setProperty(name, value);
		return () => Object.keys(vars).forEach((name) => style.removeProperty(name));
	});

	onMount(() => {
		cleanupHangingBio(true);
		const stopTracking = startTracking(() => statsContext);

		// Заставка из app.html: тем, кто здесь впервые, она переходит в приветствие, остальным просто растворяется
		// Заставка нужна только при первом входе для приветствия; при повторных входах сразу убираем её из DOM
		if (setupCompleted.value) {
			document.getElementById('splash')?.remove();
		} else {
			(async () => {
				await introDone();
				// Под заставкой должна быть готовая лента, а не спиннеры; точки логотипа пока прыгают как индикатор загрузки
				if (page.route.id === '/') await holdSplash(pageReady());
				await dotsAtRest();
				showWelcomeBackdrop();
				showWelcome = true;
			})();
		}

		// Пока пользователь смотрит ленту, догружаем то, что откроется следующим: пост не должен начинаться со спиннера компонента
		const idle = (window.requestIdleCallback ?? setTimeout)(() => {
			for (const name of ['Post', 'Comments', 'Profile', 'Notifications'] as const) preloadThemeComponent(activeTheme.chain, name);
		});

		return () => {
			stopTracking();
			(window.cancelIdleCallback ?? clearTimeout)(idle);
		};
	});
</script>

<svelte:body style:overflow={hasModalActive || showWelcome ? 'hidden' : 'auto'} />


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

<div class="app" inert={showWelcome}>
	<ThemeLoader componentName="Header" />

	<ThemeLoader componentName="MainLayout">
		<!-- display: contents — обёртки не должны ломать раскладку темы (flex/grid в MainLayout) -->
		<div data-layer="__feed__" style:display={topmostPageOverlayIndex >= 0 ? 'none' : 'contents'}>
			{@render children()}
		</div>

		{#each overlays as overlay, index (overlay.id)}
			{#if overlay.presentation === 'page'}
				<div class="overlay-wrapper" data-layer={overlay.id} style:display={index < topmostPageOverlayIndex ? 'none' : 'contents'} out:leavePage|global>
					{@render overlayContent(overlay)}
				</div>
			{/if}
		{/each}
	</ThemeLoader>

	{#each overlays as overlay, index (overlay.id)}
		{#if overlay.presentation === 'modal'}
			<ModalShell {index} preload={MODAL_COMPONENT[overlay.type]}>
				{@render overlayContent(overlay)}
			</ModalShell>
		{:else if overlay.presentation === 'fullscreen'}
			{@render overlayContent(overlay)}
		{/if}
	{/each}
</div>

{#if showWelcome}
	<Welcome ondone={() => (showWelcome = false)} />
{/if}

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
