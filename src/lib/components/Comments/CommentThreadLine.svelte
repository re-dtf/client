<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';

	let {
		comment,
		onShowPreview,
		onHidePreview,
		onToggleCollapse
	} = $props<{
		comment: CommentTreeItem;
		onShowPreview?: (comment: CommentTreeItem, x: number, y: number) => void;
		onHidePreview?: () => void;
		onToggleCollapse: () => void;
	}>();

	let touchTimer: ReturnType<typeof setTimeout> | undefined;
	
	function handlePointerDown(e: PointerEvent) {
		if (e.pointerType === 'touch') {
			touchTimer = setTimeout(() => onShowPreview?.(comment, e.clientX, e.clientY), 300);
		}
	}
	
	function handlePointerMove(e: PointerEvent) {
		if (e.pointerType === 'mouse') onShowPreview?.(comment, e.clientX, e.clientY);
	}
	
	function handlePointerLeave() {
		clearTimeout(touchTimer);
		onHidePreview?.();
	}

	function handleThreadClick() {
		onHidePreview?.();
		onToggleCollapse();
	}
</script>

<button
	class="thread-line"
	onclick={handleThreadClick}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerleave={handlePointerLeave}
	onpointerup={handlePointerLeave}
	onpointercancel={handlePointerLeave}
	oncontextmenu={(e) => e.preventDefault()}
	aria-label="Свернуть ветку"
>
	<div class="thread-line-inner"></div>
</button>

<style>
	.thread-line {
		width: 24px;
		flex-shrink: 0;
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		justify-content: center;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}
	
	.thread-line-inner {
		width: 2px;
		min-height: 100%;
		background: var(--comment-thread-color, #e0e0e0);
		border-radius: 1px;
		transition: background-color 0.15s, width 0.15s;
	}
	
	.thread-line:hover .thread-line-inner {
		width: 3px;
		background: var(--comment-thread-hover, #6e8efb);
	}
</style>
