<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { Reactions } from '$lib/api/types';
	import { REACTIONS } from '$lib/config/reactions';
	import { formatNumber } from '../format';

	let {
		reactions,
		onreact,
		compact = false
	}: {
		reactions?: Reactions;
		/** Без обработчика реакции только показываются */
		onreact?: (id: number) => void;
		/** Вариант для комментария */
		compact?: boolean;
	} = $props();

	// ponytail: реакции без картинки в config/reactions.ts пропускаем
	let visible = $derived(reactions?.counters.filter((c) => c.count > 0 && REACTIONS[c.id]) ?? []);

	/** Колесо мыши листает реакции по горизонтали — но только если есть куда листать */
	const horizontalWheel: Attachment<HTMLElement> = (node) => {
		const onWheel = (e: WheelEvent) => {
			if (e.deltaY === 0 || node.scrollWidth <= node.clientWidth) return;
			e.preventDefault();
			node.scrollLeft += e.deltaY;
		};
		node.addEventListener('wheel', onWheel, { passive: false });
		return () => node.removeEventListener('wheel', onWheel);
	};
</script>

<div class={['post-reactions', { 'post-reactions--compact': compact }]}>
	<div class="post-reactions__scroll" {@attach horizontalWheel}>
		{#each visible as reaction (reaction.id)}
			{@const isActive = reactions?.reactionId === reaction.id}
			<button
				class={['post-reaction', { 'post-reaction--active': isActive }]}
				title="Реакция"
				aria-pressed={isActive}
				onclick={() => onreact?.(reaction.id)}
			>
				<img src={REACTIONS[reaction.id].url} width="20" height="20" alt="" class="post-reaction__icon" />
				<span class="post-reaction__count">{formatNumber(reaction.count)}</span>
			</button>
		{/each}
		<!-- ponytail: выбора реакций пока нет -->
		<button class="post-reaction post-reaction--add" title="Добавить реакцию" aria-label="Добавить реакцию">
			<svg height="16" width="16" class="icon" aria-hidden="true">
				<use href="/icons.svg#v_plus"></use>
			</svg>
		</button>
	</div>
</div>

<style>
	.post-reactions {
		position: relative;
		margin-top: 10px;
		margin-bottom: 4px;
	}

	/*
	 * ponytail: в исходной вёрстке у варианта для комментария были свои отступы (4px/8px),
	 * но comments.css подключён раньше style.css и они перебивались базовыми. Перенесено фактическое.
	 */
	.post-reactions--compact {
		flex-basis: 100%;
	}

	.post-reactions__scroll {
		display: flex;
		align-items: center;
		gap: 4px;
		overflow-x: auto;
		white-space: nowrap;
		padding: 2px 0;
		scrollbar-width: none;
		user-select: none;
	}

	.post-reactions__scroll::-webkit-scrollbar {
		display: none;
	}

	.post-reaction {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		gap: 5px;
		height: 28px;
		padding: 0 8px 0 4px;
		border: 1px solid transparent;
		border-radius: 6px;
		background-color: rgba(0, 0, 0, 0.03);
		color: var(--text-muted);
		cursor: pointer;
		transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease, transform 0.1s ease;
	}

	.post-reaction:hover {
		background-color: rgba(0, 0, 0, 0.06);
		color: #000;
	}

	.post-reaction:active {
		transform: scale(0.96);
	}

	.post-reaction--active {
		background-color: rgba(70, 131, 217, 0.08);
		border-color: rgba(70, 131, 217, 0.25);
		color: var(--color-blue);
	}

	.post-reaction--active:hover {
		background-color: rgba(70, 131, 217, 0.15);
		color: var(--text-link);
	}

	.post-reaction__icon {
		display: block;
		width: 20px;
		height: 20px;
		object-fit: contain;
		pointer-events: none;
	}

	.post-reaction__count {
		font-size: 14px;
		font-weight: 500;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.post-reaction--active .post-reaction__count {
		color: var(--color-blue);
	}

	.post-reaction--add {
		justify-content: center;
		width: 28px;
		padding: 0;
		background-color: transparent;
		color: rgba(0, 0, 0, 0.4);
	}

	.post-reaction--add:hover {
		background-color: rgba(0, 0, 0, 0.05);
		color: rgba(0, 0, 0, 0.75);
	}
</style>
