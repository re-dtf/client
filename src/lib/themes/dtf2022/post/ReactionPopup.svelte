<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Reactions } from '$lib/api/types';
	import { FREE_REACTION_IDS, PLUS_REACTION_IDS, REACTIONS } from '$lib/config/reactions';
	import { formatNumber } from '../format';
	import { fade } from 'svelte/transition';
	import { reducedMotion } from '$lib/motion';

	let {
		reactions,
		onreact,
		children
	}: {
		reactions?: Reactions;
		onreact?: (id: number) => void;
		children: Snippet;
	} = $props();

	let open = $state(false);
	let up = $state(false);
	let right = $state(false);
	let picking = $state(false);
	let anchor = $state<HTMLElement>();
	let timer: ReturnType<typeof setTimeout> | undefined;

	const ms = (n: number) => (reducedMotion() ? 0 : n);

	let visibleCounters = $derived(
		reactions?.counters.filter((c) => c.count > 0 && REACTIONS[c.id]) ?? []
	);

	function updatePosition() {
		if (!anchor?.isConnected) return;
		const rect = anchor.getBoundingClientRect();
		up = window.innerHeight - rect.bottom < (picking ? 300 : 200) && rect.top > 160;
		right = rect.left > window.innerWidth / 2;
	}

	function show() {
		if (!anchor?.isConnected) return;
		updatePosition();
		open = true;
	}

	function enter() {
		if (!window.matchMedia?.('(hover: hover)').matches) return;
		clearTimeout(timer);
		if (!open) timer = setTimeout(show, 650);
	}

	function leave() {
		clearTimeout(timer);
		timer = setTimeout(close, 200);
	}

	function close() {
		clearTimeout(timer);
		open = false;
		picking = false;
	}

	function pick(id: number) {
		onreact?.(id);
		close();
	}

	function togglePicking() {
		picking = !picking;
		updatePosition();
	}
</script>

<svelte:window
	onclick={(e) => open && !anchor?.contains(e.target as Node) && close()}
	onkeydown={(e) => open && e.key === 'Escape' && close()}
/>

{#if onreact}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="reactions-tooltip-anchor" bind:this={anchor} onmouseenter={enter} onmouseleave={leave}>
		{@render children()}

		{#if open}
			<div
				class={[
					'post-reactions__picker reactions-popup',
					{ 'reactions-popup--up': up, 'reactions-popup--right': right }
				]}
				role="menu"
				aria-label="Реакции"
				in:fade={{ duration: ms(150) }}
				out:fade={{ duration: ms(100) }}
			>
				{#snippet picks(ids: readonly number[])}
					{#each ids as id (id)}
						{@const r = REACTIONS[id]}
						<button
							type="button"
							class={['reactions-popup__pick', { 'reactions-popup__pick--active': reactions?.reactionId === id }]}
							role="menuitem"
							aria-label={r.name}
							title={r.name}
							onclick={() => pick(id)}
						>
							<img src={r.url} width="24" height="24" alt="" />
						</button>
					{/each}
				{/snippet}

				{#if visibleCounters.length}
					{#each visibleCounters as item (item.id)}
						{@const isActive = reactions?.reactionId === item.id}
						{@const r = REACTIONS[item.id]}
						<button
							type="button"
							class={['reaction-pill', { 'reaction-pill--active': isActive }]}
							title={r.name}
							aria-pressed={isActive}
							onclick={() => pick(item.id)}
						>
							<img src={r.url} width="18" height="18" alt="" />
							<span class="reaction-pill__count">{formatNumber(item.count)}</span>
						</button>
					{/each}
				{:else}
					{@render picks(FREE_REACTION_IDS)}
				{/if}

				<button
					type="button"
					class={['reaction-pill reaction-pill--add', { 'reaction-pill--open': picking }]}
					title={picking ? 'Скрыть выбор' : visibleCounters.length ? 'Добавить реакцию' : 'Все реакции'}
					aria-label={picking ? 'Скрыть выбор' : visibleCounters.length ? 'Добавить реакцию' : 'Все реакции'}
					aria-expanded={picking}
					onclick={togglePicking}
				>
					<svg height="16" width="16" class="icon" aria-hidden="true">
						<use href="/icons.svg#v_plus"></use>
					</svg>
				</button>

				{#if picking}
					{#if visibleCounters.length}
						<div class="reactions-popup__divider" role="separator"></div>
						{@render picks(FREE_REACTION_IDS)}
					{/if}
					<div class="reactions-popup__divider" role="separator"></div>
					{@render picks(PLUS_REACTION_IDS)}
				{/if}
			</div>
		{/if}
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.reactions-tooltip-anchor {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.reactions-popup {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px;
		width: max-content;
		max-width: min(340px, calc(100vw - 32px));
		padding: 8px;
		border-radius: 16px;
		background-color: var(--bg-card);
		box-shadow: var(--shadow-picker);
		user-select: none;
	}

	/* Мостик между триггером и окном для сохранения ховера */
	.reactions-popup::before {
		content: '';
		position: absolute;
		inset: -10px 0;
		z-index: -1;
	}

	.reactions-popup--up {
		top: auto;
		bottom: calc(100% + 6px);
	}

	.reactions-popup--right {
		left: auto;
		right: 0;
	}

	.reaction-pill {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		gap: 5px;
		height: 26px;
		padding: 0 9px 0 6px;
		border-radius: 13px;
		background-color: var(--bg-card-hover);
		color: var(--text-muted);
		font-size: 13px;
		cursor: pointer;
		transition: background-color 0.15s, box-shadow 0.15s;
	}

	.reaction-pill:hover {
		background-color: var(--bg-reaction-hover);
	}

	.reaction-pill--active {
		background-color: var(--bg-reaction-active);
		box-shadow: inset 0 0 0 1px var(--border-reaction-active);
		color: var(--color-blue);
	}

	.reaction-pill img,
	.reactions-popup__pick img {
		display: block;
		object-fit: contain;
		pointer-events: none;
	}

	.reaction-pill__count {
		font-weight: 500;
		line-height: 20px;
		font-variant-numeric: tabular-nums;
	}

	.reaction-pill--add {
		justify-content: center;
		width: 26px;
		padding: 0;
	}

	.reaction-pill--add:hover,
	.reaction-pill--open {
		background-color: var(--bg-reaction-hover);
		color: var(--text-primary);
	}

	.reaction-pill--add .icon {
		display: block;
		transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.reaction-pill--open .icon {
		transform: rotate(135deg);
	}

	.reactions-popup__pick {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border-radius: 50%;
		cursor: pointer;
		transition: background-color 0.15s, transform 0.12s;
	}

	.reactions-popup__pick:hover {
		background-color: var(--bg-card-hover-2);
		transform: scale(1.15);
	}

	.reactions-popup__pick--active {
		background-color: var(--bg-reaction-active);
	}

	.reactions-popup__divider {
		flex-basis: 100%;
		height: 1px;
		margin: 2px 0;
		background-color: var(--border-subtle-2, rgba(0, 0, 0, 0.08));
	}
</style>
