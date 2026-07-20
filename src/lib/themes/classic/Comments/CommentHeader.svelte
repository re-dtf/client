<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';
	import SourceBadge from '$lib/components/SourceBadge.svelte';

	let { comment } = $props<{ comment: CommentTreeItem }>();
</script>

<div class="comment-header">
	{#if comment.author.avatarUrl}
		<img src={comment.author.avatarUrl} alt={comment.author.name} class="avatar" />
	{:else}
		<div class="avatar-fallback">{comment.author.name.charAt(0).toUpperCase()}</div>
	{/if}
	<span class="author">{comment.author.name}</span>
	<SourceBadge sourceId={comment.sourceId} />
	{#if comment.isReplaced}
		<span class="replaced-badge" title="Комментарий был удален и восстановлен из архива">восстановлен</span>
	{/if}
	{#if comment.donation}
		<span class="donation-badge" title="Донат {comment.donation} ₽">
			💎 {comment.donation} ₽
		</span>
	{/if}
	<span class="date">{comment._formattedDate || 'только что'}</span>
</div>

<style>
	.comment-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
		flex-wrap: wrap;
	}
	
	.author {
		font-weight: 600;
		font-size: 0.9em;
		color: var(--comment-author-color, inherit);
	}
	
	.date {
		font-size: 0.78em;
		color: var(--comment-date-color, #999);
	}

	.replaced-badge {
		font-size: 0.7em;
		padding: 2px 6px;
		background: rgba(244, 67, 54, 0.1);
		color: #d32f2f;
		border-radius: 4px;
		text-transform: uppercase;
		font-weight: 600;
	}

	.donation-badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 1px 8px;
		border-radius: 10px;
		font-size: 0.75em;
		font-weight: 600;
		background: var(--comment-donation-bg, linear-gradient(135deg, #fff8e1, #ffecb3));
		color: var(--comment-donation-color, #f57f17);
		border: 1px solid var(--comment-donation-border, rgba(245, 127, 23, 0.2));
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}
	
	.avatar-fallback {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(135deg, #6e8efb, #a777e3);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 12px;
		font-weight: 600;
		flex-shrink: 0;
	}
</style>
