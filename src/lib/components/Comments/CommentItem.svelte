<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';
	import CommentItem from './CommentItem.svelte';

	let { comment } = $props<{ comment: CommentTreeItem }>();
</script>

<div class="comment-item" class:removed={comment.isRemoved} class:ignored={comment.isIgnored}>
	{#if comment.isRemoved}
		<div class="removed-message">Комментарий удален</div>
	{:else}
		<div class="comment-header">
			{#if comment.author.avatarUrl}
				<img src={comment.author.avatarUrl} alt={comment.author.name} class="avatar" />
			{:else}
				<div class="avatar fallback"></div>
			{/if}
			<span class="author">{comment.author.name}</span>
			<span class="date">{new Date(comment.createdAt).toLocaleString()}</span>
		</div>
		<div class="comment-content">
			<!-- ponytail: DTF text is HTML by default, using @html for now. No DOM sanitizer yet, assuming API is trusted. Add when needed. -->
			{@html comment.content}
		</div>
	{/if}

	{#if comment.children && comment.children.length > 0}
		<div class="replies">
			{#each comment.children as child (child.id)}
				<CommentItem comment={child} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.comment-item {
		margin-top: 16px;
		font-family: inherit;
	}
	.comment-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}
	.avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
	}
	.avatar.fallback {
		background: var(--block-border-color, #ccc);
	}
	.author {
		font-weight: bold;
		font-size: 0.9em;
		color: inherit;
	}
	.date {
		opacity: 0.7;
		font-size: 0.8em;
	}
	.comment-content {
		line-height: 1.5;
		word-break: break-word;
		color: inherit;
	}
	.comment-content :global(p) {
		margin: 0 0 8px 0;
	}
	.comment-content :global(p:last-child) {
		margin-bottom: 0;
	}
	.replies {
		margin-left: 12px;
		padding-left: 12px;
		border-left: 2px solid var(--block-border-color, #eaeaea);
	}
	.removed-message {
		opacity: 0.6;
		font-style: italic;
		padding: 4px 0;
	}
</style>
