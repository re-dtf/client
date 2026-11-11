<script lang="ts">
	import ThemeLoader, { preloadThemeComponent } from '$lib/themes/ThemeLoader.svelte';
	import PostOverlay from '$lib/components/PostOverlay.svelte';
	import ProfileContent from '$lib/components/ProfileContent.svelte';
	import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';
	import TagContent from '$lib/components/TagContent.svelte';
	import SearchContent from '$lib/components/SearchContent.svelte';
	import DraftsContent from '$lib/components/DraftsContent.svelte';
	import EditorOverlay from '$lib/components/overlays/EditorOverlay.svelte';
	import LightboxOverlay from '$lib/components/overlays/LightboxOverlay.svelte';
	import MediaSheet from '$lib/components/MediaSheet.svelte';
	import { preloadLightbox } from '$lib/navigation';
	import ModalShell from '$lib/components/overlays/ModalShell.svelte';
	import Welcome from '$lib/components/Welcome.svelte';
	import { dotsAtRest, hideSplash, holdSplash, introDone, showWelcomeBackdrop } from '$lib/splash';
	import { pageReady } from '$lib/ready';
	import { setupCompleted } from '$lib/storage/setup.svelte';
	import { page } from '$app/state';
	import { onMount, tick, untrack } from 'svelte';
	import { dev } from '$app/env';
	import type { ThemeComponents } from '$lib/themes/contract';
	import { cleanupHangingBio } from '$lib/api/sources/bio-auth';
	import { startTracking, type TickContext } from '$lib/storage/stats.svelte';
	import { settings } from '$lib/storage/settings.svelte';
	import { applyAppIcon } from '$lib/icons';
	import { pwa } from '$lib/pwa.svelte';
	import { initCapacitor, updateStatusBar } from '$lib/capacitor';
	import SafeAreaOverlay from '$lib/components/debug/SafeAreaOverlay.svelte';
	import DebugHud from '$lib/components/debug/DebugHud.svelte';
	
	import '../app.css';
	import { applyPalette, resolvePalette, paletteSelection } from '$lib/themes/palette';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { play, playChildren, reducedMotion } from '$lib/motion';
	import { feed } from '$lib/feed.svelte';
	import { loadThemeStyles, themeSettingsSchema } from '$lib/themes/registry';
	import { activeThemeSettings } from '$lib/themes/settings.svelte';
	import { abortTransition, incomingReady, pageTransition, shouldTransition, startTransition } from '$lib/pageTransition.svelte';
	import { api } from '$lib/api/index.svelte';
	import { swipeBack, swipeBackGesture } from '$lib/swipeBack.svelte';
	
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
		// Страницу увёл свайп «назад»: она уже за краем экрана
		if (swipeBack.swiped(node.dataset.layer)) return deferDestroy(node);
		const anim = activeTheme.motion?.pageOut;
		const screen = node.firstElementChild as HTMLElement | null;
		const from = leaving && leaving.layer === node.dataset.layer ? leaving.rect : undefined;
		if (!anim || reducedMotion() || !screen || !from?.height) return deferDestroy(node);

		// Слой ограничен экраном (длинная страница с размытием иначе рендерилась бы целиком): прокруткой внутри него показываем ту же часть
		const headerEl = document.querySelector('header.header') ?? document.querySelector('header');
		const headerBottom = headerEl ? Math.round(headerEl.getBoundingClientRect().bottom) : 0;
		const top = Math.max(from.top, headerBottom);
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

	// Слой прямо под верхней страницей: его показывают закрытие и свайп «назад», поэтому только он хранит раскладку
	let underLayer = $derived(topmostPageOverlayIndex < 0 ? undefined : (overlays.slice(0, topmostPageOverlayIndex).findLast(o => o.presentation === 'page')?.id ?? '__feed__'));
	const hiddenAs = (layer: string, shown: boolean) => (shown ? undefined : layer === underLayer ? 'under' : 'deep');

	// Модалки и просмотр картинок закрывают страницу целиком: она под ними не прокручивается
	let hasModalActive = $derived(overlays.some(o => o.presentation !== 'page'));
	
	// Scroll Restoration Stack
	let scrollPositions = new Map<string, number>();

	$effect(() => {
		// Очищаем сохранённый скролл для закрытых оверлеев
		const activeIds = new Set(overlays.map((o) => o.id));
		for (const key of scrollPositions.keys()) {
			if (key !== '__feed__' && !activeIds.has(key)) {
				scrollPositions.delete(key);
			}
		}
	});
	let activeScrollId = $derived(overlays.findLast(o => o.presentation === 'page')?.id ?? '__feed__');
	let previousScrollId = '__feed__';
	let previousDepth = 0;
	let lastTransitionedTo = '__feed__';

	// Отложенное восстановление прокрутки для слоёв, чьё содержимое подгружается асинхронно
	let pendingScroll: { layer: string; target: number } | undefined;
	let scrollObserver: ResizeObserver | undefined;
	let cancelPendingTimeout: ReturnType<typeof setTimeout> | undefined;
	let pendingScrollRaf: number | undefined;

	function stopPendingScroll() {
		pendingScroll = undefined;
		if (pendingScrollRaf !== undefined) {
			cancelAnimationFrame(pendingScrollRaf);
			pendingScrollRaf = undefined;
		}
		scrollObserver?.disconnect();
		scrollObserver = undefined;
		if (cancelPendingTimeout) {
			clearTimeout(cancelPendingTimeout);
			cancelPendingTimeout = undefined;
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('wheel', onUserScroll);
			window.removeEventListener('touchmove', onUserScroll);
			window.removeEventListener('keydown', onKeyDown);
		}
	}

	function onUserScroll() {
		stopPendingScroll();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (['PageUp', 'PageDown', 'Space', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.code)) {
			stopPendingScroll();
		}
	}

	function startPendingScroll(layer: string, target: number) {
		stopPendingScroll();
		if (target <= 0 || typeof ResizeObserver === 'undefined' || typeof document === 'undefined') return;

		pendingScroll = { layer, target };

		// Пользователь крутит колесо, свайпает или нажимает клавиши прокрутки — отменяем, чтобы не бороться с жестами
		window.addEventListener('wheel', onUserScroll, { passive: true, once: true });
		window.addEventListener('touchmove', onUserScroll, { passive: true, once: true });
		window.addEventListener('keydown', onKeyDown, { passive: true, once: true });

		cancelPendingTimeout = setTimeout(stopPendingScroll, 10_000);

		scrollObserver = new ResizeObserver(() => {
			if (!pendingScroll || pendingScroll.layer !== activeScrollId) {
				stopPendingScroll();
				return;
			}
			if (pendingScrollRaf !== undefined) return;
			pendingScrollRaf = requestAnimationFrame(() => {
				pendingScrollRaf = undefined;
				if (!pendingScroll || pendingScroll.layer !== activeScrollId) return;
				window.scrollTo({ top: pendingScroll.target, left: 0, behavior: 'instant' });
				if (Math.abs(window.scrollY - pendingScroll.target) <= 1) {
					stopPendingScroll();
				}
			});
		});

		if (document.documentElement) scrollObserver.observe(document.documentElement);
		else if (document.body) scrollObserver.observe(document.body);
	}

	$effect.pre(() => {
		// Save scroll of the outgoing layer before DOM hides it
		if (activeScrollId !== previousScrollId) {
			const scroll = pendingScroll?.layer === previousScrollId ? pendingScroll.target : window.scrollY;
			scrollPositions.set(previousScrollId, scroll);
			const outgoing = document.querySelector(`[data-layer="${previousScrollId}"]`)?.firstElementChild as HTMLElement | null;
			leaving = outgoing ? { layer: previousScrollId, rect: outgoing.getBoundingClientRect() } : undefined;

			untrack(() => {
				const isOpeningPage = overlays.length > previousDepth && overlays[overlays.length - 1]?.presentation === 'page';
				if (isOpeningPage && outgoing && shouldTransition() && lastTransitionedTo !== activeScrollId) {
					lastTransitionedTo = activeScrollId;
					const topOverlay = overlays[overlays.length - 1];
					const isInstant = topOverlay?.type === 'post' && Boolean(api.peekPost(topOverlay.data.postId, topOverlay.data.sourceId));
					startTransition(previousScrollId, activeScrollId, outgoing, isInstant);
				} else if (overlays.length < previousDepth) {
					lastTransitionedTo = '__feed__';
					if (pageTransition.active) abortTransition();

				}
			});
		}
	});

	$effect(() => {
		// Restore scroll of the incoming layer after DOM shows it
		if (activeScrollId !== previousScrollId) {
			// Ленту выбрали из-под страницы: у неё своя прокрутка (или начало, если это была та же лента)
			const feedScroll = activeScrollId === '__feed__' ? feed.consumeScrollTarget() : undefined;
			if (feedScroll !== undefined) scrollPositions.set('__feed__', feedScroll);
			const closing = overlays.length < previousDepth;
			// Пост открыли на комментарии: прокрутку к ним ставит сам пост. При возврате на него — его прокрутка
			const activeOverlay = topmostPageOverlayIndex >= 0 ? overlays[topmostPageOverlayIndex] : undefined;
			if (!closing && activeOverlay?.type === 'post' && (activeOverlay.data.commentId !== undefined || activeOverlay.data.toComments)) {
				scrollPositions.delete(activeScrollId);
			}
			const savedScroll = scrollPositions.get(activeScrollId) || 0;
			const layer = activeScrollId;
			previousScrollId = layer;
			stopPendingScroll();
			// Слой показал свайп «назад»: он уже стоит на месте, анимация появления не нужна
			const landed = swipeBack.land(layer);
			// Сразу, до первой отрисовки слоя: иначе на кадр виден верх страницы. После tick позиция ставится ещё раз —
			// SvelteKit при возврате по истории прокручивает сам и может перебить
			if (Math.abs(window.scrollY - savedScroll) > 1) {
				window.scrollTo({ top: savedScroll, left: 0, behavior: 'instant' });
			}
			tick().then(() => {
				if (Math.abs(window.scrollY - savedScroll) > 1) {
					window.scrollTo({ top: savedScroll, left: 0, behavior: 'instant' });
				}

				// Асинхронный контент (пост, комментарии, профиль) на первом кадре короче экрана и скролл сбивается браузером —
				// доводим его по мере роста страницы
				if (savedScroll > 0 && Math.abs(window.scrollY - savedScroll) > 1) {
					startPendingScroll(layer, savedScroll);
				}

				if (landed) return;

				// Если для входящего слоя запущен универсальный переход, анимацией занимается pageTransition
				if (pageTransition.isIncoming(layer)) {
					// Страницы без Reveal: запускаем их через incomingReady напрямую
					const screen = document.querySelector(`[data-layer="${layer}"]`)?.firstElementChild as HTMLElement | null;
					const hasReveal = Boolean(screen?.querySelector('.reveal'));
					if (screen && !hasReveal) {
						incomingReady(layer, screen);
					}
					return;
				}

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
	
	// Ползунки темы выставляют CSS-переменные корня, флаги — data-атрибуты
	$effect(() => {
		const values = activeThemeSettings().value;
		const vars: Record<string, string> = {};
		for (const field of themeSettingsSchema(activeTheme.id)) {
			if (field.type === 'slider') Object.assign(vars, field.cssVars(Number(values[field.key] ?? field.default)));
		}
		const transparency = values.transparencyEffects !== undefined
			? Boolean(values.transparencyEffects)
			: (typeof window !== 'undefined' ? !window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches : true);
		document.documentElement.dataset.transparency = String(transparency);
		if (activeTheme.id === 'redtf' && Boolean(values.headerBlur)) {
			document.documentElement.dataset.headerBlur = 'true';
		} else {
			delete document.documentElement.dataset.headerBlur;
		}
		if (activeTheme.id === 'redtf' && Boolean(values.mobileBarBlur)) {
			document.documentElement.dataset.mobileBarBlur = 'true';
		} else {
			delete document.documentElement.dataset.mobileBarBlur;
		}
		if (activeTheme.id === 'redtf' && Boolean(values.mobileBarFloating)) {
			document.documentElement.dataset.mobileBarFloating = 'true';
		} else {
			delete document.documentElement.dataset.mobileBarFloating;
		}
		const style = document.documentElement.style;
		for (const [name, value] of Object.entries(vars)) style.setProperty(name, value);
		return () => {
			Object.keys(vars).forEach((name) => style.removeProperty(name));
			delete document.documentElement.dataset.transparency;
			delete document.documentElement.dataset.headerBlur;
			delete document.documentElement.dataset.mobileBarBlur;
			delete document.documentElement.dataset.mobileBarFloating;
		};
	});

	// Настройки читаются реактивно, эффект синхронизирует только DOM и нативную панель.
	$effect(() => {
		const palettes = activeTheme.palettes;
		const selected = paletteSelection(palettes, activeThemeSettings().value.palette);
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const update = () => {
			const palette = resolvePalette(palettes, selected, mql.matches);
			applyPalette(palette);
			updateStatusBar(palette.mode === 'dark').catch(() => {});
		};
		update();
		if (selected === 'auto') {
			mql.addEventListener('change', update);
			return () => mql.removeEventListener('change', update);
		}
	});

	// Отключение верхнего бара в мобильной версии выставляет data-атрибут корня
	$effect(() => {
		const disabled = Boolean(settings.value.disableMobileTopBar);
		document.documentElement.dataset.disableMobileTopBar = String(disabled);
		return () => {
			delete document.documentElement.dataset.disableMobileTopBar;
		};
	});

	// Применение активной иконки приложения (favicon, manifest, capacitor)
	$effect(() => {
		applyAppIcon(settings.value.appIcon ?? 'default', settings.value.customIconData);
	});

	// Прокрутка, на которую слой встанет после закрытия страницы над ним. Ленту могли выбрать из-под страницы:
	// её прокрутку забираем сейчас, тогда восстановление при закрытии возьмёт то же значение
	const backSwipe = swipeBackGesture({
		scrollOf(layer) {
			const feedScroll = layer === '__feed__' ? feed.consumeScrollTarget() : undefined;
			if (feedScroll !== undefined) scrollPositions.set('__feed__', feedScroll);
			return scrollPositions.get(layer) || 0;
		}
	});

	onMount(() => {
		initCapacitor();
		cleanupHangingBio(true);
		pwa.init();
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
			preloadLightbox();
		});

		return () => {
			stopTracking();
			stopPendingScroll();
			(window.cancelIdleCallback ?? clearTimeout)(idle);
		};
	});
</script>

<svelte:body style:overflow={hasModalActive || showWelcome ? 'hidden' : 'auto'} />

{#snippet overlayContent(overlay: App.OverlayState, depth: number = 0)}
	{#if overlay.type === 'post'}
		<PostOverlay {...overlay.data} {depth} />
	{:else if overlay.type === 'profile'}
		<ProfileContent {...overlay.data} />
	{:else if overlay.type === 'settings'}
		<SettingsOverlay {...overlay.data} />
	{:else if overlay.type === 'notifications'}
		<ThemeLoader componentName="Notifications" />
	{:else if overlay.type === 'tag'}
		<TagContent {...overlay.data} />
	{:else if overlay.type === 'search'}
		<SearchContent {...overlay.data} />
	{:else if overlay.type === 'drafts'}
		<DraftsContent />
	{:else if overlay.type === 'login'}
		<ThemeLoader componentName="LoginModal" />
	{:else if overlay.type === 'editor'}
		<EditorOverlay {...overlay.data} />
	{:else if overlay.type === 'lightbox'}
		<LightboxOverlay {...overlay.data} />
	{/if}
{/snippet}

<div class="app" inert={showWelcome} data-gestures={activeTheme.gestures || undefined} {@attach activeTheme.gestures ? backSwipe : undefined}>
	<ThemeLoader componentName="Header" />

	<ThemeLoader componentName="MainLayout">
		<!-- display: contents — обёртки не должны ломать раскладку темы (flex/grid в MainLayout) -->
		<div
			class="layer"
			data-layer="__feed__"
			data-hidden={hiddenAs('__feed__', pageTransition.isOutgoing('__feed__') || topmostPageOverlayIndex < 0 || swipeBack.preview === '__feed__')}
		>
			{@render children()}
		</div>

		{#each overlays as overlay, index (overlay.id)}
			{#if overlay.presentation === 'page'}
				<div
					class="layer overlay-wrapper"
					data-layer={overlay.id}
					data-hidden={hiddenAs(overlay.id, pageTransition.isOutgoing(overlay.id) || index >= topmostPageOverlayIndex || swipeBack.preview === overlay.id)}
					style:visibility={pageTransition.isIncoming(overlay.id) && pageTransition.incomingHidden ? 'hidden' : 'visible'}
					out:leavePage|global
				>
					{@render overlayContent(overlay, topmostPageOverlayIndex - index)}
				</div>
			{/if}
		{/each}
	</ThemeLoader>

	{#each overlays as overlay, index (overlay.id)}
		{#if overlay.presentation === 'modal'}
			<ModalShell {index} preload={MODAL_COMPONENT[overlay.type]}>
				{@render overlayContent(overlay, 0)}
			</ModalShell>
		{:else if overlay.presentation === 'fullscreen'}
			{@render overlayContent(overlay, 0)}
		{/if}
	{/each}

	{#if pageTransition.slow}
		<div class="transition-wait">
			<ThemeLoader componentName="Spinner" inline />
		</div>
	{/if}
</div>

{#if showWelcome}
	<Welcome ondone={() => (showWelcome = false)} />
{/if}

{#if settings.value.debugSafeAreaOverlay}
	<SafeAreaOverlay />
{/if}
{#if settings.value.debugHud}
	<DebugHud />
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
<MediaSheet />

<style>
	.app {
		min-height: 100vh;
	}

	.layer {
		display: contents;
	}

	/* Слой прямо под страницей не рисуется и не занимает места, но браузер хранит его раскладку: закрытие страницы
	   показывает его без пересчёта. Из потока он выведен, чтобы его поля не сдвигали страницу; раскладка содержимого
	   при этом не пересчитывается, пока слой скрыт. Слои глубже раскладку не держат: её память на каждый слой не нужна */
	.layer[data-hidden] > :global(*) {
		content-visibility: hidden;
		position: absolute;
	}

	.layer[data-hidden='deep'] {
		display: none;
	}

	@supports not (content-visibility: hidden) {
		.layer[data-hidden] {
			display: none;
		}
	}

	/* Горизонтальный жест по странице — свайп «назад», вертикальный и щипок остаются браузеру */
	.app[data-gestures] .overlay-wrapper > :global(*) {
		touch-action: pan-y pinch-zoom;
	}

	/* Сдвинутая жестом страница вылезает за правый край. Обрезка у body уходит окну и этого не держит: документ становится
	   шире экрана, мобильный браузер раздвигает окно, и фиксированная нижняя панель уезжает за низ. Обрезаем своим элементом */
	.app[data-gestures] {
		overflow-x: clip;
	}

	.transition-wait {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		z-index: 85;
		pointer-events: none;
		animation: transition-wait-in 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) backwards;
	}

	.transition-wait :global(.spinner-wrapper) {
		border-radius: 8px;
		background: var(--bg-modal, #fff);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		padding: 16px;
	}

	@keyframes transition-wait-in {
		from {
			opacity: 0;
			transform: scale(0.85);
		}
		to {
			opacity: 1;
			transform: none;
		}
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
