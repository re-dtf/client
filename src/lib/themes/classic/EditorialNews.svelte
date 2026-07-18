<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { Post } from '$lib/api/types';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Spinner from './Spinner.svelte';
	import { pushState } from '$app/navigation';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	let news = $state<Post[] | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			news = await api.getEditorialNews();
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	});

	function openPost(event: Event, post: Post) {
		event.preventDefault();
		const overlays = $page.state.overlays || [];
		pushState(resolve(`/post/${post.id}`), { 
			overlays: [...overlays, { id: `post-${post.id}`, type: 'post', data: { postId: post.id } }] 
		});
	}
</script>

<div class="editorial-news-container">
	{#if loading}
		<div class="loading-state">
			<Spinner inline={true} />
		</div>
	{:else if error}
		<div class="error-state">{error}</div>
	{:else if news && news.length > 0}
		<div class="news-list" in:fade={{ duration: 300 }}>
			{#each news as item (item.sourceId + '_' + item.id)}
				<a href="/post/{item.id}" class="news-item" onclick={(e) => openPost(e, item)}>
					<span class="news-title">{item.title}</span>
					{#if item.commentsCount > 0}
						<span class="news-comments">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
							</svg>
							{item.commentsCount}
							{#if item.unreadCommentsCount}
								<span class="unread">+{item.unreadCommentsCount}</span>
							{/if}
						</span>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.editorial-news-container {
		margin-bottom: 20px;
		background: var(--bg-secondary, #f0f0f0);
		padding: 16px;
		border-radius: 12px;
		position: relative;
	}

	.loading-state, .error-state {
		font-size: 0.9em;
		color: var(--text-secondary, #666);
	}

	.news-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.news-item {
		text-decoration: none;
		color: var(--text-primary, #000);
		transition: opacity 0.2s;
		line-height: 1.4;
	}

	.news-item:hover {
		opacity: 0.8;
	}

	.news-title {
		font-size: 0.95em;
		font-weight: 500;
	}

	.news-comments {
		font-size: 0.85em;
		color: var(--text-secondary, #666);
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-left: 6px;
		white-space: nowrap;
	}

	.unread {
		color: #2ea83a; /* Default DTF blue/green color for new comments. DTF uses a blueish color or accent color, let's use a distinct blue */
		color: #0077ff;
	}
</style>
