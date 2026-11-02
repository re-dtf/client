<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import type { Reactions } from '$lib/api/types';
	import { REACTIONS } from '$lib/config/reactions';
	import { reducedMotion } from '$lib/motion';
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

	/** Длительность перехода; при «уменьшить движение» в системе анимации нет */
	const ms = (n: number) => (reducedMotion() ? 0 : n);

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
				title={REACTIONS[reaction.id].name}
				aria-pressed={isActive}
				onclick={() => onreact?.(reaction.id)}
				animate:flip={{ duration: ms(200) }}
				in:fade={{ duration: ms(200) }}
				out:fade={{ duration: ms(140) }}
			>
				<img
					src={REACTIONS[reaction.id].url}
					width="20"
					height="20"
					alt=""
					class="post-reaction__icon"
				/>
				<!-- Число сменилось: новое выезжает снизу при добавлении реакции и сверху при снятии -->
				{#key reaction.count}
					<span class="post-reaction__count" in:fly={{ y: isActive ? 8 : -8, duration: ms(180), easing: cubicOut }}>
						{formatNumber(reaction.count)}
					</span>
				{/key}
			</button>
		{/each}
		{#if onreact}
			<button
				class={['post-reaction', 'post-reaction--add', { 'post-reaction--open': picking }]}
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
		<div
			class="post-reactions__picker"
			role="menu"
			in:fade={{ duration: ms(150) }}
			out:fade={{ duration: ms(100) }}
		>
			{#each Object.entries(REACTIONS) as [id, reaction] (id)}
				<button
					class={['post-reactions__pick', { 'post-reactions__pick--active': reactions?.reactionId === Number(id) }]}
					role="menuitem"
					aria-label={reaction.name}
					title={reaction.name}
					onclick={() => pick(Number(id))}
				>
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
		--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	/* Вариант для комментария: свой ряд, но плотнее, чем у поста */
	.post-reactions--compact {
		flex-basis: 100%;
		margin-top: 0;
		margin-bottom: 2px;
	}

	.post-reactions__scroll {
		display: flex;
		align-items: center;
		gap: 8px;
		overflow-x: auto;
		white-space: nowrap;
		/* место под рост таблетки при наведении и нажатии, иначе её обрежет overflow */
		padding: 3px 4px;
		margin: -1px -4px;
		scrollbar-width: none;
		user-select: none;
	}

	.post-reactions__scroll::-webkit-scrollbar {
		display: none;
	}

	/* Реакция — таблетка: иконка и число на светлой подложке; поставленная подсвечена синим с контуром */
	.post-reaction {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		gap: 6px;
		height: 28px;
		padding: 0 11px 0 7px;
		border-radius: 14px;
		background-color: rgba(0, 0, 0, 0.05);
		box-shadow: inset 0 0 0 1px transparent;
		color: var(--text-muted);
		font-size: 15px;
		cursor: pointer;
		transition:
			background-color 0.15s,
			box-shadow 0.15s;
	}

	@media (hover: hover) {
		.post-reaction:hover {
			background-color: rgba(0, 0, 0, 0.09);
		}

		.post-reaction--active:hover {
			background-color: rgba(70, 131, 217, 0.24);
		}
	}

	.post-reaction--active {
		background-color: rgba(70, 131, 217, 0.14);
		box-shadow: inset 0 0 0 1px rgba(70, 131, 217, 0.5);
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
		position: relative;
		top: 0.5px;
		font-variant-numeric: tabular-nums;
	}

	.post-reaction--active .post-reaction__count {
		color: var(--color-blue);
	}

	/* Кнопка «добавить»: круглая, плюс поворачивается в крестик, пока открыта панель */
	.post-reaction--add {
		justify-content: center;
		width: 28px;
		padding: 0;
	}

	.post-reaction--add .icon {
		transition: transform 0.25s var(--ease-spring);
	}

	.post-reaction--open .icon {
		transform: rotate(135deg);
	}

	.post-reaction--open {
		background-color: rgba(0, 0, 0, 0.09);
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
		border-radius: 16px;
		background-color: #fff;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.16);
	}

	.post-reactions__pick {
		display: flex;
		padding: 4px;
		border-radius: 50%;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.post-reactions__pick--active {
		background-color: rgba(70, 131, 217, 0.14);
	}

	@media (hover: hover) {
		.post-reactions__pick:hover {
			background-color: rgba(0, 0, 0, 0.07);
		}
	}
</style>
