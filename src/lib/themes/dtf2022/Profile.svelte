<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { Post, Profile, ProfileListItem, ProfileSorting as Sorting } from '$lib/api/types';
	import { resolve } from '$app/paths';
	import { getProfilePath, openProfile } from '$lib/overlays';
	import { formatDate, formatNumber, formatRating, plural } from './format';
	import PostCard from './post/PostCard.svelte';
	import Preloader from './ui/Preloader.svelte';

	let {
		profile,
		posts,
		sorting,
		hasMore,
		loadingPosts,
		postsError,
		subscribersPromise,
		subscriptionsPromise,
		onSortingChange,
		loadMore
	}: {
		profile: Profile;
		posts: Post[];
		sorting: Sorting;
		hasMore: boolean;
		loadingPosts: boolean;
		postsError: string | null;
		subscribersPromise: Promise<ProfileListItem[]>;
		subscriptionsPromise: Promise<ProfileListItem[]>;
		onSortingChange: (sorting: Sorting) => void;
		loadMore: () => void;
	} = $props();

	const SORTINGS: { value: Sorting; label: string }[] = [
		{ value: 'popular', label: 'Популярное' },
		{ value: 'new', label: 'Свежее' }
	];

	// ponytail: комментарии и подробности профиля пока открываются на самом DTF
	let externalUrl = $derived(profile.url ?? `https://dtf.ru/id${profile.id}`);

	/** Подгрузка постов, когда низ ленты подъезжает к экрану */
	const loadOnVisible: Attachment<HTMLElement> = (node) => {
		const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: '1000px' });
		observer.observe(node);
		return () => observer.disconnect();
	};
</script>

