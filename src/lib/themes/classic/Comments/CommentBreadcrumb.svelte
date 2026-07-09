<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';

	let { parentComment, replyToId } = $props<{ 
		parentComment: CommentTreeItem;
		replyToId: number;
	}>();

	function scrollToParent() {
		const el = document.getElementById(`comment-${replyToId}`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			el.classList.add('highlighted');
			setTimeout(() => el.classList.remove('highlighted'), 2000);
		}
	}
</script>

<button class="breadcrumb" onclick={scrollToParent}>
	↩
	{#if parentComment.author.avatarUrl}
		<img class="breadcrumb-avatar" src={parentComment.author.avatarUrl} alt="" />
	{/if}
	{parentComment.author.name}
</button>

<style>
	.breadcrumb {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 2px 8px;
		margin-bottom: 6px;
		border-radius: 6px;
		background: var(--comment-breadcrumb-bg, rgba(128, 128, 128, 0.08));
		border: none;
		color: var(--comment-breadcrumb-color, #666);
		font-size: 0.8em;
		cursor: pointer;
		transition: background 0.15s;
	}
	
	.breadcrumb:hover {
		background: var(--comment-breadcrumb-bg-hover, rgba(128, 128, 128, 0.15));
	}
	
	.breadcrumb-avatar {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		object-fit: cover;
	}
</style>
