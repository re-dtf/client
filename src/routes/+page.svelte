<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { PaginatedResult, Post } from '$lib/api/types';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { feed, feedFromUrl, openFeedTab, periodFromUrl, type FeedName, type Period } from '$lib/feed.svelte';
	import { untrack } from 'svelte';
	import { appear } from '$lib/themes/appear';

	let feedResult = $state.raw<PaginatedResult<Post> | null>(null);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);

	// Лента лежит в адресе (/?feed=new), так что на неё можно дать ссылку
	let currentFeed = $derived(feedFromUrl());
	let currentPeriod = $derived(periodFromUrl());

	const FEED_SORTING: Record<FeedName, string> = { new: 'all', popular: 'hotness', my: 'new' };

	// За выбранный период «Популярное» сортируется по самому периоду (day, week, …)
	function sortingOf(feedName: FeedName, period: Period): string {
		return feedName === 'popular' && period !== 'now' ? period : FEED_SORTING[feedName];
	}

	// Номер запроса: ответ прежней ленты не должен перетереть новую
	let requestId = 0;

	async function loadInitial(isRefresh = false) {
		const id = ++requestId;
		try {
			error = null;
			if (!isRefresh) loading = true;
			const result = await api.getPosts({ pageName: currentFeed, sorting: sortingOf(currentFeed, currentPeriod) });
			if (id === requestId) feedResult = result;
		} catch (e: any) {
			if (id === requestId) error = e.message;
			console.error('Failed to load posts:', e);
		} finally {
			if (id === requestId) loading = false;
		}
	}

	async function loadMore() {
		if (loading || loadingMore || !feedResult?.cursors || Object.keys(feedResult.cursors).length === 0) return;
		const id = requestId;
		try {
			loadingMore = true;
			const next = await api.getPosts({
				pageName: currentFeed,
				sorting: sortingOf(currentFeed, currentPeriod),
				cursors: feedResult.cursors
			});
			if (id === requestId) {
				feedResult = { items: [...feedResult.items, ...next.items], cursors: next.cursors };
			}
		} catch (e: any) {
			console.error('Failed to load more posts:', e);
		} finally {
			loadingMore = false;
		}
	}

	// Открыли другую ленту (или зашли на главную): загружаем её с начала
	$effect(() => {
		feed.setCurrent(currentFeed, currentPeriod);
		untrack(() => {
			feedResult = null;
			loadInitial();
		});
	});

	// Клик по логотипу на самой ленте: обновить без сброса списка
	let handledRefresh = feed.refreshCount;
	$effect(() => {
		if (feed.refreshCount !== handledRefresh) {
			handledRefresh = feed.refreshCount;
			untrack(() => loadInitial(true));
		}
	});

	let loaderNode = $state<HTMLElement>();

	$effect(() => {
		if (!loaderNode) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				loadMore();
			}
		}, { rootMargin: '1000px' });
		
		observer.observe(loaderNode);
		
		return () => {
			observer.disconnect();
		};
	});
</script>

<svelte:head>
	<title>reDTF - Лента</title>
</svelte:head>


<ThemeLoader
	componentName="FeedTabs"
	{currentFeed}
	switchFeed={openFeedTab}
	period={currentPeriod}
	switchPeriod={(period: Period) => openFeedTab('popular', period)}
/>

<!-- Новости есть только у обычного популярного, как у DTF -->
{#if currentFeed === 'popular' && currentPeriod === 'now'}
	<ThemeLoader componentName="EditorialNews" />
{/if}

<div class="feed">
	{#if error}
		<div class="error">{error}</div>
	{:else if loading}
		<ThemeLoader componentName="Spinner" />
	{:else if feedResult?.items.length === 0}
		<div class="empty">Нет постов</div>
	{:else if feedResult}
		<div {@attach appear('feedIn')}>
			{#each feedResult.items as post (post.sourceId + '_' + post.id)}
				<ThemeLoader componentName="Post" {post} />
			{/each}
			
			{#if feedResult.cursors && Object.keys(feedResult.cursors).length > 0}
				<div bind:this={loaderNode} class="infinite-loader">
					{#if loadingMore}
						<ThemeLoader componentName="Spinner" inline={true} />
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* В темах с flex-раскладкой (dtf2022) иначе лента сжимается по контенту */
	.feed {
		width: 100%;
	}
	.empty, .infinite-loader {
		text-align: center;
		padding: 40px;
		color: #666;
		font-size: 1.1em;
	}
	.infinite-loader {
		padding: 20px;
		min-height: 50px;
		display: flex;
		justify-content: center;
	}
	.error {
		color: red;
		text-align: center;
		padding: 40px;
		font-weight: bold;
	}
</style>
