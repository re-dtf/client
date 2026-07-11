<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { PaginatedResult, Post } from '$lib/api/types';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let feedResult = $state<PaginatedResult<Post> | null>(null);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let currentFeed = $state<'popular' | 'new' | 'my'>('popular');

	async function loadInitial(isRefresh = false) {
		try {
			error = null;
			if (!isRefresh) loading = true;
			feedResult = await api.getPosts({ 
				pageName: currentFeed, 
				sorting: currentFeed === 'new' ? 'all' : (currentFeed === 'popular' ? 'hotness' : 'new') 
			});
		} catch (e: any) {
			error = e.message;
			console.error('Failed to load posts:', e);
		} finally {
			loading = false;
		}
	}

	function handleRefresh() {
		loadInitial(true);
	}

	async function loadMore() {
		if (loading || loadingMore || !feedResult?.lastId || !feedResult?.lastSortingValue) return;
		try {
			loadingMore = true;
			const next = await api.getPosts({ 
				pageName: currentFeed,
				sorting: currentFeed === 'new' ? 'all' : (currentFeed === 'popular' ? 'hotness' : 'new'),
				cursor: {
					lastId: feedResult.lastId, 
					lastSortingValue: feedResult.lastSortingValue 
				}
			});
			feedResult = {
				items: [...feedResult.items, ...next.items],
				lastId: next.lastId,
				lastSortingValue: next.lastSortingValue
			};
		} catch (e: any) {
			console.error('Failed to load more posts:', e);
		} finally {
			loadingMore = false;
		}
	}

	function infiniteScroll(node: HTMLElement) {
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				loadMore();
			}
		}, { rootMargin: '1000px' });
		
		observer.observe(node);
		
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	function switchFeed(feed: 'popular' | 'new' | 'my') {
		if (currentFeed === feed) return;
		currentFeed = feed;
		feedResult = null;
		loadInitial();
	}

	// Load posts purely on the client
	onMount(() => {
		loadInitial();
	});
</script>

<svelte:head>
	<title>reDTF - Лента</title>
</svelte:head>

<svelte:window onrefreshFeed={handleRefresh} />

<ThemeLoader componentName="EditorialNews" />

<ThemeLoader componentName="FeedTabs" {currentFeed} {switchFeed} />

<div class="feed">
	{#if error}
		<div class="error">{error}</div>
	{:else if loading}
		<Spinner />
	{:else if feedResult?.items.length === 0}
		<div class="empty">Нет постов</div>
	{:else if feedResult}
		<div in:fade={{ duration: 400 }}>
			{#each feedResult.items as post (post.id)}
				<ThemeLoader componentName="Post" {post} />
			{/each}
			
			{#if feedResult.lastId}
				<div use:infiniteScroll class="infinite-loader">
					{#if loadingMore}
						<Spinner inline={true} />
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
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
