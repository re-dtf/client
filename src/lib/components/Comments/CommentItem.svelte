<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';
	import CommentItem from './CommentItem.svelte';
	import { api } from '$lib/api/index.svelte';
	import { fade } from 'svelte/transition';

	let { comment } = $props<{ comment: CommentTreeItem }>();

	// ponytail: DTF reactions mapping
	// TODO: Replace these custom placeholders (6, 36, 40, 44, 45, etc.) with actual image assets later
	// 6 - Pikachu surprised, 36 - Animated claps, 40 - Pepe facepalm, 44 - Cat kissing, 45 - Cat bopping
	const REACTION_EMOJIS: Record<number, string> = {
		1: '❤️', 2: '🔥', 3: '😢', 4: '😂', 6: '😮', 9: '🍿', 
		22: '😎', 23: '😐', 24: '👀', 25: '🤡',
		36: '👏', 40: '🤦‍♂️', 44: '😽', 45: '🐈'
	};

	let reactionError = $state<string | null>(null);

	async function react(reactionId: number) {
		if (!comment.reactions) return;
		
		// Save state for rollback
		const prevReactionId = comment.reactions.reactionId;
		const prevCounters = comment.reactions.counters.map(c => ({...c}));

		try {
			// Optimistic UI update
			const existing = comment.reactions.counters.find(c => c.id === reactionId);
			let targetReactionId = reactionId;
			
			if (comment.reactions.reactionId === reactionId) {
				// Unreacting
				comment.reactions.reactionId = 0;
				if (existing) existing.count--;
				targetReactionId = 0; // ponytail: guess that 0 removes the reaction
			} else {
				if (comment.reactions.reactionId) {
					const old = comment.reactions.counters.find(c => c.id === comment.reactions.reactionId);
					if (old) old.count--;
				}
				comment.reactions.reactionId = reactionId;
				if (existing) existing.count++;
				else comment.reactions.counters.push({ id: reactionId, count: 1 });
			}

			await api.reactToComment(comment.id, targetReactionId);
		} catch (e: any) {
			console.error('Reaction failed', e);
			// Rollback state
			comment.reactions.reactionId = prevReactionId;
			comment.reactions.counters = prevCounters;
			
			const msg = e.message || '';
			if (msg.includes('403') || msg.toLowerCase().includes('недостаточно прав')) {
				reactionError = 'Для этой реакции нужен DTF Plus';
			} else {
				reactionError = 'Ошибка: ' + msg;
			}
			
			setTimeout(() => {
				reactionError = null;
			}, 3000);
		}
	}
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
		<div class="comment-actions">
			{#if comment.reactions && comment.reactions.counters.length > 0}
				{#each comment.reactions.counters.filter(c => c.count > 0) as reaction (reaction.id)}
					<button class="reaction-chip" class:active={comment.reactions.reactionId === reaction.id} onclick={() => react(reaction.id)}>
						<span class="emoji">{REACTION_EMOJIS[reaction.id] || `#${reaction.id}`}</span>
						<span class="count">{reaction.count}</span>
					</button>
				{/each}
			{/if}
			<!-- ponytail: default button if no reactions yet or to add a new one (id: 1 is usually 'upvote' or 'like') -->
			{#if !comment.reactions || comment.reactions.counters.every(c => c.count === 0)}
				<button class="reaction-chip" onclick={() => react(1)}>
					<span class="emoji">❤️</span>
				</button>
			{/if}
			
			{#if reactionError}
				<span class="reaction-error" transition:fade={{ duration: 200 }}>{reactionError}</span>
			{/if}
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
	.comment-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
		font-size: 0.9em;
		flex-wrap: wrap;
	}
	.reaction-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		background: var(--block-bg-hover, rgba(128, 128, 128, 0.1));
		border: 1px solid transparent;
		border-radius: 8px;
		font-size: 0.85em;
		cursor: pointer;
		color: inherit;
		transition: background 0.2s, border-color 0.2s;
	}
	.reaction-chip:hover {
		background: var(--block-bg, rgba(128, 128, 128, 0.2));
	}
	.reaction-chip.active {
		border-color: #4caf50;
		background: rgba(76, 175, 80, 0.1);
	}
	.reaction-chip .emoji {
		opacity: 0.8;
	}
	.reaction-chip .count {
		font-weight: 500;
	}
	.reaction-error {
		color: #e53935;
		font-size: 0.85em;
		margin-left: 4px;
		background: rgba(229, 57, 53, 0.1);
		padding: 2px 8px;
		border-radius: 4px;
	}
</style>
