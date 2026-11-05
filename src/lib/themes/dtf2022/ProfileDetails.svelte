<script module lang="ts">
	export type DetailsPage = 'all' | 'subscribers' | 'subscriptions';
</script>

<script lang="ts">
	import type { CursorData, Profile, ProfileListItem } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import { resolve } from '$app/paths';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import { getProfilePath, openProfile } from '$lib/navigation';
	import { subscriptions } from './actions.svelte';
	import { loadOnVisible } from './loadOnVisible';
	import { formatNumber } from './format';
	import Preloader from './ui/Preloader.svelte';

	/*
	 * Вкладка «Подробнее»: обзор, подписчики, подписки. Рисует три блока сетки профиля:
	 * мобильную панель, колонку со списками и меню «Навигация» справа.
	 */
	let {
		profile,
		page,
		subscribersPromise,
		subscriptionsPromise,
		onNavigate,
		onClose
	}: {
		profile: Profile;
		page: DetailsPage;
		subscribersPromise: Promise<ProfileListItem[]>;
		subscriptionsPromise: Promise<ProfileListItem[]>;
		onNavigate: (page: DetailsPage) => void;
		onClose: () => void;
	} = $props();

	const PAGES: { value: DetailsPage; label: string; icon: string }[] = [
		{ value: 'all', label: 'Обзор', icon: 'v_eye' },
		{ value: 'subscribers', label: 'Подписчики', icon: 'v_followers' },
		{ value: 'subscriptions', label: 'Подписки', icon: 'v_star' }
	];

	let isMe = $derived(profile.id === currentUser.value?.id);

	$effect(() => {
		if (currentUser.value?.id) {
			subscriptions.loadMine(currentUser.value.id);
		}
	});

	// Подписчики приходят порциями и листаются по мере прокрутки; подписки DTF отдаёт целиком
	let subscribers = $state.raw<ProfileListItem[]>([]);
	let subscribersCursor: CursorData | undefined;
	let subscribersHasMore = $state(true);
	let loadingSubscribers = $state(false);
	let subscribersError = $state<string | null>(null);

	async function loadSubscribers() {
		if (loadingSubscribers || !subscribersHasMore) return;
		loadingSubscribers = true;
		subscribersError = null;
		try {
			const result = await api.getProfileSubscribers(profile.id, subscribersCursor);
			subscribers = [...subscribers, ...result.items];
			subscribersHasMore = result.items.length > 0 && result.lastId !== undefined;
			subscribersCursor = subscribersHasMore ? { lastId: result.lastId!, lastSortingValue: result.lastSortingValue ?? 0 } : undefined;
		} catch (e) {
			subscribersError = (e as Error).message;
			subscribersHasMore = false;
		} finally {
			loadingSubscribers = false;
		}
	}

	// Назад: со вложенной страницы к обзору, с обзора — к профилю
	function goBack() {
		if (page === 'all') onClose();
		else onNavigate('all');
	}
</script>

