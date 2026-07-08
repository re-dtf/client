<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/index.svelte';
	import type { Comment, CommentTreeItem } from '$lib/api/types';
	import CommentItem from './CommentItem.svelte';
	import CommentPreview from './CommentPreview.svelte';
	import Spinner from '../Spinner.svelte';
	import CommentsHeader from './CommentsHeader.svelte';
	import { commentSettings } from '$lib/storage/commentSettings.svelte';
	import { PanoramaEngine } from './panoramaEngine.svelte';
	import { buildTree } from './commentUtils';

	let { postId, commentsCount = 0 } = $props<{ postId: number; commentsCount?: number }>();

	let comments = $state<CommentTreeItem[]>([]);
	let flatComments = $state<Comment[]>([]);
	let allCommentsMap = $state(new Map<number, CommentTreeItem>());
	let loading = $state(false);
	let error = $state<string | null>(null);

	let sorting = $state('hotness');
	let cursor = $state<{ lastId: number; lastSortingValue: number } | undefined>();
	let hasMore = $state(true);

	let observerElement: HTMLElement;
	let viewportElement: HTMLElement | undefined = $state();

	const engine = new PanoramaEngine();

	// Preview state
	let previewVisible = $state(false);
	let previewComment = $state<CommentTreeItem | null>(null);
	let previewX = $state(0);
	let previewY = $state(0);

	function showPreview(comment: CommentTreeItem, x: number, y: number) {
		previewComment = comment;
		previewX = x;
		previewY = y;
		previewVisible = true;
	}

	function hidePreview() {
		previewVisible = false;
	}

	// Dynamic visual depth max depending on screen width
	let maxVisualDepth = $state(6);


	async function loadComments(reset = false) {
		if (loading || (!hasMore && !reset)) return;
		loading = true;
		error = null;

		try {
			if (reset) {
				cursor = undefined;
				flatComments = [];
				comments = [];
				allCommentsMap = new Map();
			}

			const result = await api.getComments(postId, cursor, sorting);
			
			flatComments = [...flatComments, ...result.items];
			const tree = buildTree(flatComments);
			comments = tree.roots;
			allCommentsMap = tree.map;

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

	// Auto-pan engine initialized above

	onMount(() => {
		loadComments(true);

		const mq = window.matchMedia('(max-width: 768px)');
		maxVisualDepth = mq.matches ? 3 : 6;
		mq.addEventListener('change', (e) => {
			maxVisualDepth = e.matches ? 3 : 6;
		});

		if (viewportElement) engine.mount(viewportElement);

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadComments();
				}
			},
			{ rootMargin: '200px' }
		);

		if (observerElement) observer.observe(observerElement);

		return () => {
			observer.disconnect();
			engine.destroy();
		};
	});
</script>

<CommentPreview
	visible={previewVisible}
	comment={previewComment}
	x={previewX}
	y={previewY}
/>

<div class="comments-section" class:autopan={commentSettings.value.nestingMode === 'autopan'}>
	<CommentsHeader {commentsCount} {sorting} {onSortingChange} />

	{#if comments.length === 0 && loading}
		<div class="initial-loading">
			<Spinner inline={true} />
			Загрузка комментариев...
		</div>
	{:else if comments.length === 0 && !loading && !error}
		<p class="empty">Пока нет комментариев</p>
	{/if}

	<div 
		class="comments-viewport" 
		bind:this={viewportElement}
	>
		<div class="comments-list">
			{#each comments as comment (comment.id)}
				<CommentItem
					{comment}
					depth={0}
					{maxVisualDepth}
					allComments={allCommentsMap}
					nestingMode={commentSettings.value.nestingMode}
					onShowPreview={showPreview}
					onHidePreview={hidePreview}
					panObserver={engine.panObserver}
				/>
			{/each}
		</div>
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
		padding: 24px;
		background: var(--comment-section-bg, transparent);
		border: 1px solid var(--comment-section-border, transparent);
		border-radius: var(--comment-radius, 0px);
	}



	.comments-viewport {
		position: relative;
		width: 100%;
	}


	.comments-section.autopan .comments-viewport {
		overflow: hidden;
		mask-image: linear-gradient(to right, black 95%, transparent 100%);
		-webkit-mask-image: linear-gradient(to right, black 95%, transparent 100%);
	}
	
	.comments-section.autopan .comments-list {
		width: max-content;
		padding-right: 32px;
		will-change: transform;
	}

	.empty {
		opacity: 0.7;
		font-style: italic;
		text-align: center;
		padding: 40px;
	}

	.initial-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 40px;
		opacity: 0.7;
	}

	.error {
		color: #d32f2f;
		margin-top: 10px;
		padding: 12px;
		background: rgba(211, 47, 47, 0.1);
		border-radius: 8px;
		text-align: center;
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
