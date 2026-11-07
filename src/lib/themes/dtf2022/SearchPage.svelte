<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Post, SearchSorting, SearchSubsite } from '$lib/api/types';
	import type { SearchTab } from '$lib/themes/contract';
	import { getPostPath, getProfilePath, openPost, openProfile } from '$lib/navigation';
	import { sanitizeHtml } from '$lib/sanitize';
	import NetworkErrorState from '$lib/components/NetworkErrorState.svelte';
	import { formatNumber, formatTime, plural } from './format';
	import { loadOnVisible } from './loadOnVisible';
	import { Popover, Preloader } from './ui';

	/*
	 * Страница результатов поиска. Страницу поиска DTF (весна 2023) в архиве не сохранили, поэтому вид собран
	 * по её стилям (`search-simple`, `search_results__*`): строки одним белым блоком, у первой и последней скруглены углы
	 * на широком экране; заголовок и вкладки — как у страницы тега. Блоги и темы приходят одной страницей.
	 */
	let {
		query,
		tab,
		onTabChange,
		sorting,
		onSortingChange,
		posts,
		subsites,
		total,
		loaded,
		loading,
		error,
		hasMore,
		loadMore,
		onretry
	}: {
		query: string;
		tab: SearchTab;
		onTabChange: (tab: SearchTab) => void;
		sorting: SearchSorting;
		onSortingChange: (sorting: SearchSorting) => void;
		posts: Post[];
		subsites: SearchSubsite[];
		total?: number;
		loaded: boolean;
		loading: boolean;
		error: unknown;
		hasMore: boolean;
		loadMore: () => void;
		onretry: () => void;
	} = $props();

	const TABS: { value: SearchTab; label: string }[] = [
		{ value: 'posts', label: 'Записи' },
		{ value: 'blogs', label: 'Блоги' },
		{ value: 'topics', label: 'Темы' }
	];
	const SORTINGS: { value: SearchSorting; label: string }[] = [
		{ value: 'relevance', label: 'По релевантности' },
		{ value: 'date', label: 'По дате' }
	];

	let sortingOpen = $state(false);
	let empty = $derived(loaded && !error && (tab === 'posts' ? posts.length === 0 : subsites.length === 0));
	let count = $derived(total && !error ? formatNumber(total) : '');
</script>

