<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { PaginatedResult, Post } from '$lib/api/types';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let feedResult = $state.raw<PaginatedResult<Post> | null>(null);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let currentFeed = $state<'popular' | 'new' | 'my'>('popular');

	const FEED_SORTING: Record<string, string> = { new: 'all', popular: 'hotness', my: 'new' };

	async function loadInitial(isRefresh = false) {
		try {
			error = null;
			if (!isRefresh) loading = true;
			feedResult = await api.getPosts({ 
				pageName: currentFeed, 
				sorting: FEED_SORTING[currentFeed] 
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

	$effect(() => {
		window.addEventListener('refreshFeed', handleRefresh);
		return () => window.removeEventListener('refreshFeed', handleRefresh);
	});

	async function loadMore() {
		if (loading || loadingMore || !feedResult?.cursors || Object.keys(feedResult.cursors).length === 0) return;
		try {
			loadingMore = true;
			const next = await api.getPosts({ 
				pageName: currentFeed,
				sorting: FEED_SORTING[currentFeed],
				cursors: feedResult.cursors
			});
			feedResult = {
				items: [...feedResult.items, ...next.items],
				cursors: next.cursors
			};
		} catch (e: any) {
			console.error('Failed to load more posts:', e);
		} finally {
			loadingMore = false;
		}
	}

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


<ThemeLoader componentName="EditorialNews" />

<ThemeLoader componentName="FeedTabs" {currentFeed} {switchFeed} />

<div class="feed">
	{#if error}
		<div class="error">{error}</div>
	{:else if loading}
		<ThemeLoader componentName="Spinner" />
	{:else if feedResult?.items.length === 0}
		<div class="empty">Нет постов</div>
	{:else if feedResult}
		<div in:fade={{ duration: 400 }}>
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
