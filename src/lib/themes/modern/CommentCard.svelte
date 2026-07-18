<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';
	import CommentHeader from './Comments/CommentHeader.svelte';
	import CommentReactions from './Comments/CommentReactions.svelte';
	import CommentMedia from './Comments/CommentMedia.svelte';
	import CommentBreadcrumb from './Comments/CommentBreadcrumb.svelte';

	let { comment, showBreadcrumb, parentComment } = $props<{
		comment: CommentTreeItem;
		showBreadcrumb: boolean;
		parentComment: CommentTreeItem | null;
	}>();
</script>

{#if showBreadcrumb && parentComment}
	<CommentBreadcrumb {parentComment} />
{/if}

{#if comment.isRemoved}
	<div class="removed-msg">Комментарий удален</div>
{:else}
	<CommentHeader {comment} />

	<div class="comment-content">
		{@html comment.content}
	</div>

	<CommentMedia media={comment.media} />

	<CommentReactions {comment} />
{/if}

<style>
	.comment-content {
		line-height: 1.55;
		word-break: break-word;
		color: var(--comment-text-color, inherit);
		font-size: 0.93em;
	}
	
	.comment-content :global(p) {
		margin: 0 0 6px 0;
	}
	
	.comment-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.removed-msg {
		opacity: 0.5;
		font-style: italic;
		font-size: 0.88em;
		padding: 4px 0;
	}
</style>
