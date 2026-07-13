<script lang="ts">
	import type { CommentTreeItem } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import { fade } from 'svelte/transition';
	import { REACTIONS } from '$lib/config/reactions';

	let { comment } = $props<{ comment: CommentTreeItem }>();

	let reactionError = $state<string | null>(null);
	let reactions = $state<any>(null);

	$effect(() => {
		reactions = comment.reactions ? structuredClone(comment.reactions) : null;
	});

	async function react(reactionId: number) {
		if (!reactions) return;
		const prevReactionId = reactions.reactionId;
		const prevCounters = reactions.counters.map((c: any) => ({ ...c }));
		try {
			const existing = reactions.counters.find((c: any) => c.id === reactionId);
			let targetReactionId = reactionId;
			if (reactions.reactionId === reactionId) {
				reactions.reactionId = 0;
				if (existing) existing.count--;
				targetReactionId = 0;
			} else {
				if (reactions.reactionId) {
					const old = reactions.counters.find((c: any) => c.id === reactions.reactionId);
					if (old) old.count--;
				}
				reactions.reactionId = reactionId;
				if (existing) existing.count++;
				else reactions.counters.push({ id: reactionId, count: 1 });
			}
			await api.reactToComment(comment.id, targetReactionId);
		} catch (e: any) {
			reactions.reactionId = prevReactionId;
			reactions.counters = prevCounters;
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
	{#if reactions && reactions.counters.length > 0}
		{#each reactions.counters.filter((c: any) => c.count > 0) as reaction (reaction.id)}
			{@const rc = REACTIONS[reaction.id]}
			<button
				class={['reaction-chip', { active: reactions.reactionId === reaction.id }]}
				onclick={() => react(reaction.id)}
			>
				<span class="emoji">
					{#if rc}
						<img src={rc.url} alt="" class="reaction-img" />
					{:else}
						<span class="reaction-fallback">#{reaction.id}</span>
					{/if}
				</span>
				<span class="count">{reaction.count}</span>
			</button>
		{/each}
	{/if}
	{#if !reactions || reactions.counters.every((c: any) => c.count === 0)}
		{@const rc = REACTIONS[1]}
		<button class="reaction-chip" onclick={() => react(1)}>
			<span class="emoji">
				<img src={rc.url} alt="" class="reaction-img" />
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