{#snippet sidebarBlock(title: string, count: number | undefined, promise: Promise<ProfileListItem[]>, grid: boolean, limit: number, showAll: string, showAllUrl: string)}
	{#await promise then items}
		{#if items.length > 0}
			<div class="profile-sidebar-block">
				<div class="profile-sidebar-block__title">
					<span>{title}</span>
					{#if count}
						<span class="profile-sidebar-block__counter">{formatNumber(count)}</span>
					{/if}
				</div>

				<div class={['profile-sidebar-list', { 'profile-sidebar-list--grid': grid }]}>
					{#each items.slice(0, limit) as item (item.id)}
						<a
							href={resolve(getProfilePath(item.id) as any)}
							class="profile-sidebar-list__item"
							title={grid ? item.name : undefined}
							onclick={(e) => openProfile(e, item.id)}
						>
							<img src={item.avatarUrl} class="profile-sidebar-list__image" loading="lazy" alt={grid ? item.name : ''} />
							{#if !grid}
								<div class="profile-sidebar-list__label">{item.name}</div>
							{/if}
						</a>
					{/each}
				</div>

				<a href={showAllUrl} target="_blank" rel="noreferrer" class="profile-sidebar-block__show-all">{showAll}</a>
			</div>
		{/if}
	{/await}
{/snippet}

<div class="profile-section">
	<div class="profile-head">
		<div
			class="profile-head__cover"
			style:background-image={profile.coverUrl ? `url(${profile.coverUrl})` : undefined}
			style:background-position="50% {profile.coverY ?? 50}%"
		></div>

		<div class="profile-head__avatar">
			<div class="profile-avatar" style:background-image={profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined}></div>
		</div>

		<div class="profile-head__title">
			<h1 class="profile-title">
				<span class="profile-title__name">{profile.name}</span>
				{#if profile.isPlus}
					<span class="profile-title__badge" title="Plus">
						<svg height="24" width="24" class="icon" aria-hidden="true">
							<use href="/icons.svg#ui_badge_plus"></use>
						</svg>
					</span>
				{/if}
			</h1>
		</div>

		{#if profile.description}
			<div class="profile-head__description">
				<div class="profile-description">{profile.description}</div>
			</div>
		{/if}

		<!-- сюда потом кнопку подписки вставим -->

		<div class="profile-head__stats profile-stats">
			<div class="profile-stats__row">
				{#if profile.rating}
					<div class={['profile-stats__change', { 'profile-stats__change--positive': profile.rating > 0 }]}>
						{formatRating(profile.rating)}
					</div>
				{/if}
				{#if profile.subscribersCount !== undefined}
					<a href="{externalUrl}/details/subscribers" target="_blank" rel="noreferrer" class="profile-stats__link">
						{formatNumber(profile.subscribersCount)}
						{plural(profile.subscribersCount, ['подписчик', 'подписчика', 'подписчиков'])}
					</a>
				{/if}
			</div>
			{#if profile.createdAt}
				<div class="profile-stats__date">На проекте с {formatDate(profile.createdAt)}</div>
			{/if}
			<a href="{externalUrl}/details" target="_blank" rel="noreferrer" class="profile-stats__details-link">
				<svg height="16" width="16" class="icon" aria-hidden="true">
					<use href="/icons.svg#ui_info"></use>
				</svg>
				<span>Узнать подробнее</span>
			</a>
		</div>

		<nav class="profile-head__tabs profile-tabs" aria-label="Разделы профиля">
			<div class="profile-tabs__scroll">
				<div class="profile-tabs__content">
					<span class="profile-tabs__item profile-tabs__item--active" aria-current="page">
						<span class="profile-tabs__label">Статьи</span>
					</span>
					<a href="{externalUrl}/comments" target="_blank" rel="noreferrer" class="profile-tabs__item">
						<span class="profile-tabs__label">Комментарии</span>
					</a>
					<a href="{externalUrl}/details" target="_blank" rel="noreferrer" class="profile-tabs__item profile-tabs__details">
						<span class="profile-tabs__label">Подробнее</span>
					</a>
				</div>
			</div>
		</nav>
	</div>

	<div class="profile-feed">
		<div class="profile-feed-sorting">
			{#each SORTINGS as item (item.value)}
				<button
					class={['profile-feed-sorting__button', { 'profile-feed-sorting__button--active': sorting === item.value }]}
					aria-pressed={sorting === item.value}
					onclick={() => onSortingChange(item.value)}
				>
					{item.label}
				</button>
			{/each}
		</div>

		<div class="profile-feed__posts">
			{#each posts as post (post.sourceId + '_' + post.id)}
				<PostCard {post} subscribe={false} />
			{/each}
		</div>

		{#if postsError}
			<p class="profile-feed__status">{postsError}</p>
		{:else if !loadingPosts && posts.length === 0}
			<p class="profile-feed__status">Постов пока нет</p>
		{/if}

		{#if hasMore}
			<div class="profile-feed__more" {@attach loadOnVisible}>
				{#if loadingPosts}<Preloader />{/if}
			</div>
		{/if}
	</div>

	<aside class="profile-sidebar">
		{@render sidebarBlock('Подписчики', profile.subscribersCount, subscribersPromise, true, 12, 'Показать всех', `${externalUrl}/details/subscribers`)}
		{@render sidebarBlock('Подписки', profile.subscriptionsCount, subscriptionsPromise, false, 5, 'Показать все', `${externalUrl}/details/subscriptions`)}
	</aside>
</div>

<style>
	.profile-section {
		--page-sidebar-offset-top: 44px;
		display: grid;
		gap: 32px 20px;
		width: 100%;
		max-width: 960px;
		margin-bottom: 12px;
	}

	/* Шапка профиля */
	.profile-head {
		--border-radius: 8px;
		--offset-x: var(--island-offset-x, 20px);
		--offset-y: 24px;
		grid-template-columns: 1fr auto;
		min-width: 0;
		padding: var(--offset-y) var(--offset-x);
		border-radius: var(--border-radius);
		background-color: #fff;
		font-size: 16px;
		line-height: 1.5em;
	}

	.profile-head > * {
		grid-column: span 2;
		min-width: 0;
	}

	.profile-head__cover {
		position: relative;
		height: 280px;
		margin-top: calc(var(--offset-y) * -1);
		margin-left: calc(var(--offset-x) * -1);
		margin-right: calc(var(--offset-x) * -1);
		background: #dedede no-repeat 50% 50% / cover;
	}

	.profile-head__avatar {
		display: flex;
		margin-top: -88px;
	}

	.profile-avatar {
		--size: 112px;
		--border-width: 4px;
		position: relative;
		z-index: 1;
		flex-shrink: 0;
		width: var(--size);
		overflow: hidden;
		border-radius: 6px;
		background: #dedede no-repeat 50% 50% / cover;
		box-shadow: 0 0 0 var(--border-width) #fff, inset 0 0 0 1px rgba(0, 0, 0, 0.1);
		cursor: zoom-in;
	}

	.profile-avatar::before {
		content: '';
		display: block;
		padding-top: 100%;
	}

	.profile-head__title {
		margin-top: 8px;
		font-size: 36px;
		line-height: 1.46em;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.profile-title {
		display: flex;
		align-items: center;
		width: 100%;
		min-width: 0;
		font: inherit;
	}

	.profile-title__name {
		flex-shrink: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.profile-title__name:not(:last-child) {
		margin-right: 9px;
	}

	.profile-title__badge {
		display: flex;
		align-items: center;
		margin-top: 4px;
	}

	.profile-head__description {
		margin-top: 4px;
	}

	.profile-description {
		--line-height: 24px;
		--lines-limit: 2;
		max-height: calc(var(--line-height) * var(--lines-limit));
		overflow: hidden;
		overflow-wrap: break-word;
		white-space: pre-wrap;
	}

	/* Статистика */
	.profile-head__stats {
		margin-top: 11px;
	}

	.profile-stats {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		/* у DTF у каждой строки статистики отступ снизу 8px */
		padding-bottom: 8px;
	}

	.profile-stats__row {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.profile-stats__change {
		font-weight: 500;
	}

	.profile-stats__change--positive {
		color: var(--color-positive);
	}

	.profile-stats__details-link {
		display: none;
		align-items: center;
		color: var(--text-link);
		font-size: 14px;
		line-height: 1.43em;
		font-weight: 500;
	}

	.profile-stats__details-link .icon {
		flex-shrink: 0;
		margin-top: -1px;
		margin-right: 8px;
	}

	/* Вкладки */
	.profile-head__tabs {
		margin-top: 4px;
		margin-bottom: calc(var(--offset-y) * -1);
		margin-left: calc(var(--offset-x) * -1);
		margin-right: calc(var(--offset-x) * -1);
	}

	.profile-tabs {
		--height: 63px;
		--tab-offset: 12px;
		position: relative;
		height: var(--height);
		font-size: 17px;
	}

	.profile-tabs__scroll {
		overflow: hidden;
		border-radius: 8px;
		white-space: nowrap;
	}

	.profile-tabs__content {
		display: inline-flex;
		vertical-align: top;
		padding-left: var(--offset-x);
		padding-right: var(--offset-x);
	}

	.profile-tabs__item {
		flex-shrink: 0;
		padding: 0 var(--tab-offset);
		color: #4d4d4d;
		cursor: pointer;
	}

	.profile-tabs__item:first-child {
		padding-left: 0;
	}

	.profile-tabs__item--active {
		color: #000;
		pointer-events: none;
	}

	.profile-tabs__label {
		display: flex;
		align-items: baseline;
		height: var(--height);
		line-height: calc(var(--height) + 1px);
	}

	.profile-tabs__item--active .profile-tabs__label {
		position: relative;
	}

	.profile-tabs__item--active .profile-tabs__label::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 3px;
		background-color: var(--color-blue);
	}

	@media (hover: hover) {
		.profile-tabs__item:hover {
			color: var(--color-blue);
		}
	}

	/* Лента профиля */
	.profile-feed {
		min-width: 0;
	}

	.profile-feed-sorting {
		display: flex;
		gap: 4px;
		margin-bottom: 12px;
	}

	.profile-feed-sorting__button {
		display: flex;
		align-items: center;
		padding: 4px 12px;
		border-radius: 20px;
		color: inherit;
		font: inherit;
		font-size: 16px;
		line-height: 24px;
		white-space: nowrap;
		cursor: pointer;
	}

	.profile-feed-sorting__button--active {
		background: #fff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
	}

	/* Первая карточка — сразу под сортировкой, между карточками — как в ленте */
	.profile-feed__posts > :global(.feed-item:first-child) {
		margin-top: 0;
	}

	.profile-feed__status {
		padding: 24px 0;
		color: var(--text-muted);
		text-align: center;
	}

	.profile-feed__more {
		display: flex;
		justify-content: center;
		min-height: 24px;
		padding-top: 16px;
	}

	/* Сайдбар */
	.profile-sidebar {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		gap: 20px;
		margin-top: var(--page-sidebar-offset-top);
	}

	.profile-sidebar-block {
		padding: 15px 20px 16px;
		background-color: #fff;
		font-size: 16px;
		line-height: 1.5em;
	}

	.profile-sidebar-block__title {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-top: -3px;
		margin-bottom: 16px;
		font-weight: 500;
	}

	.profile-sidebar-block__counter {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 1.43em;
		white-space: nowrap;
	}

	.profile-sidebar-block__show-all {
		display: block;
		margin-top: 16px;
		margin-bottom: -4px;
		color: var(--text-link);
		user-select: none;
	}

	.profile-sidebar-block__show-all:hover {
		color: #cd192e;
	}

	.profile-sidebar-list {
		display: grid;
		gap: 16px;
	}

	.profile-sidebar-list--grid {
		grid-template-columns: repeat(auto-fill, 32px);
		justify-content: space-between;
		gap: 12px;
	}

	.profile-sidebar-list__item {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		word-break: break-word;
	}

	.profile-sidebar-list__image {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		background-color: #dedede;
		object-fit: cover;
	}

	.profile-sidebar-list--grid .profile-sidebar-list__image {
		width: 32px;
		height: 32px;
		border-radius: 8px;
	}

	.profile-sidebar-list__label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (min-width: 640px) {
		.profile-sidebar-block {
			border-radius: 8px;
		}
	}

	@media (min-width: 1000px) {
		.profile-section {
			grid-template-columns: 1fr 300px;
		}

		.profile-head {
			display: grid;
			grid-column: span 2;
		}

		.profile-feed {
			grid-column: 1;
		}

		.profile-sidebar {
			grid-column: 2;
		}

		.profile-head__stats {
			margin-top: 20px;
		}

		.profile-head__title {
			margin-right: 20px;
		}
	}

	@media (max-width: 999px) {
		.profile-section {
			gap: 20px;
			max-width: 640px;
			margin: 0 auto;
		}

		.profile-head {
			--offset-x: var(--island-offset-x, 16px);
			--offset-y: 16px;
		}

		.profile-head__cover {
			height: auto;
		}

		.profile-head__cover::before {
			content: '';
			display: block;
			padding-top: 32.8125%;
		}

		.profile-head__avatar {
			margin-top: -52px;
		}

		.profile-avatar {
			--size: 72px;
			--border-width: 2px;
		}

		.profile-head__title {
			font-size: 24px;
			line-height: 1.5em;
		}

		.profile-head__description {
			margin-top: 8px;
		}

		.profile-head__stats {
			margin-top: 17px;
			font-size: 14px;
			line-height: 1.43em;
		}

		.profile-stats__details-link {
			display: flex;
		}

		.profile-tabs__details {
			display: none;
		}
	}

	@media (max-width: 859px) {
		.profile-feed-sorting {
			padding: 0 20px;
		}
	}

	@media (max-width: 639px) {
		.profile-head {
			--border-radius: 0;
		}

		.profile-head__cover::before {
			padding-top: 40%;
		}
	}
</style>
