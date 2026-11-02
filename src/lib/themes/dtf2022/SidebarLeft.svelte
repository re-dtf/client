<script lang="ts">
	import { resolve } from '$app/paths';
	import { feed, openFeedTab, type FeedName } from '$lib/feed.svelte';
	import { openFeed, openOverlay } from '$lib/navigation';
	import { clickOnKey } from './a11y';
	import { sidebar } from './sidebar.svelte';

	const feeds: { id: FeedName; label: string; icon: string }[] = [
		{ id: 'popular', label: 'Популярное', icon: 'ui_sidebar_feed' },
		{ id: 'new', label: 'Свежее', icon: 'ui_sidebar_recent_big' },
		{ id: 'my', label: 'Подписки', icon: 'ui_sidebar_subscriptions' }
	];

	// ponytail: темы пока статичные — в API нет ленты подсайта
	const subsites = [
		{ label: 'Игры', image: 'e5348320-b11a-9419-fb85-f7b63e2de194' },
		{ label: 'Кино и сериалы', image: '5d198df0-3ba4-6837-b9c3-ac8c04fb9181' },
		{ label: 'Индустрия', image: 'f488fca4-88d6-c978-d052-4d49a3a62a44' },
		{ label: 'Gamedev', image: '9e71f64c-f452-321b-e24b-901bd6b01757' },
		{ label: 'Жизнь', image: '968a91e7-3a3c-5c79-a0cb-2b3df974a697' }
	];

	let node = $state<HTMLElement>();

	$effect(() => {
		if (node) return sidebar.attach(node);
	});

	// Под открытой панелью страница не скроллится
	$effect(() => {
		if (!sidebar.open) return;
		document.body.style.overflow = 'hidden';
		return () => (document.body.style.overflow = '');
	});

	function openSettings(e: MouseEvent) {
		e.preventDefault();
		openOverlay({ type: 'settings' });
	}

	/** В режиме панели переход по любой кнопке или ссылке её закрывает */
	function closeOnNavigate(e: MouseEvent) {
		if ((e.target as Element).closest('button, a')) sidebar.close();
	}
</script>

<svelte:window
	onresize={() => sidebar.closeIfDocked()}
	onkeydown={(e) => {
		if (e.key === 'Escape') sidebar.close();
	}}
/>

<aside
	class={['sidebar-left', { 'sidebar-left--open': sidebar.open, 'sidebar-left--collapsed': sidebar.collapsed }]}
	bind:this={node}
>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="tint" onclick={() => sidebar.close()}></div>

	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="panel" onclick={closeOnNavigate}>
		<div class="panel-header">
			<div class="panel-burger" aria-label="Закрыть меню" role="button" tabindex="0" onclick={() => sidebar.close()} onkeydown={clickOnKey}>
				<svg width="24" height="24" aria-hidden="true">
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
			<nav class="feed-switcher" aria-label="Ленты">
				{#each feeds as item (item.id)}
					<button
						class={['switch-button', { active: feed.current === item.id }]}
						aria-current={feed.current === item.id ? 'page' : undefined}
						onclick={() => openFeedTab(item.id)}
					>
						<svg height="24" width="24" class="icon" aria-hidden="true">
							<use href="/icons.svg#{item.icon}"></use>
						</svg>
						<span class="label">{item.label}</span>
					</button>
				{/each}
			</nav>

			<nav class="subsites-switcher" aria-label="Темы">
				{#each subsites as subsite (subsite.label)}
					<button class="switch-button">
						<img
							height="24"
							width="24"
							class="icon"
							alt=""
							src="https://leonardo.osnova.io/{subsite.image}/-/scale_crop/64x64/-/format/webp/"
						/>
						<span class="label">{subsite.label}</span>
					</button>
				{/each}
			</nav>
		</div>

		<div class="sidebar-bottom">
			<div class="sidebar-footer">
				<div class="sidebar-footer__links">
					<a href={resolve('/settings')} onclick={openSettings}>Настройки</a>
					<!-- span — для этих пунктов пока нет страниц -->
					<span>О проекте</span>
					<a href="https://github.com/re-dtf" target="_blank" rel="noreferrer">Наш Github</a>
					<span>Поддержать развитие</span>
					<span>Правила DTF</span>
					<span>Правовая информация</span>
					<a href="https://github.com/re-dtf/client/issues" target="_blank" rel="noreferrer">Сообщить о проблеме</a>
				</div>
			</div>
		</div>
	</div>
</aside>

<style>
	.sidebar-left {
		width: 100%;
		max-width: var(--sidebar-left-width);
		flex-shrink: 0;

		/* Липкая панель со своим скроллом */
		position: sticky;
		top: var(--header-height);
		height: calc(100vh - var(--header-height));
		justify-self: start;
	}

	.panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
	}

	.panel-burger {
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
	.panel-header {
		display: none;
	}

	.feed-switcher {
		padding: 12px 10px;
	}

	.subsites-switcher {
		padding: 12px 10px 48px 10px;
	}

	.switch-button {
		display: flex;
		align-items: center;
		height: 44px;
		font-size: 16px;
		cursor: pointer;
		margin-bottom: 3px;
		border-radius: 8px;
		padding: 0 10px;
		width: 100%;
	}

	.switch-button:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	.switch-button .icon {
		margin-right: 12px;
		border-radius: 6px;
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

	.switch-button.active {
		background: #fff;
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

	/* Свёрнутая бургером колонка; в режиме панели ниже это правило перекрывается */
	.sidebar-left--collapsed {
		display: none;
	}

	/* Выдвижная панель: у DTF колонка уходит ≤859px, на странице профиля — ≤1219px */
	@media (max-width: 859px) {
		.sidebar-left {
			position: fixed;
			top: 0;
			left: 0;
			width: 80%;
			max-width: 300px;
			height: 100%;
			z-index: 110;
			display: none;
		}

		.sidebar-left--open {
			display: block;
		}

		.tint {
			display: block;
			position: absolute;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100%;
			z-index: 1;
			background: rgba(0, 0, 0, 0.6);
		}

		.panel {
			position: relative;
			z-index: 2;
			background: var(--bg-main);
		}

		.panel-header {
			display: flex;
			flex-shrink: 0;
			height: var(--header-height);
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

	@media (max-width: 719px) {
		.panel-burger,
		.panel-logo {
			padding-left: 16px;
		}

		.panel-logo .icon {
			width: 95px;
		}
	}
</style>
