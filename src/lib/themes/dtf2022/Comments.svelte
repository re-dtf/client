<script lang="ts">
	import { CommentsLogic } from '$lib/components/Comments/commentsLogic.svelte';
	import CommentItem from '$lib/components/Comments/CommentItem.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import CommentsHeader from './Comments/CommentsHeader.svelte';
	import CommentPreview from './Comments/CommentPreview.svelte';
	import { commentSettings } from '$lib/storage/commentSettings.svelte';
	import CommentCard from './CommentCard.svelte';

	let { postId, commentsCount = 0 } = $props<{ postId: number; commentsCount?: number }>();

	let logic = new CommentsLogic(() => postId);
</script>

<CommentPreview
	visible={logic.previewVisible}
	comment={logic.previewComment}
	x={logic.previewX}
	y={logic.previewY}
/>

<div class="comments-section classic-theme-container" class:autopan={commentSettings.value.nestingMode === 'autopan'}>
	<CommentsHeader {commentsCount} sorting={logic.sorting} onSortingChange={logic.onSortingChange} />

	{#if logic.comments.length === 0 && logic.loading}
		<div class="initial-loading">
			<Spinner inline={true} />
			Загрузка комментариев...
		</div>
	{:else if logic.comments.length === 0 && !logic.loading && !logic.error}
		<p class="empty">Пока нет комментариев</p>
	{/if}

	<div 
		class="comments-viewport" 
		bind:this={logic.viewportElement}
	>
		<div class="comments-list">
			{#each logic.comments as comment (comment.id)}
				<CommentItem
					{comment}
					depth={0}
					maxVisualDepth={logic.maxVisualDepth}
					allComments={logic.allCommentsMap}
					nestingMode={commentSettings.value.nestingMode}
					onShowPreview={logic.showPreview}
					onHidePreview={logic.hidePreview}
					panObserver={logic.engine.panObserver}
					cardComponent={CommentCard}
				/>
			{/each}
		</div>
	</div>

	{#if logic.error}
		<div class="error">{logic.error}</div>
	{/if}

	<div bind:this={logic.observerElement} class="observer-target">
		{#if logic.loading && logic.comments.length > 0}
			<div class="loading">Загрузка...</div>
		{/if}
	</div>
</div>

<style>
	.classic-theme-container {
		--comment-bg: transparent;
		--comment-bg-highlight: #fffde7;
		--comment-thread-color: #d0d0d0;
		--comment-thread-hover: #888;
		--comment-author-color: #333;
		--comment-date-color: #888;
		--comment-text-color: #333;
		--comment-reaction-bg: #f0f0f0;
		--comment-reaction-hover: #e0e0e0;
		--comment-reaction-active: rgba(76, 175, 80, 0.1);
		--comment-reaction-active-border: #4caf50;
		--comment-donation-bg: #fff8e1;
		--comment-donation-color: #e65100;
		--comment-donation-border: rgba(230, 81, 0, 0.15);
		--comment-section-border: #ddd;
		--comment-section-bg: transparent;
		--comment-expand-bg: rgba(0, 0, 0, 0.05);
		--comment-expand-color: #555;
		--comment-expand-bg-hover: rgba(0, 0, 0, 0.08);
		--comment-breadcrumb-bg: rgba(0, 0, 0, 0.04);
		--comment-breadcrumb-color: #666;
		--comment-breadcrumb-bg-hover: rgba(0, 0, 0, 0.08);
		--comment-preview-bg: rgba(255, 255, 255, 0.98);
		--comment-preview-border: rgba(0, 0, 0, 0.1);
		--comment-media-radius: 4px;
		--comment-radius: 0;
		--comment-select-bg: #f9f9f9;
		--comment-select-border: #ccc;
		--comment-select-color: #333;
		--comment-header-color: #333;
		--comment-count-color: #666;
	}

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
