<script lang="ts">
	import { CommentsLogic } from '$lib/components/Comments/commentsLogic.svelte';
	import CommentItem from '$lib/components/Comments/CommentItem.svelte';
	import Spinner from './Spinner.svelte';
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

<div class="comments-section modern-theme-container" class:autopan={commentSettings.value.nestingMode === 'autopan'}>
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
	.modern-theme-container {
		--comment-bg: transparent;
		--comment-bg-highlight: rgba(110, 142, 251, 0.08);
		--comment-thread-color: #e8e8e8;
		--comment-thread-hover: #6e8efb;
		--comment-author-color: #1a1a1a;
		--comment-date-color: #aaa;
		--comment-text-color: #333;
		--comment-reaction-bg: #f5f6f8;
		--comment-reaction-hover: #ebedf0;
		--comment-reaction-active: rgba(110, 142, 251, 0.1);
		--comment-reaction-active-border: #6e8efb;
		--comment-donation-bg: linear-gradient(135deg, #fff8e1, #ffecb3);
		--comment-donation-color: #f57f17;
		--comment-donation-border: rgba(245, 127, 23, 0.15);
		--comment-section-border: transparent;
		--comment-section-bg: #ffffff;
		--comment-expand-bg: rgba(110, 142, 251, 0.08);
		--comment-expand-color: #6e8efb;
		--comment-expand-bg-hover: rgba(110, 142, 251, 0.15);
		--comment-breadcrumb-bg: rgba(110, 142, 251, 0.06);
		--comment-breadcrumb-color: #6e8efb;
		--comment-breadcrumb-bg-hover: rgba(110, 142, 251, 0.12);
		--comment-preview-bg: rgba(255, 255, 255, 0.97);
		--comment-preview-border: rgba(0, 0, 0, 0.06);
		--comment-media-radius: 10px;
		--comment-radius: 16px;
		--comment-select-bg: #f5f6f8;
		--comment-select-border: #e8e8e8;
		--comment-select-color: #333;
		--comment-header-color: #1a1a1a;
		--comment-count-color: #888;
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
