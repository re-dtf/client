<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Post, SearchFilters, SearchSorting, SearchSubsite } from '$lib/api/types';
	import type { SearchTab } from '$lib/themes/contract';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { getPostPath, getProfilePath, openPost, openProfile } from '$lib/navigation';
	import { votesOf } from '$lib/reactions';
	import { sanitizeHtml } from '$lib/sanitize';
	import NetworkErrorState from '$lib/components/NetworkErrorState.svelte';
	import { formatNumber, formatTime, plural } from './format';
	import { loadOnVisible } from './loadOnVisible';
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
		filters: SearchFilters;
		onFiltersChange: (filters: SearchFilters) => void;
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
	// `short` — подпись на кнопке узкого экрана, где вкладки и порядок иначе не умещаются в строку
	const SORTINGS: { value: SearchSorting; label: string; short: string }[] = [
		{ value: 'relevance', label: 'По релевантности', short: 'Релевантность' },
		{ value: 'date', label: 'По дате', short: 'Дата' }
	];
	const FILTERS: { key: keyof SearchFilters; label: string }[] = [
		{ key: 'title', label: 'Только в заголовках' },
		{ key: 'editorial', label: 'Новости редакции' },
		{ key: 'strict', label: 'Точное совпадение' }
	];

	let sortingOpen = $state(false);
	let currentSorting = $derived(SORTINGS.find((item) => item.value === sorting) ?? SORTINGS[0]);
	let empty = $derived(loaded && !error && (tab === 'posts' ? posts.length === 0 : subsites.length === 0));
	let count = $derived(total && !error ? formatNumber(total) : '');

	/** Картинка первого медиа-блока записи для превью справа */
	function thumbOf(post: Post): string | undefined {
		for (const block of post.blocks) {
			if (block.type !== 'media') continue;
			const uuid = block.data?.items?.find((item: any) => item.image?.data?.uuid)?.image.data.uuid;
			if (uuid) return getLeonardoUrl(uuid, { scale_crop: '192x144' });
		}
	}
</script>

<div class="search-page">
	<div class="search-head">
		<span class="search-head__label">Результаты по запросу</span>
		<h1 class="search-head__title">{query}</h1>
	</div>

	<div class="search-bar">
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
							<span class="search-sorting__full">{currentSorting.label}</span>
							<span class="search-sorting__short">{currentSorting.short}</span>
							<svg class="icon" width="16" height="16" aria-hidden="true">
								<use href="/icons.svg#v_chevron_down"></use>
							</svg>
						</button>
					</Popover>
				</div>
			{/if}
		</div>

		{#if tab === 'posts'}
			<div class="search-filters">
				{#each FILTERS as item (item.key)}
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

	{#if error && !posts.length && !subsites.length}
		<NetworkErrorState {error} title="Не удалось выполнить поиск" {onretry} />
	{:else}
		<div class={['search-results', { 'search-results--loading': loading && !hasMore && (posts.length > 0 || subsites.length > 0) }]}>
			{#if tab === 'posts'}
				{#each posts as post (post.sourceId + '_' + post.id)}
					{@const thumb = thumbOf(post)}
					{@const score = votesOf(post).up}
					<a class="search-simple" href={resolve(getPostPath(post) as any)} onclick={(e) => openPost(e, post)}>
						<div class="search-simple__body">
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
								<span class="search-simple__stat search-simple__stat--like" title="Оценки">
									<svg class="icon" width="18" height="18" aria-hidden="true">
										<use href="/icons.svg#v_like"></use>
									</svg>
									{formatNumber(score)}
								</span>
								<span class="search-simple__stat" title="Комментарии">
									<svg class="icon" width="18" height="18" aria-hidden="true">
										<use href="/icons.svg#v_comments"></use>
									</svg>
									{formatNumber(post.commentsCount)}
								</span>
							</div>
						</div>
						{#if thumb}
							<img class="search-simple__thumb" src={thumb} alt="" loading="lazy" />
						{/if}
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
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		margin-top: var(--gap);
		transition: opacity 0.2s ease;
	}

	.search-results--loading {
		opacity: 0.55;
	}

	.search-simple {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		padding: 20px;
		border-radius: 8px;
		background: var(--bg-card);
		color: inherit;
		text-decoration: none;
	}

	.search-simple:hover {
		background: var(--bg-card-hover);
	}

	.search-simple__body {
		flex: 1;
		min-width: 0;
	}

	.search-simple__thumb {
		flex-shrink: 0;
		width: 96px;
		height: 72px;
		border-radius: 6px;
		background: var(--bg-media-frame);
		object-fit: cover;
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
		gap: 16px;
		margin-top: 10px;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 18px;
	}

	.search-simple__stat {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.search-simple__stat .icon {
		fill: currentColor;
	}

	/* Иконка оценки — контурная, как в кнопке лайка */
	.search-simple__stat--like .icon {
		fill: none;
		stroke: currentColor;
	}

	/* Блог или тема */
	.search-subsite {
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

	@media (max-width: 859px) {
		.search-page {
			--gap: 12px;

			padding: 0 0 16px;
		}

		/* На узком экране, как записи ленты: во всю ширину и без скруглений */
		.search-head,
		.search-bar,
		.search-simple,
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

		.search-head {
			padding: 18px 16px;
		}

		.search-tabs {
			padding: 0 16px;
		}

		.search-filters {
			padding: 12px 16px;
		}

		.search-simple {
			padding: 16px;
		}

		.search-simple__thumb {
			width: 72px;
			height: 72px;
		}
	}
</style>
