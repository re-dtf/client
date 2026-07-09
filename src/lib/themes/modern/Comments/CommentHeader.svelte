<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';

	let { comment } = $props<{ comment: CommentTreeItem }>();
</script>

<div class="comment-header">
	{#if comment.author.avatarUrl}
		<img src={comment.author.avatarUrl} alt={comment.author.name} class="avatar" />
	{:else}
		<div class="avatar-fallback">{comment.author.name.charAt(0).toUpperCase()}</div>
	{/if}
	<span class="author">{comment.author.name}</span>
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
