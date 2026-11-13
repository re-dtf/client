<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Reactions } from '$lib/api/types';
	import { FREE_REACTION_IDS, PLUS_REACTION_IDS, REACTIONS } from '$lib/config/reactions';
	import { formatNumber } from '../format';
	import { fade } from 'svelte/transition';
	import { reducedMotion } from '$lib/motion';
	import { haptics } from '$lib/haptics';

	let {
		reactions,
		onreact,
		onopenchange,
		children
	}: {
		reactions?: Reactions;
		onreact?: (id: number) => void;
		onopenchange?: (open: boolean) => void;
		children: Snippet;
	} = $props();

	let open = $state(false);
	let up = $state(false);
	let right = $state(false);
	let picking = $state(false);
	let anchor = $state<HTMLElement>();

	let touchTimer: ReturnType<typeof setTimeout> | undefined;
	let touchStart: { x: number; y: number } | undefined;
	let longPressed = false;
	let detachTouch: (() => void) | undefined;

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

	function setOpen(next: boolean) {
		if (open === next) return;
		open = next;
		onopenchange?.(next);
	}

	function show() {
		if (!anchor?.isConnected) return;
		updatePosition();
		setOpen(true);
	}

	function close() {
		cancelTouch();
		setOpen(false);
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

	function cancelTouch() {
		clearTimeout(touchTimer);
		touchTimer = undefined;
		touchStart = undefined;
		detachTouch?.();
		detachTouch = undefined;
	}

	function suppressClick() {
		if (!anchor) return;
		const stopClick = (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
		};
		anchor.addEventListener('click', stopClick, { capture: true, once: true });
		setTimeout(() => anchor?.removeEventListener('click', stopClick, true), 400);
	}

	function triggerLongPress() {
		cancelTouch();
		show();
		haptics.heavy();
		suppressClick();
		longPressed = true;
		setTimeout(() => (longPressed = false), 800);
	}

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType !== 'touch') return;
		if ((e.target as Element)?.closest?.('.reactions-popup')) return;
		cancelTouch();
		touchStart = { x: e.clientX, y: e.clientY };
		touchTimer = setTimeout(triggerLongPress, 450);
		const el = anchor;
		if (el) {
			el.addEventListener('pointerup', cancelTouch);
			el.addEventListener('pointercancel', cancelTouch);
			el.addEventListener('pointerleave', cancelTouch);
			detachTouch = () => {
				el.removeEventListener('pointerup', cancelTouch);
				el.removeEventListener('pointercancel', cancelTouch);
				el.removeEventListener('pointerleave', cancelTouch);
			};
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!touchStart || e.pointerType !== 'touch') return;
		if (Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y) > 10) cancelTouch();
	}

	function onContextMenu(e: MouseEvent) {
		if ((e.target as Element)?.closest?.('.reactions-popup')) {
			e.preventDefault();
			return;
		}
		e.preventDefault();
		if (longPressed) return;
		if (touchTimer) {
			triggerLongPress();
			return;
		}
		if (open) close();
		else show();
	}

	function handleClick(e: MouseEvent) {
		if (open && !(e.target as Element)?.closest?.('.reactions-popup')) close();
	}

	$effect(() => () => {
		cancelTouch();
		if (open) onopenchange?.(false);
	});

	// Слушатели на window ставим только при открытом пикере, чтобы не плодить тысячи обработчиков в списке комментариев
	$effect(() => {
		if (!open) return;
		const onOutside = (e: Event) => {
			if (!anchor?.contains(e.target as Node)) close();
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		window.addEventListener('click', onOutside);
		window.addEventListener('contextmenu', onOutside);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('click', onOutside);
			window.removeEventListener('contextmenu', onOutside);
			window.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

{#if onreact}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="reactions-tooltip-anchor"
		bind:this={anchor}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		oncontextmenu={onContextMenu}
		onclick={handleClick}
	>
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
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
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
