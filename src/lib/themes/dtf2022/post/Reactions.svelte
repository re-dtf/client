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

	// Реакции без картинки в config/reactions.ts пропускаем
	let visible = $derived(reactions?.counters.filter((c) => c.count > 0 && REACTIONS[c.id]) ?? []);

	let picking = $state(false);
	let root = $state<HTMLElement>();

	function pick(id: number) {
		picking = false;
		onreact?.(id);
	}

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

<svelte:window
	onclick={(e) => picking && !root?.contains(e.target as Node) && (picking = false)}
	onkeydown={(e) => e.key === 'Escape' && (picking = false)}
/>

<div class={['post-reactions', { 'post-reactions--compact': compact }]} bind:this={root}>
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
		{#if onreact}
			<button
				class="post-reaction post-reaction--add"
				title="Добавить реакцию"
				aria-label="Добавить реакцию"
				aria-expanded={picking}
				onclick={() => (picking = !picking)}
			>
				<svg height="16" width="16" class="icon" aria-hidden="true">
					<use href="/icons.svg#v_plus"></use>
				</svg>
			</button>
		{/if}
	</div>

	{#if picking && onreact}
		<div class="post-reactions__picker" role="menu">
			{#each Object.entries(REACTIONS) as [id, reaction] (id)}
				<button class="post-reactions__pick" role="menuitem" aria-label="Реакция {id}" onclick={() => pick(Number(id))}>
					<img src={reaction.url} width="24" height="24" alt="" />
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.post-reactions {
		position: relative;
		margin-top: 10px;
		margin-bottom: 4px;
	}

	/* Вариант для комментария: свой ряд, но плотнее, чем у поста */
	.post-reactions--compact {
		flex-basis: 100%;
		margin-top: 0;
		margin-bottom: 2px;
	}

	/* Кнопки устроены как кнопки оценки темы (PostButton, Rating): иконка и число, круг подсветки вокруг иконки */
	.post-reactions__scroll {
		display: flex;
		align-items: center;
		gap: 20px;
		overflow-x: auto;
		white-space: nowrap;
		/* место под круг подсветки, иначе его обрежет overflow */
		padding: 2px 5px;
		margin: 0 -5px;
		scrollbar-width: none;
		user-select: none;
	}

	.post-reactions__scroll::-webkit-scrollbar {
		display: none;
	}

	.post-reaction {
		position: relative;
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		gap: 10px;
		height: 28px;
		color: var(--text-muted);
		font-size: 15px;
		cursor: pointer;
	}

	.post-reaction::before {
		content: '';
		position: absolute;
		top: 50%;
		left: -5px;
		width: 30px;
		height: 30px;
		margin-top: -15px;
		border-radius: 50%;
		background-color: transparent;
		transition: background-color 0.1s;
	}

	.post-reaction:hover::before {
		background-color: rgba(0, 0, 0, 0.05);
	}

	.post-reaction--active::before {
		background-color: rgba(70, 131, 217, 0.14);
	}

	.post-reaction--active:hover::before {
		background-color: rgba(70, 131, 217, 0.22);
	}

	.post-reaction__icon,
	.post-reaction__count,
	.post-reaction .icon {
		position: relative;
	}

	.post-reaction__icon {
		display: block;
		width: 20px;
		height: 20px;
		object-fit: contain;
		pointer-events: none;
	}

	.post-reaction__count {
		font-weight: 500;
		line-height: 22px;
		/* Измерено по canvas: центр цифр Roboto 15px лежит на 0.5px выше центра иконки (она в кадре по центру) */
		top: 0.5px;
		font-variant-numeric: tabular-nums;
	}

	.post-reaction--active .post-reaction__count {
		color: var(--color-blue);
	}

	/* Панель выбора под рядом реакций; вне прокручиваемого ряда, иначе её обрежет overflow */
	.post-reactions__picker {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 10;
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		width: max-content;
		max-width: min(320px, 100%);
		padding: 8px;
		border-radius: 8px;
		background-color: #fff;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.16);
	}

	.post-reactions__pick {
		display: flex;
		padding: 4px;
		border-radius: 6px;
		cursor: pointer;
	}

	.post-reactions__pick:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}

	.post-reaction--add {
		justify-content: center;
		width: 20px;
	}
</style>
