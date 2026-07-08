<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import { fade } from 'svelte/transition';
	import CommentItem from './CommentItem.svelte';

	let {
		comment,
		depth = 0,
		maxVisualDepth = 6,
		allComments,
		nestingMode = 'flatten',
		onShowPreview,
		onHidePreview
	} = $props<{
		comment: CommentTreeItem;
		depth?: number;
		maxVisualDepth?: number;
		allComments: Map<number, CommentTreeItem>;
		nestingMode?: 'flatten' | 'autopan';
		onShowPreview?: (comment: CommentTreeItem, x: number, y: number) => void;
		onHidePreview?: () => void;
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

	let collapsed = $state(false);

	function toggleCollapse() {
		collapsed = !collapsed;
	}

	function countReplies(c: CommentTreeItem): number {
		let count = c.children.length;
		for (const child of c.children) count += countReplies(child);
		return count;
	}
	let totalReplies = $derived(countReplies(comment));

	function handleThreadEnter(e: MouseEvent) {
		onShowPreview?.(comment, e.clientX, e.clientY);
	}
	function handleThreadMove(e: MouseEvent) {
		onShowPreview?.(comment, e.clientX, e.clientY);
	}
	function handleThreadLeave() {
		onHidePreview?.();
	}

	let touchTimer: ReturnType<typeof setTimeout> | undefined;
	function handleTouchStart(e: TouchEvent) {
		const t = e.touches[0];
		touchTimer = setTimeout(() => {
			onShowPreview?.(comment, t.clientX, t.clientY);
		}, 300);
	}
	function handleTouchEnd() {
		clearTimeout(touchTimer);
		onHidePreview?.();
	}

	function handleThreadClick() {
		onHidePreview?.();
		toggleCollapse();
	}

	function scrollToParent() {
		if (!comment.replyTo) return;
		const el = document.getElementById(`comment-${comment.replyTo}`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			el.classList.add('highlighted');
			setTimeout(() => el.classList.remove('highlighted'), 2000);
		}
	}

	const REACTION_EMOJIS: Record<number, string> = {
		1: '❤️', 2: '🔥', 3: '😢', 4: '😂', 6: '😮', 9: '🍿',
		22: '😎', 23: '😐', 24: '👀', 25: '🤡',
		36: '👏', 40: '🤦‍♂️', 44: '😽', 45: '🐈'
	};

	let reactionError = $state<string | null>(null);

	async function react(reactionId: number) {
		if (!comment.reactions) return;
		const prevReactionId = comment.reactions.reactionId;
		const prevCounters = comment.reactions.counters.map((c) => ({ ...c }));
		try {
			const existing = comment.reactions.counters.find((c) => c.id === reactionId);
			let targetReactionId = reactionId;
			if (comment.reactions.reactionId === reactionId) {
				comment.reactions.reactionId = 0;
				if (existing) existing.count--;
				targetReactionId = 0;
			} else {
				if (comment.reactions.reactionId) {
					const old = comment.reactions.counters.find((c) => c.id === comment.reactions.reactionId);
					if (old) old.count--;
				}
				comment.reactions.reactionId = reactionId;
				if (existing) existing.count++;
				else comment.reactions.counters.push({ id: reactionId, count: 1 });
			}
			await api.reactToComment(comment.id, targetReactionId);
		} catch (e: any) {
			comment.reactions.reactionId = prevReactionId;
			comment.reactions.counters = prevCounters;
			const msg = e.message || '';
			if (msg.includes('403') || msg.toLowerCase().includes('недостаточно прав')) {
				reactionError = 'Для этой реакции нужен DTF Plus';
			} else {
				reactionError = 'Ошибка: ' + msg;
			}
			setTimeout(() => { reactionError = null; }, 3000);
		}
	}

	function formatDate(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'только что';
		if (mins < 60) return `${mins} мин. назад`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours} ч. назад`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days} дн. назад`;
		return new Date(iso).toLocaleDateString('ru-RU');
	}

	function pluralReplies(n: number): string {
		const mod10 = n % 10;
		const mod100 = n % 100;
		if (mod100 >= 11 && mod100 <= 19) return `${n} ответов`;
		if (mod10 === 1) return `${n} ответ`;
		if (mod10 >= 2 && mod10 <= 4) return `${n} ответа`;
		return `${n} ответов`;
	}
</script>

