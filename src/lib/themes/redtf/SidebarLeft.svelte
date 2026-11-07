<script lang="ts">
	import { resolve } from '$app/paths';
	import { feed, openFeedTab, type FeedName } from '$lib/feed.svelte';
	import { prefetchFeed } from '$lib/feedCache';
	import { drawerSwipe, provideDrawer } from '$lib/drawerSwipe';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { reducedMotion } from '$lib/motion';
	import { getProfilePath, openFeed, openProfile, openSettings } from '$lib/navigation';
	import { startWriting } from '../dtf2022/actions.svelte';
	import { clickOnKey } from '../dtf2022/a11y';
	import { sidebar } from '../dtf2022/sidebar.svelte';
	import { Button } from '../dtf2022/ui';
	import { pushDrawer } from './pushDrawer';
	import { themeSettings } from './themeSettings.svelte';

	const feeds: { id: FeedName; label: string; icon: string }[] = [
		{ id: 'popular', label: 'Популярное', icon: 'ui_sidebar_feed' },
		{ id: 'new', label: 'Свежее', icon: 'ui_sidebar_recent_big' },
		{ id: 'my', label: 'Подписки', icon: 'ui_sidebar_subscriptions' }
	];

	// Темы DTF: открываются как профиль подсайта, ленту отдаёт timeline. id узнаны по /subsite?uri=<адрес>
	const subsites = [
		{ id: 64953, label: 'Игры', image: 'e5348320-b11a-9419-fb85-f7b63e2de194' },
		{ id: 64957, label: 'Кино и сериалы', image: '5d198df0-3ba4-6837-b9c3-ac8c04fb9181' },
		{ id: 87855, label: 'Индустрия', image: 'f488fca4-88d6-c978-d052-4d49a3a62a44' },
		{ id: 64954, label: 'Gamedev', image: '9e71f64c-f452-321b-e24b-901bd6b01757' },
		{ id: 128871, label: 'Жизнь', image: '968a91e7-3a3c-5c79-a0cb-2b3df974a697' }
	];

	let node = $state<HTMLElement>();
	let panel = $state<HTMLElement>();
	let items = $state<HTMLElement>();
	let activeIndex = $derived(feeds.findIndex((item) => item.id === feed.current));

	$effect(() => {
		if (node) return sidebar.attach(node);
	});

	// На смартфоне панель лежит под страницей, а уезжает сама страница (pushDrawer.ts); шире — выдвижная панель поверх, на CSS
	const pushes = () => matchMedia('(max-width: 719px)').matches;
	let push: ReturnType<typeof pushDrawer> | undefined;

	$effect(() => {
		if (!panel || !items) return;
		const drawer = pushDrawer(panel, items);
		push = drawer;
		const stop = provideDrawer({
			width: () => panel?.offsetWidth ?? 0,
			progress: drawer.progress,
			drag: drawer.set,
			settle(open, ms) {
				drawer.animate(open, ms);
				if (open !== sidebar.open) sidebar.toggle();
			}
		});
		return () => {
			stop();
			drawer.reset();
			push = undefined;
		};
	});

	// Кнопка меню и закрытие по ссылке: тот же доезд, что после свайпа (после свайпа он уже идёт, и вызов ничего не меняет)
	$effect(() => {
		const open = sidebar.open;
		if (push && pushes()) push.animate(open, reducedMotion() ? 0 : undefined);
	});

	const closeSwipe = drawerSwipe(() => sidebar.open);

	function onResize() {
		sidebar.closeIfDocked();
		if (!pushes()) push?.reset();
	}

	// Под открытой панелью страница не скроллится
	$effect(() => {
		if (!sidebar.open) return;
		document.body.style.overflow = 'hidden';
		return () => (document.body.style.overflow = '');
	});

	/** В режиме панели переход по любой кнопке или ссылке её закрывает */
	function closeOnNavigate(e: MouseEvent) {
		if ((e.target as Element).closest('button, a')) sidebar.close();
	}
</script>

<svelte:window
	onresize={onResize}
	onkeydown={(e) => {
		if (e.key === 'Escape') sidebar.close();
	}}
/>

<aside
	class={['sidebar-left', { 'sidebar-left--open': sidebar.open, 'sidebar-left--collapsed': sidebar.collapsed }]}
	bind:this={node}
