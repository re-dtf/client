<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Comment, Post, SearchFilters, SearchSorting, SearchSubsite } from '$lib/api/types';
	import type { SearchTab } from '$lib/themes/contract';
	import { animatedAvatar } from '$lib/actions/animatedAvatar.svelte';
	import { reducedMotion } from '$lib/motion';
	import { getProfilePath, openProfile } from '$lib/navigation';
	import { profileContextMenu } from './actions.svelte';
	import NetworkErrorState from '$lib/components/NetworkErrorState.svelte';
	import CommentCard from './comments/CommentCard.svelte';
	import { formatNumber, plural } from './format';
	import { loadOnVisible } from './loadOnVisible';
	import SearchPost from './SearchPost.svelte';
	import { Popover, Preloader } from './ui';

	/*
	 * Страница результатов поиска. Страницу поиска DTF (весна 2023) в архиве не сохранили, поэтому вид собран
	 * по её стилям (`search-simple`, `search_results__*`) и по странице тега: заголовок, полоса вкладок с порядком и уточнениями,
	 * результаты карточками. Блоги и темы приходят одной страницей.
	 */
	let {
		query,
		tab,
		onTabChange,
		sorting,
		onSortingChange,
		filters,
		onFiltersChange,
		posts,
		comments,
		subsites,
		total,
		totals,
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
		filters: SearchFilters;
		onFiltersChange: (filters: SearchFilters) => void;
		posts: Post[];
		comments: Comment[];
		subsites: SearchSubsite[];
		total?: number;
		totals?: Partial<Record<SearchTab, number>>;
		loaded: boolean;
		loading: boolean;
		error: unknown;
		hasMore: boolean;
		loadMore: () => void;
		onretry: () => void;
	} = $props();

	const TABS: { value: SearchTab; label: string }[] = [
		{ value: 'posts', label: 'Записи' },
		{ value: 'comments', label: 'Комментарии' },
		{ value: 'blogs', label: 'Блоги' },
		{ value: 'topics', label: 'Темы' }
	];
	// `short` — подпись на кнопке узкого экрана, где вкладки и порядок иначе не умещаются в строку
	const SORTINGS: { value: SearchSorting; label: string; short: string }[] = [
		{ value: 'relevance', label: 'По релевантности', short: 'Релевантность' },
		{ value: 'date', label: 'По дате', short: 'Дата' }
	];
	const FILTERS: { key: 'title' | 'editorial' | 'strict'; label: string }[] = [
		{ key: 'title', label: 'Только в заголовках' },
		{ key: 'editorial', label: 'Новости редакции' },
		{ key: 'strict', label: 'Точное совпадение' }
	];

	let sortingOpen = $state(false);
	let currentSorting = $derived(SORTINGS.find((item) => item.value === sorting) ?? SORTINGS[0]);
	let hasItems = $derived((tab === 'posts' ? posts : tab === 'comments' ? comments : subsites).length > 0);
	let empty = $derived(loaded && !error && !hasItems);
	let visibleFilters = $derived(tab === 'posts' ? FILTERS : tab === 'comments' ? FILTERS.filter((f) => f.key === 'strict') : []);

	// Полоска под активной вкладкой переезжает от прежней вкладки к новой (FLIP через WAAPI)
	let lineEl: HTMLElement | undefined;
	let prevLineRect: DOMRect | undefined;

	$effect.pre(() => {
		void tab;
		if (lineEl?.isConnected) prevLineRect = lineEl.getBoundingClientRect();
	});

	function slideLine(el: HTMLElement) {
		const from = prevLineRect;
		prevLineRect = undefined;
		lineEl = el;
		if (!reducedMotion() && from && from.width > 0) {
			const to = el.getBoundingClientRect();
			if (to.width > 0 && from.left !== to.left) {
				el.animate(
					[
						{ transform: `translateX(${from.left - to.left}px) scaleX(${from.width / to.width})` },
						{ transform: 'none' }
					],
					{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
				);
			}
		}
		return () => {
			if (lineEl === el) lineEl = undefined;
		};
	}
</script>

<div class="search-page">
	<div class="search-head">
		<span class="search-head__label">Результаты по запросу</span>
		<h1 class="search-head__title">{query}</h1>
	</div>

	<div class="search-bar">
		<div class="search-tabs">
			<div class="search-tabs__list" role="tablist">
				{#each TABS as item (item.value)}
					{@const tabTotal = totals?.[item.value] ?? (tab === item.value ? total : undefined)}
					{@const countText = tabTotal ? formatNumber(tabTotal) : ''}
					<button
						type="button"
						role="tab"
						class={['search-tab', { 'search-tab--active': tab === item.value }]}
						aria-selected={tab === item.value}
						onclick={() => onTabChange(item.value)}
					>
						{item.label}
						{#if countText}<span class="search-tab__count">{countText}</span>{/if}
						{#if tab === item.value}
							<span class="search-tab__line" {@attach slideLine}></span>
						{/if}
					</button>
				{/each}
			</div>

			{#if tab === 'posts' || tab === 'comments'}
				<div class="search-sorting">
					<Popover bind:open={sortingOpen} items={SORTINGS} selected={sorting} onselect={onSortingChange} width={190} label="Порядок">
						<button type="button" class="search-sorting__button" aria-expanded={sortingOpen} onclick={() => (sortingOpen = !sortingOpen)}>
							<span class="search-sorting__full">{currentSorting.label}</span>
							<span class="search-sorting__short">{currentSorting.short}</span>
							<svg class="icon" width="16" height="16" aria-hidden="true">
								<use href="#v_chevron_down"></use>
							</svg>
						</button>
					</Popover>
				</div>
			{/if}
		</div>

		{#if visibleFilters.length}
			<div class="search-filters">
				{#each visibleFilters as item (item.key)}
					<button
						type="button"
						class={['search-chip', { 'search-chip--active': filters[item.key] }]}
						aria-pressed={filters[item.key]}
						onclick={() => onFiltersChange({ ...filters, [item.key]: !filters[item.key] })}
					>
						{item.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if error && !hasItems}
		<NetworkErrorState {error} title="Не удалось выполнить поиск" {onretry} />
	{:else}
		<div class={['search-results', { 'search-results--loading': loading && !hasMore && hasItems }]}>
			{#key tab}
				<div class="search-results__list">
					{#if tab === 'posts'}
						{#each posts as post (post.sourceId + '_' + post.id)}
							<SearchPost {post} />
						{/each}
					{:else if tab === 'comments'}
						{#each comments as comment (comment.sourceId + '_' + comment.id)}
							<CommentCard {comment} />
						{/each}
					{:else}
						{#each subsites as subsite (subsite.id)}
							<a class="search-subsite" href={resolve(getProfilePath(subsite.id) as any)} onclick={(e) => openProfile(e, subsite.id)} {@attach profileContextMenu(subsite)}>
								<span class="search-subsite__avatar" style:background-image={subsite.avatarUrl ? `url('${subsite.avatarUrl}')` : undefined} {@attach animatedAvatar(subsite.avatarUrl)}></span>
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
			{/key}
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
		--gap: 16px;

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
		border-radius: 8px;
		background: var(--bg-card);
	}

	.search-head__label {
		color: var(--text-muted);
		font-size: 13px;
		line-height: 16px;
	}

	/* Строка выше шрифта: у overflow обрезаются выносные элементы букв */
	.search-head__title {
		overflow: hidden;
		margin: 0;
		font-size: 30px;
		font-weight: 600;
		line-height: 38px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Вкладки, порядок и уточнения — одной плашкой */
	.search-bar {
		margin-top: var(--gap);
		border-radius: 8px;
		background: var(--bg-card);
	}

	.search-tabs {
		display: flex;
		align-items: stretch;
		box-sizing: border-box;
		height: 48px;
		padding: 0 20px;
	}

	.search-tabs__list {
		display: flex;
		align-items: stretch;
		flex: 1;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.search-tabs__list::-webkit-scrollbar {
		display: none;
	}

	.search-tab {
		position: relative;
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: 6px;
		margin-right: 20px;
		padding: 0;
		color: var(--text-muted);
		font: inherit;
		font-size: 15px;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.search-tab:last-child {
		margin-right: 0;
	}

	.search-tab:hover,
	.search-tab--active {
		color: var(--text-primary);
	}

	.search-tab__line {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		background: var(--color-accent);
		transform-origin: left;
		pointer-events: none;
	}

	.search-tab__count {
		color: var(--text-muted);
		font-size: 13px;
	}

	.search-sorting {
		--popover-gap: 4px;

		display: flex;
		align-items: center;
		flex-shrink: 0;
		margin-left: 16px;
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

	.search-sorting__short {
		display: none;
	}

	.search-sorting__button:hover {
		color: var(--text-primary);
	}

	.search-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 12px 20px;
		border-top: 0.67px solid var(--border-subtle);
	}

	.search-chip {
		padding: 4px 12px;
		border-radius: 16px;
		background: var(--bg-secondary);
		color: var(--text-muted);
		font: inherit;
		font-size: 13px;
		line-height: 20px;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.search-chip:hover {
		background: var(--bg-card-hover-2);
		color: var(--text-primary);
	}

	.search-chip--active {
		background: var(--bg-reaction-active);
		color: var(--text-link);
	}

	.search-chip--active:hover {
		background: var(--bg-reaction-active-hover);
		color: var(--text-link);
	}

	/* Результаты карточками; пока грузится новая выдача, прежняя притухает */
	.search-results {
		margin-top: var(--gap);
		transition: opacity 0.2s ease;
	}

	.search-results__list {
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		animation: search-tab-in 0.18s ease-out;
	}

	@keyframes search-tab-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	.search-results--loading {
		opacity: 0.55;
	}

	/* Блог или тема */
	.search-subsite {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 20px;
		border-radius: 8px;
		background: var(--bg-card);
		color: inherit;
		text-decoration: none;
		transition: background-color 0.15s ease;
	}

	@media (hover: hover) {
		.search-subsite:hover {
			background: color-mix(in srgb, var(--bg-card) 97%, var(--text-primary));
		}
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
		border-radius: 8px;
		background: var(--bg-card);
		color: var(--text-muted);
		text-align: center;
	}

	.search-more {
		display: flex;
		justify-content: center;
		min-height: 40px;
		padding: 20px 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.search-results__list {
			animation: none;
		}
	}

	@media (max-width: 859px) {
		.search-page {
			--gap: 12px;

			padding: 0 0 16px;
		}

		/* На узком экране, как записи ленты: во всю ширину и без скруглений */
		.search-head,
		.search-bar,
		.search-subsite,
		.search-empty {
			border-radius: 0;
		}
	}

	@media (max-width: 639px) {
		.search-sorting__full {
			display: none;
		}

		.search-sorting__short {
			display: inline;
		}

		.search-tab {
			margin-right: 16px;
		}

		.search-sorting {
			margin-left: 12px;
		}

		.search-head {
			padding: 18px 16px;
		}

		.search-tabs {
			padding: 0 16px;
		}

		.search-filters {
			padding: 12px 16px;
		}

		.search-subsite {
			padding: 16px;
		}
	}
</style>
