<script lang="ts">
	import { resolve } from '$app/paths';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { pushOverlay } from '$lib/overlays';

	type Feed = 'popular' | 'new' | 'my';

	const feeds: { id: Feed; label: string; icon: string }[] = [
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

	let activeFeed = $state<Feed>('popular');

	function selectFeed(feed: Feed) {
		// Лента лежит под оверлеями — сначала возвращаемся к ней
		if (page.state.overlays?.length) {
			pushState(resolve('/'), { overlays: [] });
		}
		if (activeFeed === feed) return;
		activeFeed = feed;
		window.dispatchEvent(new CustomEvent('switchFeed', { detail: feed }));
	}

	function openSettings(e: MouseEvent) {
		e.preventDefault();
		pushOverlay('settings', '/settings');
	}

	function syncFeed(e: CustomEvent<Feed>) {
		activeFeed = e.detail;
	}
</script>

<svelte:window onswitchFeed={syncFeed} />

<aside class="sidebar-left">
	<div class="sidebar-top">
		<nav class="feed-switcher" aria-label="Ленты">
			{#each feeds as feed (feed.id)}
				<button
					class={['switch-button', { active: activeFeed === feed.id }]}
					aria-current={activeFeed === feed.id ? 'page' : undefined}
					onclick={() => selectFeed(feed.id)}
				>
					<svg height="24" width="24" class="icon" aria-hidden="true">
						<use href="/icons.svg#{feed.icon}"></use>
					</svg>
					<span class="label">{feed.label}</span>
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
				<!-- ponytail: span — для этих пунктов пока нет страниц -->
				<span>О проекте</span>
				<a href="https://github.com/re-dtf" target="_blank" rel="noreferrer">Наш Github</a>
				<span>Поддержать развитие</span>
				<span>Правила DTF</span>
				<span>Правовая информация</span>
				<a href="https://github.com/re-dtf/client/issues" target="_blank" rel="noreferrer">Сообщить о проблеме</a>
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
		overflow-y: auto;

		display: flex;
		flex-direction: column;
		justify-content: space-between;
		justify-self: start;
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
		margin-top: 24px;
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

	@media (max-width: 859px) {
		.sidebar-left {
			display: none;
		}
	}
</style>