<div class="search-page">
	<div class="search-head">
		<span class="search-head__label">Результаты по запросу</span>
		<h1 class="search-head__title">{query}</h1>
	</div>

	<div class="search-tabs" role="tablist">
		{#each TABS as item (item.value)}
			<button
				type="button"
				role="tab"
				class={['search-tab', { 'search-tab--active': tab === item.value }]}
				aria-selected={tab === item.value}
				onclick={() => onTabChange(item.value)}
			>
				{item.label}
				{#if tab === item.value && count}<span class="search-tab__count">{count}</span>{/if}
			</button>
		{/each}

		{#if tab === 'posts'}
			<div class="search-sorting">
				<Popover bind:open={sortingOpen} items={SORTINGS} selected={sorting} onselect={onSortingChange} width={190} label="Порядок">
					<button type="button" class="search-sorting__button" aria-expanded={sortingOpen} onclick={() => (sortingOpen = !sortingOpen)}>
						<span>{SORTINGS.find((item) => item.value === sorting)?.label}</span>
						<svg class="icon" width="16" height="16" aria-hidden="true">
							<use href="/icons.svg#v_chevron_down"></use>
						</svg>
					</button>
				</Popover>
			</div>
		{/if}
	</div>

	{#if error && !posts.length && !subsites.length}
		<NetworkErrorState {error} title="Не удалось выполнить поиск" {onretry} />
	{:else}
		<div class="search-results">
			{#if tab === 'posts'}
				{#each posts as post (post.sourceId + '_' + post.id)}
					<a class="search-simple" href={resolve(getPostPath(post) as any)} onclick={(e) => openPost(e, post)}>
						<div class="search-simple__meta">
							{#if (post.subsite ?? post.author).avatarUrl}
								<img class="search-simple__avatar" src={(post.subsite ?? post.author).avatarUrl} alt="" loading="lazy" />
							{/if}
							<span class="search-simple__author">{post.subsite?.name ?? post.author.name}</span>
							<time class="search-simple__time" datetime={post.createdAt}>{formatTime(post.createdAt)}</time>
						</div>
						{#if post.title}
							<div class="search-simple__title">{post.title}</div>
						{/if}
						{#if post.searchSnippet}
							<div class="search-simple__text">{@html sanitizeHtml(post.searchSnippet)}</div>
						{/if}
						<div class="search-simple__footer">
							<svg class="icon" width="18" height="18" aria-hidden="true">
								<use href="/icons.svg#v_comments"></use>
							</svg>
							{post.commentsCount}
						</div>
					</a>
				{/each}
			{:else}
				{#each subsites as subsite (subsite.id)}
					<a class="search-simple search-subsite" href={resolve(getProfilePath(subsite.id) as any)} onclick={(e) => openProfile(e, subsite.id)}>
						<span class="search-subsite__avatar" style:background-image={subsite.avatarUrl ? `url('${subsite.avatarUrl}')` : undefined}></span>
						<span class="search-subsite__info">
							<span class="search-subsite__name">{subsite.name}</span>
							{#if subsite.description}
								<span class="search-subsite__description">{subsite.description}</span>
							{/if}
							{#if subsite.subscribersCount}
								<span class="search-subsite__count">
									{formatNumber(subsite.subscribersCount)} {plural(subsite.subscribersCount, ['подписчик', 'подписчика', 'подписчиков'])}
								</span>
							{/if}
						</span>
					</a>
				{/each}
			{/if}

			{#if empty}
				<p class="search-empty">Ничего не найдено</p>
			{/if}
		</div>

		{#if error}
			<p class="search-empty">{(error as Error).message}</p>
		{/if}

		{#if hasMore}
			<div class="search-more" {@attach loadOnVisible(loadMore)}>
				{#if loading}<Preloader />{/if}
			</div>
		{:else if loading}
			<div class="search-more"><Preloader /></div>
		{/if}
	{/if}
</div>

<style>
	.search-page {
		width: 100%;
		max-width: var(--content-width);
		/* Отступ страницы у DTF: 16px сверху на широком экране, снизу под последним результатом */
		padding: 16px 0;
		color: var(--text-primary);
	}

	.search-head {
		display: flex;
		flex-direction: column;
		gap: 6px;
		box-sizing: border-box;
		padding: 20px;
		background: var(--bg-card);
	}

	.search-head__label {
		color: var(--text-muted);
		font-size: 13px;
		line-height: 16px;
	}

	.search-head__title {
		overflow: hidden;
		margin: 0;
		font-size: 30px;
		font-weight: 600;
		line-height: 38px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.search-tabs {
		display: flex;
		align-items: stretch;
		box-sizing: border-box;
		height: 44px;
		margin-top: 15px;
		padding: 0 20px;
		border-bottom: 0.67px solid var(--border-subtle);
		background: var(--bg-card);
	}

	.search-tab {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-right: 20px;
		padding: 0;
		color: var(--text-muted);
		font: inherit;
		font-size: 15px;
		cursor: pointer;
	}

	.search-tab:hover,
	.search-tab--active {
		color: var(--text-primary);
	}

	.search-tab--active {
		box-shadow: inset 0 -2px 0 var(--color-accent);
	}

	.search-tab__count {
		color: var(--text-muted);
		font-size: 13px;
	}

	.search-sorting {
		--popover-gap: 4px;

		display: flex;
		align-items: center;
		margin-left: auto;
	}

	.search-sorting__button {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 0;
		color: var(--text-muted);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}

	.search-sorting__button:hover {
		color: var(--text-primary);
	}

	/* Результаты одним белым блоком, у краёв скруглённым */
	.search-results {
		background: var(--bg-card);
	}

	.search-simple {
		display: block;
		padding: 20px;
		border-bottom: 0.67px solid var(--border-subtle);
		color: inherit;
		text-decoration: none;
	}

	.search-simple:last-child {
		border-bottom: 0;
	}

	.search-simple:hover {
		background: var(--bg-card-hover);
	}

	.search-simple__meta {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
		font-size: 13px;
		line-height: 20px;
	}

	.search-simple__avatar {
		width: 20px;
		height: 20px;
		border-radius: 6px;
		object-fit: cover;
	}

	.search-simple__author {
		overflow: hidden;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.search-simple__time {
		color: var(--text-muted);
		white-space: nowrap;
	}

	.search-simple__title {
		margin-bottom: 4px;
		font-size: 17px;
		font-weight: 500;
		line-height: 24px;
		overflow-wrap: anywhere;
	}

	.search-simple__text {
		display: -webkit-box;
		overflow: hidden;
		color: var(--text-secondary);
		font-size: 15px;
		line-height: 22px;
		overflow-wrap: anywhere;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	.search-simple__text :global(mark) {
		background: var(--bg-highlight);
		color: inherit;
		font-weight: 500;
	}

	.search-simple__footer {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 10px;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 18px;
	}

	.search-simple__footer .icon {
		fill: currentColor;
	}

	/* Блог или тема */
	.search-subsite {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.search-subsite__avatar {
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--border-color) 50% 50% / cover no-repeat;
		box-shadow: inset 0 0 0 1px var(--border-avatar);
	}

	.search-subsite__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.search-subsite__name {
		font-size: 17px;
		font-weight: 500;
		line-height: 24px;
		overflow-wrap: anywhere;
	}

	.search-subsite__description {
		display: -webkit-box;
		overflow: hidden;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 20px;
		overflow-wrap: anywhere;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.search-subsite__count {
		color: var(--text-muted);
		font-size: 13px;
		line-height: 18px;
	}

	.search-empty {
		padding: 40px 20px;
		color: var(--text-muted);
		text-align: center;
	}

	.search-more {
		display: flex;
		justify-content: center;
		min-height: 40px;
		padding: 20px 0;
	}

	@media (min-width: 860px) {
		.search-results {
			border-radius: 8px;
			overflow: hidden;
		}
	}

	@media (max-width: 859px) {
		.search-page {
			padding: 0 0 16px;
		}
	}

	@media (max-width: 639px) {
		.search-head,
		.search-simple {
			padding: 16px;
		}

		.search-head {
			padding: 20px 16px;
		}

		.search-tabs {
			padding: 0 16px;
		}
	}
</style>
