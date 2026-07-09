<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';
	import { onMount } from 'svelte';
	import CommentItem from './CommentItem.svelte';
	import CommentThreadLine from './CommentThreadLine.svelte';

	let {
		comment,
		depth = 0,
		maxVisualDepth = 6,
		allComments,
		nestingMode = 'flatten',
		onShowPreview,
		onHidePreview,
		panObserver,
		cardComponent: CardComponent
	} = $props<{
		comment: CommentTreeItem;
		depth?: number;
		maxVisualDepth?: number;
		allComments: Map<number, CommentTreeItem>;
		nestingMode?: 'flatten' | 'autopan';
		onShowPreview?: (comment: CommentTreeItem, x: number, y: number) => void;
		onHidePreview?: () => void;
		panObserver?: IntersectionObserver | undefined;
		cardComponent: import('svelte').Component<any>;
	}>();

	let visualDepth = $derived(
		nestingMode === 'flatten' ? Math.min(depth, maxVisualDepth) : depth
	);
	let showBreadcrumb = $derived(
		nestingMode === 'flatten' && depth > maxVisualDepth && !!comment.replyTo
	);
	let parentComment = $derived(
		comment.replyTo ? allComments.get(comment.replyTo) ?? null : null
	);

	// svelte-ignore state_referenced_locally
	let collapsed = $state(depth >= 5 && (comment.children?.length ?? 0) > 0);

	let itemElement: HTMLElement;
	
	onMount(() => {
		if (panObserver && itemElement) {
			panObserver.observe(itemElement);
		}
		return () => {
			if (panObserver && itemElement) {
				panObserver.unobserve(itemElement);
			}
		};
	});

	function toggleCollapse() {
		collapsed = !collapsed;
	}

	let totalReplies = $derived(comment._totalReplies ?? 0);



	const pr = new Intl.PluralRules('ru-RU');
	const replyForms: Record<string, string> = { one: 'ответ', few: 'ответа', many: 'ответов', other: 'ответов' };
	function pluralReplies(n: number): string {
		return `${n} ${replyForms[pr.select(n)]}`;
	}
</script>

<div class="comment-item" id="comment-{comment.id}" data-depth={visualDepth} bind:this={itemElement}>
	<div class="comment-body-container">
		<CardComponent {comment} {showBreadcrumb} {parentComment} />
	</div>

	{#if comment.children?.length > 0}
		{#if !collapsed}
			<div class="replies-container" class:flat={visualDepth >= maxVisualDepth && nestingMode === 'flatten'}>
				{#if !(visualDepth >= maxVisualDepth && nestingMode === 'flatten')}
					<CommentThreadLine 
						{comment}
						{onShowPreview}
						{onHidePreview}
						onToggleCollapse={toggleCollapse}
					/>
				{/if}
				
				<div class="replies">
					{#each comment.children as child (child.id)}
						<CommentItem
							comment={child}
							depth={depth + 1}
							{maxVisualDepth}
							{allComments}
							{nestingMode}
							{onShowPreview}
							{onHidePreview}
							{panObserver}
							cardComponent={CardComponent}
						/>
					{/each}
				</div>
			</div>
		{:else}
			<div class="collapsed-actions">
				<button class="expand-btn" onclick={toggleCollapse}>
					Развернуть {pluralReplies(totalReplies)}
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.comment-item {
		display: flex;
		flex-direction: column;
	}
	
	.comment-body-container {
		padding: 10px 12px 2px 0;
		width: fit-content;
		max-width: var(--comment-main-width, 100%);
		box-sizing: border-box;
		word-break: break-word;
	}

	.replies-container {
		display: flex;
		align-items: stretch;
	}
	
	.replies-container.flat {
		display: block;
	}



	.replies {
		flex: 1;
		min-width: 0;
	}



	.collapsed-actions {
		padding-left: 24px;
		padding-top: 4px;
	}

	.expand-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		border: none;
		border-radius: 8px;
		background: var(--comment-expand-bg, rgba(110, 142, 251, 0.08));
		color: var(--comment-expand-color, #6e8efb);
		font-size: 0.85em;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}
	
	.expand-btn:hover {
		background: var(--comment-expand-bg-hover, rgba(110, 142, 251, 0.15));
	}

	.comment-item :global(.highlighted) {
		animation: comment-highlight 2s ease-out;
	}
	
	@keyframes comment-highlight {
		0% {
			background: var(--comment-bg-highlight, rgba(110, 142, 251, 0.15));
		}
		100% {
			background: transparent;
		}
	}
</style>