<div class="comment-item" id="comment-{comment.id}" data-depth={visualDepth}>
	<div class="comment-body-container">
		{#if showBreadcrumb && parentComment}
			<button class="breadcrumb" onclick={scrollToParent}>
				↩
				{#if parentComment.author.avatarUrl}
					<img class="breadcrumb-avatar" src={parentComment.author.avatarUrl} alt="" />
				{/if}
				{parentComment.author.name}
			</button>
		{/if}

		{#if comment.isRemoved}
			<div class="removed-msg">Комментарий удален</div>
		{:else}
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
				<span class="date">{formatDate(comment.createdAt)}</span>
			</div>

			<div class="comment-content">
				{@html comment.content}
			</div>

			{#if comment.media?.length}
				<div class="comment-media">
					{#each comment.media as m}
						{#if m.type === 'image'}
							<img
								src="https://leonardo.osnova.io/{m.data.uuid}/-/preview/400/-/format/webp/"
								alt=""
								loading="lazy"
								style="aspect-ratio: {m.data.width}/{m.data.height}; background-color: #{m.data.color || 'eee'};"
								class="comment-img"
							/>
						{:else if m.type === 'movie'}
							<video
								src="https://leonardo.osnova.io/{m.data.uuid}/-/format/mp4/"
								autoplay
								loop
								muted
								playsinline
								class="comment-video"
								style="aspect-ratio: {m.data.width}/{m.data.height};"
							></video>
						{/if}
					{/each}
				</div>
			{/if}

			<div class="comment-actions">
				{#if comment.reactions && comment.reactions.counters.length > 0}
					{#each comment.reactions.counters.filter((c) => c.count > 0) as reaction (reaction.id)}
						<button
							class="reaction-chip"
							class:active={comment.reactions.reactionId === reaction.id}
							onclick={() => react(reaction.id)}
						>
							<span class="emoji">{REACTION_EMOJIS[reaction.id] || `#${reaction.id}`}</span>
							<span class="count">{reaction.count}</span>
						</button>
					{/each}
				{/if}
				{#if !comment.reactions || comment.reactions.counters.every((c) => c.count === 0)}
					<button class="reaction-chip" onclick={() => react(1)}>
						<span class="emoji">❤️</span>
					</button>
				{/if}

				{#if reactionError}
					<span class="reaction-error" transition:fade={{ duration: 200 }}>{reactionError}</span>
				{/if}
			</div>
		{/if}
	</div>

	{#if comment.children?.length > 0}
		{#if !collapsed}
			<div class="replies-container" class:flat={visualDepth >= maxVisualDepth && nestingMode === 'flatten'}>
				{#if !(visualDepth >= maxVisualDepth && nestingMode === 'flatten')}
					<button
						class="thread-line"
						onclick={handleThreadClick}
						onmouseenter={handleThreadEnter}
						onmousemove={handleThreadMove}
						onmouseleave={handleThreadLeave}
						ontouchstart={handleTouchStart}
						ontouchend={handleTouchEnd}
						ontouchcancel={handleTouchEnd}
						aria-label="Свернуть ветку"
					>
						<div class="thread-line-inner"></div>
					</button>
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

	.replies {
		flex: 1;
		min-width: 0;
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

	.comment-media {
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	
	.comment-img,
	.comment-video {
		max-width: min(100%, 400px);
		height: auto;
		border-radius: var(--comment-media-radius, 8px);
		display: block;
	}

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

	.comment-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		font-size: 0.88em;
		flex-wrap: wrap;
	}
	
	.reaction-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		background: var(--comment-reaction-bg, #f0f2f5);
		border: 1px solid transparent;
		border-radius: 12px;
		font-size: 0.85em;
		cursor: pointer;
		color: inherit;
		transition:
			background 0.15s,
			border-color 0.15s,
			transform 0.1s;
	}
	
	.reaction-chip:hover {
		background: var(--comment-reaction-hover, #e4e6eb);
		transform: scale(1.05);
	}
	
	.reaction-chip:active {
		transform: scale(0.95);
	}
	
	.reaction-chip.active {
		border-color: var(--comment-reaction-active-border, #6e8efb);
		background: var(--comment-reaction-active, rgba(110, 142, 251, 0.1));
	}
	
	.reaction-chip .emoji {
		line-height: 1;
	}
	
	.reaction-chip .count {
		font-weight: 500;
	}
	
	.reaction-error {
		color: #e53935;
		font-size: 0.82em;
		background: rgba(229, 57, 53, 0.08);
		padding: 2px 8px;
		border-radius: 6px;
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

	.removed-msg {
		opacity: 0.5;
		font-style: italic;
		font-size: 0.88em;
		padding: 4px 0;
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