{#snippet personRow(person: ProfileListItem, isMySubscription = false)}
	<div class="subsite-item">
		<a href={resolve(getProfilePath(person.id) as any)} class="subsite-item__main" onclick={(e) => openProfile(e, person.id)}>
			<div class="subsite-item__image" style:background-image={person.avatarUrl ? `url(${person.avatarUrl})` : undefined}></div>
			<div class="subsite-item__label-container">
				<span class="subsite-item__label" title={person.name}>{person.name}</span>
			</div>
		</a>

		{#if person.id !== currentUser.value?.id}
			<!-- В чужих списках и среди подписчиков DTF присылает isSubscribed не про зрителя, поэтому верим только списку своих подписок -->
			{@const was = isMySubscription}
			{@const subscribed = subscriptions.isSubscribed(person.id, was)}
			<button
				type="button"
				class={['subscribe-button', { 'subscribe-button--active': subscribed }]}
				title={subscribed ? 'Отписаться' : 'Подписаться'}
				aria-pressed={subscribed}
				onclick={() => subscriptions.toggle(person.id, was)}
			>
				<span class="subscribe-button__icon">
					<svg height="24" width="24" class="icon" aria-hidden="true"><use href="/icons.svg#v_follow"></use></svg>
				</span>
				<span class="subscribe-button__label">{subscribed ? 'Вы подписаны' : 'Подписаться'}</span>
			</button>
		{/if}
	</div>
{/snippet}

{#snippet header(title: string, count: number | undefined)}
	<div class="island__header">
		<span class="island__title">{title}</span>
		{#if count}<span class="island__counter">{formatNumber(count)}</span>{/if}
	</div>
{/snippet}

{#snippet overview(title: string, count: number | undefined, promise: Promise<ProfileListItem[]>, showAll: string, target: DetailsPage)}
	{#await promise then items}
		{#if items.length > 0}
			{@const isMySubs = isMe && target === 'subscriptions'}
			<div class="island">
				{@render header(title, count)}
				<div class="subsites subsites--columns-2">
					{#each items.slice(0, 6) as person (person.id)}
						{@render personRow(person, isMySubs)}
					{/each}
				</div>
				<button type="button" class="subsites__more" onclick={() => onNavigate(target)}>
					{showAll}
					<svg height="16" width="16" class="icon" aria-hidden="true"><use href="/icons.svg#v_chevron_right"></use></svg>
				</button>
			</div>
		{/if}
	{/await}
{/snippet}

<div class="details-navbar">
	<button type="button" class="details-navbar__button" aria-label="Назад" onclick={goBack}>
		<svg height="24" width="24" class="icon" aria-hidden="true"><use href="/icons.svg#v_back"></use></svg>
	</button>
	<div class="details-navbar__name">{profile.name}</div>
	<button type="button" class="details-navbar__button" aria-label="Закрыть" onclick={onClose}>
		<svg height="24" width="24" class="icon" aria-hidden="true"><use href="/icons.svg#v_close"></use></svg>
	</button>
</div>

<div class="details-content">
	{#if page === 'all'}
		{#if profile.description}
			<div class="island island--description">
				{@render header('Описание', undefined)}
				<div class="details-description">{profile.description}</div>
			</div>
		{/if}
		{@render overview('Подписчики', profile.subscribersCount, subscribersPromise, 'Показать всех', 'subscribers')}
		{@render overview('Подписки', profile.subscriptionsCount, subscriptionsPromise, 'Показать все', 'subscriptions')}
	{:else if page === 'subscribers'}
		<div class="island">
			{@render header('Подписчики', profile.subscribersCount)}
			<div class="subsites">
				{#each subscribers as person (person.id)}
					{@render personRow(person, false)}
				{/each}
			</div>

			{#if subscribersError}
				<p class="details-status">{subscribersError}</p>
			{:else if !subscribersHasMore && !loadingSubscribers && subscribers.length === 0}
				<p class="details-status">Подписчиков пока нет</p>
			{/if}

			{#if subscribersHasMore}
				<div class="details-more" {@attach loadOnVisible(loadSubscribers)}>
					{#if loadingSubscribers}<Preloader />{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="island">
			{@render header('Подписки', profile.subscriptionsCount)}
			{#await subscriptionsPromise}
				<div class="details-more"><Preloader /></div>
			{:then items}
				{#if items.length > 0}
					<div class="subsites">
						{#each items as person (person.id)}
							{@render personRow(person, isMe)}
						{/each}
					</div>
				{:else}
					<p class="details-status">Подписок пока нет</p>
				{/if}
			{/await}
		</div>
	{/if}
</div>

<aside class="details-nav">
	<div class="details-nav__sticky">
		<div class="island">
			{@render header('Навигация', undefined)}
			<div class="nav-tabs">
				{#each PAGES as item (item.value)}
					<button
						type="button"
						class={['nav-tab', { 'nav-tab--active': page === item.value }]}
						aria-current={page === item.value ? 'page' : undefined}
						onclick={() => onNavigate(item.value)}
					>
						<span class="nav-tab__icon">
							<svg height="24" width="24" class="icon" aria-hidden="true"><use href="/icons.svg#{item.icon}"></use></svg>
						</span>
						<span class="nav-tab__label"><span class="nav-tab__text">{item.label}</span></span>
					</button>
				{/each}
			</div>
		</div>
	</div>
</aside>

<style>
	/* Остров: белый блок с заголовком */
	.island {
		--offset-x: var(--island-offset-x, 20px);
		padding: 15px var(--offset-x) 16px;
		border-radius: 8px;
		background-color: var(--bg-card);
		font-size: 16px;
		line-height: 1.5em;
	}

	.island:not(:last-child) {
		margin-bottom: 20px;
	}

	.island--description {
		display: none;
	}

	.island__header {
		display: flex;
		align-items: baseline;
		margin-top: -3px;
		margin-bottom: 16px;
	}

	.island__title {
		margin-right: 8px;
		line-height: 1.5em;
		font-weight: 500;
	}

	.island__counter {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 1.43em;
		white-space: nowrap;
	}

	.details-description {
		overflow-wrap: break-word;
		white-space: pre-wrap;
	}

	/* Списки людей */
	.subsites {
		display: grid;
		margin: -12px 0;
	}

	.subsite-item {
		position: relative;
		display: flex;
		align-items: center;
		min-width: 0;
		padding: 12px 0;
	}

	.subsite-item::before {
		content: '';
		position: absolute;
		top: -1px;
		right: 0;
		left: 48px;
		height: 1px;
		background-color: var(--border-avatar);
	}

	.subsite-item:first-child::before {
		display: none;
	}

	.subsite-item__main {
		display: flex;
		flex: 1 1 0;
		align-items: center;
		min-width: 0;
	}

	.subsite-item__main:not(:last-child) {
		margin-right: 12px;
	}

	/* Кнопка подписки: на широком экране только значок, на узком значок с подписью */
	.subscribe-button {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		height: 34px;
		min-width: 40px;
		border-radius: 8px;
		background-color: var(--bg-card);
		box-shadow: var(--shadow-btn-outline);
		color: var(--text-primary);
		font: inherit;
		font-weight: 500;
		white-space: nowrap;
		user-select: none;
		cursor: pointer;
	}

	.subscribe-button:hover {
		box-shadow: var(--shadow-btn-outline-hover);
	}

	.subscribe-button:active {
		box-shadow: var(--shadow-btn-outline-active);
		transform: translateY(1px);
	}

	.subscribe-button--active .subscribe-button__icon {
		color: var(--color-blue);
	}

	.subscribe-button__icon {
		display: flex;
	}

	.subscribe-button__label {
		display: none;
		padding: 0 16px;
	}

	@media (hover: hover) {
		.subsite-item__main:hover {
			color: var(--text-link);
		}
	}

	.subsite-item__image {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		margin-right: 12px;
		border-radius: 6px;
		background: var(--border-color) no-repeat 50% 50% / cover;
		box-shadow: inset 0 0 0 1px var(--border-avatar);
	}

	.subsite-item__label-container {
		flex: 1 1 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.subsite-item__label {
		font-size: 18px;
		line-height: 1.45em;
		font-weight: 500;
	}

	.subsites__more {
		display: block;
		width: 100%;
		margin: 16px 0 -4px;
		padding: 0;
		color: var(--text-link);
		font: inherit;
		text-align: left;
		user-select: none;
		cursor: pointer;
	}

	.subsites__more:hover {
		color: var(--color-danger);
	}

	.subsites__more .icon {
		display: none;
		margin-left: 9px;
	}

	.details-status {
		padding: 24px 0 8px;
		color: var(--text-muted);
		text-align: center;
	}

	.details-more {
		display: flex;
		justify-content: center;
		min-height: 24px;
		padding-top: 16px;
	}

	/* Меню «Навигация» */
	.details-nav {
		display: none;
	}

	.nav-tabs {
		display: flex;
		flex-direction: column;
		margin: -12px 0 -11px;
	}

	.nav-tab {
		display: flex;
		margin: 0 calc(var(--offset-x) * -1);
		padding: 0 var(--offset-x);
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.nav-tab__icon {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		width: 36px;
		padding-bottom: 3px;
		color: var(--text-subtle);
	}

	.nav-tab__label {
		position: relative;
		display: flex;
		flex: 1 1 0;
		min-width: 0;
		padding: 12px 0 13px;
	}

	.nav-tab__text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Разделитель между пунктами: пропадает вокруг наведённого и активного */
	.nav-tab:not(:first-child) .nav-tab__label::after {
		content: '';
		position: absolute;
		top: -1px;
		left: 0;
		width: 100%;
		height: 1px;
		background-color: var(--border-avatar);
	}

	.nav-tab--active {
		background-color: var(--bg-nav-tab-active);
		font-weight: 500;
		pointer-events: none;
	}

	.nav-tab--active .nav-tab__icon {
		color: var(--text-primary);
	}

	.nav-tab--active .nav-tab__label::after,
	.nav-tab--active + .nav-tab .nav-tab__label::after {
		opacity: 0;
	}

	@media (hover: hover) {
		.nav-tab:hover {
			background-color: var(--bg-nav-tab-hover);
		}

		.nav-tab:hover .nav-tab__label::after,
		.nav-tab:hover + .nav-tab .nav-tab__label::after {
			opacity: 0;
		}
	}

	/* Мобильная панель: только на узких экранах */
	.details-navbar {
		display: none;
	}

	@media (min-width: 1000px) {
		.details-content {
			grid-column: 1;
		}

		.details-nav {
			display: block;
			grid-column: 2;
		}

		.details-nav__sticky {
			position: sticky;
			top: calc(var(--header-height) + 20px);
		}

		.subsites--columns-2 {
			grid-template-columns: repeat(2, 1fr);
			gap: 0 40px;
		}

		.subsites--columns-2 .subsite-item:nth-child(-n + 2)::before {
			display: none;
		}
	}

	@media (max-width: 999px) {
		.details-navbar {
			--offset-x: var(--island-offset-x, 16px);
			position: sticky;
			top: var(--header-height);
			z-index: 2;
			display: flex;
			height: 56px;
			border-bottom: 1px solid var(--border-avatar);
			background-color: var(--bg-card);
		}

		.details-navbar__button {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 0 var(--offset-x);
			border: 0;
			background: none;
			color: inherit;
			cursor: pointer;
		}

		.details-navbar__name {
			flex: 1 1 0;
			align-self: center;
			overflow: hidden;
			font-size: 20px;
			line-height: 28px;
			font-weight: 700;
			text-align: center;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.details-content {
			background-color: var(--bg-card);
		}

		.island {
			border-radius: 0;
		}

		.island:not(:last-child) {
			margin-bottom: 4px;
		}

		.island--description {
			display: block;
		}

		.island__header {
			margin-bottom: 12px;
		}

		.island__title {
			font-size: 24px;
			font-weight: 700;
		}

		.island__counter {
			font-size: 20px;
		}

		.subsite-item {
			padding: 16px 0 17px;
		}

		.subsite-item__label {
			font-size: 16px;
			line-height: 1.5em;
		}

		/* В обзоре на телефоне — три человека, остальных открывает «Показать всех» */
		.subsites--columns-2 .subsite-item:nth-child(n + 4) {
			display: none;
		}

		.subsites__more {
			margin-top: 11px;
			margin-bottom: 0;
		}

		.subsites__more .icon {
			display: inline-block;
		}
	}

	@media (max-width: 859px) {
		.island {
			--offset-x: var(--island-offset-x, 16px);
		}

		.subscribe-button__icon {
			margin-left: 12px;
			margin-right: -8px;
		}

		.subscribe-button__label {
			display: block;
		}
	}
</style>
