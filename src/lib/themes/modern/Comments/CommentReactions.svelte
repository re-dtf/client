<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import { fade } from 'svelte/transition';
	import { REACTIONS } from '$lib/config/reactions';

	let { comment } = $props<{ comment: CommentTreeItem }>();

	let reactionError = $state<string | null>(null);

	async function react(reactionId: number) {
		if (!comment.reactions) return;
		const prevReactionId = comment.reactions.reactionId;
		const prevCounters = comment.reactions.counters.map((c: any) => ({ ...c }));
		try {
			const existing = comment.reactions.counters.find((c: any) => c.id === reactionId);
			let targetReactionId = reactionId;
			if (comment.reactions.reactionId === reactionId) {
				comment.reactions.reactionId = 0;
				if (existing) existing.count--;
				targetReactionId = 0;
			} else {
				if (comment.reactions.reactionId) {
					const old = comment.reactions.counters.find((c: any) => c.id === comment.reactions.reactionId);
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
</script>

<div class="comment-actions">
	{#if comment.reactions && comment.reactions.counters.length > 0}
		{#each comment.reactions.counters.filter((c: any) => c.count > 0) as reaction (reaction.id)}
			{@const rc = REACTIONS[reaction.id]}
			<button
				class="reaction-chip"
				class:active={comment.reactions.reactionId === reaction.id}
				onclick={() => react(reaction.id)}
			>
				<span class="emoji">
					<img src={rc ? rc.url : `/reactions/${reaction.id}.png`} alt="" class="reaction-img" />
				</span>
				<span class="count">{reaction.count}</span>
			</button>
		{/each}
	{/if}
	{#if !comment.reactions || comment.reactions.counters.every((c: any) => c.count === 0)}
		{@const rc = REACTIONS[1]}
		<button class="reaction-chip" onclick={() => react(1)}>
			<span class="emoji">
				<img src={rc ? rc.url : '/reactions/1.png'} alt="" class="reaction-img" />
			</span>
		</button>
	{/if}

	{#if reactionError}
		<span class="reaction-error" transition:fade={{ duration: 200 }}>{reactionError}</span>
	{/if}
</div>

<style>
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
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.reaction-img {
		width: 18px;
		height: 18px;
		object-fit: contain;
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
</style>
