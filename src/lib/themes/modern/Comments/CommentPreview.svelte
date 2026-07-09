<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { CommentTreeItem } from '$lib/api/types';

	let { visible, comment, x, y } = $props<{
		visible: boolean;
		comment: CommentTreeItem | null;
		x: number;
		y: number;
	}>();

	const TOOLTIP_WIDTH = 320;
	const TOOLTIP_HEIGHT = 100;
	const OFFSET_X = 12;
	const OFFSET_Y = 8;

	let position = $derived.by(() => {
		const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
		const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

		let adjustedX = x + OFFSET_X;
		let adjustedY = y + OFFSET_Y;

		if (adjustedX + TOOLTIP_WIDTH > winW - 8) {
			adjustedX = x - TOOLTIP_WIDTH - OFFSET_X;
		}
		if (adjustedY + TOOLTIP_HEIGHT > winH - 8) {
			adjustedY = y - TOOLTIP_HEIGHT - OFFSET_Y;
		}

		return { x: adjustedX, y: adjustedY };
	});

	function stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
	}

	function hasMedia(c: CommentTreeItem): 'image' | 'movie' | null {
		if (!c.media?.length) return null;
		return c.media.some((m) => m.type === 'movie') ? 'movie' : 'image';
	}

	function getInitial(name: string): string {
		return name.charAt(0).toUpperCase();
	}
</script>

{#if visible && comment}
	<div
		class="comment-preview"
		style="left: {position.x}px; top: {position.y}px;"
		transition:fade={{ duration: 100 }}
	>
		<div class="preview-header">
			{#if comment.author.avatarUrl}
				<img
					class="preview-avatar"
					src={comment.author.avatarUrl}
					alt={comment.author.name}
				/>
			{:else}
				<span class="preview-avatar preview-avatar--fallback">
					{getInitial(comment.author.name)}
				</span>
			{/if}
			<span class="preview-author">{comment.author.name}</span>
		</div>

		<p class="preview-text">
			{stripHtml(comment.content)}
			{#if hasMedia(comment) === 'movie'}
				<span class="media-indicator" title="Видео">🎬</span>
			{:else if hasMedia(comment) === 'image'}
				<span class="media-indicator" title="Изображение">📷</span>
			{/if}
		</p>
	</div>
{/if}

<style>
	.comment-preview {
		position: fixed;
		z-index: 10000;
		pointer-events: none;
		max-width: 320px;
		padding: 10px 14px;
		background: var(--comment-preview-bg, rgba(255, 255, 255, 0.97));
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--comment-preview-border, rgba(0, 0, 0, 0.08));
		border-radius: 10px;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.12),
			0 2px 8px rgba(0, 0, 0, 0.06);
		font-size: 0.85em;
		line-height: 1.4;
		color: var(--comment-text-color, #333);
	}

	.preview-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}

	.preview-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.preview-avatar--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: #fff;
		font-size: 0.72em;
		font-weight: 600;
		user-select: none;
	}

	.preview-author {
		font-weight: 700;
		font-size: 0.88em;
		color: var(--comment-author-color, #111);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.preview-text {
		margin: 0;
		color: var(--comment-preview-text-color, #555);
		word-break: break-word;
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.media-indicator {
		margin-left: 4px;
		font-size: 0.9em;
		vertical-align: middle;
	}
</style>
