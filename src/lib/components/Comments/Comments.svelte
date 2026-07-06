<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/index.svelte';
	import type { Comment, CommentTreeItem } from '$lib/api/types';
	import CommentItem from './CommentItem.svelte';

	let { postId } = $props<{ postId: number }>();

	let comments = $state<CommentTreeItem[]>([]);
	let flatComments = $state<Comment[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	
	let sorting = $state('hotness');
	let cursor = $state<{ lastId: number; lastSortingValue: number } | undefined>();
	let hasMore = $state(true);

	let observerElement: HTMLElement;

	// ponytail: O(n) lazy tree builder
	function buildTree(flat: Comment[]): CommentTreeItem[] {
		const map = new Map<number, CommentTreeItem>();
		const roots: CommentTreeItem[] = [];

		for (const c of flat) {
			map.set(c.id, { ...c, children: [] });
		}

		for (const c of map.values()) {
			if (c.replyTo && map.has(c.replyTo)) {
				map.get(c.replyTo)!.children.push(c);
			} else {
				roots.push(c);
			}
		}
		return roots;
	}

	async function loadComments(reset = false) {
		if (loading || (!hasMore && !reset)) return;
		loading = true;
		error = null;

		try {
			if (reset) {
				cursor = undefined;
				flatComments = [];
				comments = [];
			}
			
			const result = await api.getComments(postId, cursor, sorting);
			
			flatComments = [...flatComments, ...result.items];
			comments = buildTree(flatComments);
			
			if (result.lastId && result.lastSortingValue) {
				cursor = { lastId: result.lastId, lastSortingValue: result.lastSortingValue };
				hasMore = true;
			} else {
				hasMore = false;
			}
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	function onSortingChange(event: Event) {
		sorting = (event.target as HTMLSelectElement).value;
		loadComments(true);
	}

	onMount(() => {
		loadComments(true);

		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				loadComments();
			}
		}, { rootMargin: '200px' });

		if (observerElement) observer.observe(observerElement);

		return () => observer.disconnect();
	});
</script>

<div class="comments-section">
	<div class="header">
		<h3>Комментарии</h3>
		<select value={sorting} onchange={onSortingChange}>
			<option value="date">Свежие</option>
			<option value="hotness">Популярные</option>
		</select>
	</div>

	{#if comments.length === 0 && loading}
		<div class="initial-loading">
			<div class="spinner"></div>
			Загрузка комментариев...
		</div>
	{:else if comments.length === 0 && !loading && !error}
		<p class="empty">Пока нет комментариев</p>
	{/if}

	<div class="comments-list">
		{#each comments as comment (comment.id)}
			<CommentItem {comment} />
		{/each}
	</div>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div bind:this={observerElement} class="observer-target">
		{#if loading && comments.length > 0}
			<div class="loading">Загрузка...</div>
		{/if}
	</div>
</div>

<style>
	.comments-section {
		margin-top: 40px;
		padding-top: 20px;
		border-top: 1px solid var(--block-border-color, #ddd);
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}
	.header h3 {
		margin: 0;
	}
	select {
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid var(--block-border-color, #ccc);
		background: var(--block-bg, transparent);
		color: inherit;
	}
	.empty {
		opacity: 0.7;
		font-style: italic;
	}
	.initial-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 40px;
		opacity: 0.7;
	}
	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--block-border-color, #ccc);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.error {
		color: #d32f2f;
		margin-top: 10px;
		padding: 10px;
		background: rgba(211, 47, 47, 0.1);
		border-radius: 4px;
	}
	.observer-target {
		height: 40px;
		margin-top: 20px;
		display: flex;
		justify-content: center;
		align-items: center;
		opacity: 0.7;
	}
</style>