>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="tint" onclick={() => sidebar.close()} {@attach activeTheme.gestures ? closeSwipe : undefined}></div>

	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="panel" onclick={closeOnNavigate} bind:this={panel} {@attach activeTheme.gestures ? closeSwipe : undefined}>
		<!-- Своя обёртка со скроллом: на смартфоне пункты поднимаются из-под ленты отдельно от панели -->
		<div class="panel-scroll" bind:this={items}>
			<div class="panel-header">
				<div class="panel-burger" aria-label="Закрыть меню" role="button" tabindex="0" onclick={() => sidebar.close()} onkeydown={clickOnKey}>
					<svg class="icon" width="24" height="24" aria-hidden="true">
						<use href="/icons.svg#v_menu"></use>
					</svg>
				</div>
				<a href={resolve('/')} class="panel-logo" aria-label="re:DTF — на главную" onclick={openFeed}>
					<svg class="icon" height="50" width="128" aria-hidden="true">
						<use href="/reIcons.svg#redtf_logo"></use>
					</svg>
				</a>
			</div>

			<div class="sidebar-top">
				<nav class="feed-switcher" aria-label="Ленты" style:--i={activeIndex}>
					<!-- Подсветка вкладки одна на всех: при выборе она переезжает на новое место -->
					<span class="feed-indicator" aria-hidden="true"></span>
					{#each feeds as item (item.id)}
						<button
							class={['switch-button', { active: feed.current === item.id }]}
							aria-current={feed.current === item.id ? 'page' : undefined}
							onpointerenter={() => prefetchFeed(item.id)}
							onfocus={() => prefetchFeed(item.id)}
							onclick={() => openFeedTab(item.id)}
						>
							<svg height="24" width="24" class="icon" aria-hidden="true">
								<use href="/icons.svg#{item.icon}"></use>
							</svg>
							<span class="label">{item.label}</span>
						</button>
					{/each}
				</nav>

				<div class={['sidebar-write', { 'sidebar-write--desktop': themeSettings.createButtonPos === 'sidebar' }]}>
					<Button label="Новая запись" fullWidth onclick={startWriting} />
				</div>

				<nav class="subsites-switcher" aria-label="Темы">
					{#each subsites as subsite (subsite.label)}
						<a class="switch-button" href={resolve(getProfilePath(subsite.id) as any)} onclick={(e) => openProfile(e, subsite.id)}>
							<img
								height="24"
								width="24"
								class="icon"
								alt=""
								src="https://leonardo.osnova.io/{subsite.image}/-/scale_crop/64x64/-/format/webp/"
							/>
							<span class="label">{subsite.label}</span>
						</a>
					{/each}
				</nav>
			</div>

			<div class="sidebar-bottom">
				<div class="sidebar-footer">
					<div class="sidebar-footer__links">
						<a href={resolve('/settings')} onclick={openSettings}>Настройки</a>
						<a href="{resolve('/settings')}?page=about" onclick={(e) => openSettings(e, 'about')}>О проекте</a>
						<a href="https://github.com/re-dtf" target="_blank" rel="noreferrer">Наш Github</a>
						<a href="{resolve('/settings')}?page=help" onclick={(e) => openSettings(e, 'help')}>Поддержать развитие</a>
						<span>Правила DTF</span>
						<a href="{resolve('/settings')}?page=about&section=documents" onclick={(e) => openSettings(e, 'about', 'documents')}>Правовая информация</a>
						<a href="https://github.com/re-dtf/client/issues" target="_blank" rel="noreferrer">Сообщить о проблеме</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</aside>

<style>
	.sidebar-left {
		width: 100%;
		max-width: var(--sidebar-left-width);
		min-width: 0;
		flex-shrink: 0;
		overflow: hidden;

		/* Липкая панель со своим скроллом */
		position: sticky;
		top: var(--header-height);
		height: calc(100vh - var(--header-height));
		justify-self: start;
		transition: visibility 0.3s;
	}

	.panel {
		width: var(--sidebar-left-width);
		min-width: var(--sidebar-left-width);
		height: 100%;
		transition:
			transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1),
			opacity 0.25s ease;
	}

	.panel-scroll {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
	}

	.panel-burger {
		color: var(--text-primary);
		display: flex;
		align-items: center;
		padding-left: 20px;
		cursor: pointer;
	}

	.panel-burger:hover {
		opacity: 0.6;
	}

	.panel-logo {
		display: flex;
		align-items: center;
		padding-left: 15px;
	}

	/* Шапка и затемнение есть только у выдвижной панели */
	.tint,
	.panel-header,
	.sidebar-write {
		display: none;
	}

	.sidebar-write {
		--btn-height: 48px;
		--btn-font-size: 18px;
		padding: 0 15px;
		margin: 1px 0 20px;
	}

	@media (min-width: 860px) {
		.sidebar-write--desktop {
			display: block;
		}
	}

	.feed-switcher {
		--step: 47px;
		--item-height: 44px;
		position: relative;
		padding: 12px 10px;
	}

	.feed-indicator {
		position: absolute;
		top: 12px;
		left: 10px;
		right: 10px;
		height: var(--item-height);
		border-radius: 8px;
		background: var(--bg-card);
		translate: 0 calc(var(--i) * var(--step));
		transition: translate 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
	}

	.subsites-switcher {
		padding: 12px 10px 48px 10px;
	}

	.switch-button {
		position: relative;
		color: inherit;
		display: flex;
		align-items: center;
		height: 44px;
		font-size: 16px;
		cursor: pointer;
		margin-bottom: 3px;
		border-radius: 8px;
		padding: 0 10px;
		width: 100%;
		transition:
			background-color 0.2s ease,
			scale 0.15s cubic-bezier(0.165, 0.84, 0.44, 1);
	}

	.switch-button:hover {
		background: var(--bg-sidebar-hover);
	}

	.switch-button:active {
		scale: 0.97;
	}

	.switch-button .icon {
		margin-right: 12px;
		border-radius: 6px;
		transition: color 0.3s ease;
	}

	.switch-button .label {
		font-size: 16px;
		line-height: 16px;
		font-weight: 400;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 111px;
	}

	/* Фон активной вкладки рисует переезжающая подсветка */
	.switch-button.active,
	.switch-button.active:hover {
		background: none;
	}

	.switch-button.active .icon {
		color: var(--color-accent);
	}

	.sidebar-bottom {
		margin-top: auto;
		padding-top: 24px;
	}

	.sidebar-footer {
		padding: 5px 20px 11px;
	}

	.sidebar-footer__links {
		display: flex;
		flex-wrap: wrap;
		gap: 5px 12px;
		font-size: 14px;
		line-height: 23px;
		color: var(--text-secondary);
	}

	.sidebar-footer__links > :hover {
		color: var(--text-hover);
	}

	/* Свёрнутая бургером колонка на десктопе */
	@media (min-width: 860px) {
		.sidebar-left--collapsed {
			visibility: hidden;
			pointer-events: none;
		}

		.sidebar-left--collapsed .panel {
			transform: translateX(-100%);
			opacity: 0;
		}
	}

	/* Выдвижная панель: у DTF колонка уходит ≤859px, на странице профиля — ≤1219px */
	@media (max-width: 859px) {
		.sidebar-left {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			max-width: none;
			height: 100%;
			z-index: 110;
			overflow: visible;
			visibility: hidden;
			pointer-events: none;
			transition: visibility 0.3s;
		}

		.sidebar-left--open {
			visibility: visible;
			pointer-events: auto;
			transition: none;
		}

		.tint {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100%;
			z-index: 1;
			background: var(--bg-tint-overlay);
			opacity: 0;
			pointer-events: auto;
			transition: opacity 0.3s ease;
		}

		.sidebar-left--open .tint {
			opacity: 1;
		}

		.panel {
			position: relative;
			z-index: 2;
			width: 80%;
			max-width: 300px;
			min-width: 0;
			background: var(--bg-main);
			transform: translateX(-100%);
			opacity: 1;
			pointer-events: auto;
			transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
		}

		.sidebar-left--open .panel {
			transform: translateX(0);
		}

		.panel-header {
			display: flex;
			flex-shrink: 0;
			height: var(--header-height, 60px);
			min-height: 60px;
		}

		.sidebar-write {
			display: block;
		}

		.feed-switcher {
			--step: 51px;
			--item-height: 48px;
		}

		.switch-button {
			height: 48px;
			font-size: 18px;
		}

		.switch-button .label {
			font-size: 18px;
			line-height: 18px;
			max-width: 180px;
		}
	}

	/*
	 * Смартфон: панель лежит под страницей, шапка остаётся на месте, а страница уезжает вправо (pushDrawer.ts ставит сдвиг
	 * и видимость панели). Узла у колонки нет: панель и ловушка касаний встают рядом со страницей, панель под ней, ловушка над ней.
	 * position: fixed у колонки остаётся: по нему sidebar.svelte.ts узнаёт режим панели
	 */
	@media (max-width: 719px) {
		.sidebar-left {
			display: contents;
		}

		.sidebar-left .panel {
			position: fixed;
			top: var(--header-height);
			bottom: 0;
			left: 0;
			z-index: 1;
			width: min(80vw, 300px);
			max-width: none;
			height: auto;
			visibility: hidden;
			background: var(--bg-sidebar-deep);
			transform: none;
			transition: none;
		}

		.panel-scroll {
			transform-origin: 0 50%;
		}

		/* Шапка страницы остаётся на экране: своей шапки панели не нужно */
		.sidebar-left .panel-header {
			display: none;
		}

		/* Касание по уехавшей странице закрывает панель */
		.sidebar-left .tint {
			display: none;
		}

		.sidebar-left--open .tint {
			display: block;
			top: var(--header-height);
			left: min(80vw, 300px);
			width: auto;
			height: auto;
			right: 0;
			bottom: 0;
			z-index: 3;
			visibility: visible;
			background: none;
			opacity: 1;
			transition: none;
		}

		/* Свайп влево по панели и по странице закрывает панель; прокрутка панели по вертикали остаётся браузеру */
		:global(.app[data-gestures]) .panel {
			touch-action: pan-y pinch-zoom;
		}

		:global(.app[data-gestures]) .tint {
			touch-action: none;
		}

		.panel-burger,
		.panel-logo {
			padding-left: 16px;
		}

		.panel-logo .icon {
			width: 95px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sidebar-left,
		.tint,
		.panel {
			transition: none !important;
		}
	}
</style>
