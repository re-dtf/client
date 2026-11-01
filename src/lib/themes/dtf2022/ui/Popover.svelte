<script lang="ts" generics="T extends string">
	import type { Snippet } from 'svelte';
	import { clickOnKey } from '../a11y';

	/**
	 * Выпадающий список под кнопкой-триггером (children), по умолчанию выровненный по её правому краю.
	 * Триггер сам переключает `open`. Отступ вниз и вбок можно задать снаружи: --popover-gap и --popover-left.
	 */
	let {
		open = $bindable(false),
		items,
		selected,
		onselect,
		width = 143,
		align = 'right',
		label,
		children
	}: {
		open?: boolean;
		items: { value: T; label: string }[];
		selected?: T;
		onselect: (value: T) => void;
		width?: number;
		align?: 'left' | 'right';
		label?: string;
		children: Snippet;
	} = $props();

	let anchor = $state<HTMLElement>();

	function select(value: T) {
		open = false;
		onselect(value);
	}

	function closeOnOutsideClick(e: MouseEvent) {
		if (open && !anchor?.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window onclick={closeOnOutsideClick} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<span class="popover-anchor" bind:this={anchor}>
	{@render children()}

	{#if open}
		<div class={['popover', { 'popover--left': align === 'left' }]} style:width="{width}px" role="listbox" aria-label={label}>
			<div class="popover__content">
				{#each items as item (item.value)}
					<div
						class={['popover-item', { 'popover-item--selected': item.value === selected }]}
						role="option"
						aria-selected={item.value === selected}
						tabindex="0"
						onclick={() => select(item.value)}
						onkeydown={clickOnKey}
					>
						<div class="popover-item__label">{item.label}</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</span>

<style>
	.popover-anchor {
		position: relative;
		display: flex;
	}

	.popover {
		--item-offset-right: 18px;

		position: absolute;
		top: calc(100% + var(--popover-gap, 8px));
		right: 0;
		z-index: 17;
		max-width: 400px;
		overflow: hidden;
		border-radius: 8px;
		background-color: #fff;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.25);
		color: #000;
		font-size: 16px;
		line-height: 1.5em;
		text-align: left;
		user-select: none;
	}

	.popover--left {
		right: auto;
		left: var(--popover-left, 0);
	}

	.popover__content {
		padding: 6px;
	}

	.popover-item {
		--color-background: transparent;
		display: flex;
		align-items: center;
		padding: 6px var(--item-offset-right) 6px 10px;
		border-radius: 6px;
		background-color: var(--color-background);
		cursor: pointer;
		outline: 0;
	}

	.popover-item:not(:last-child) {
		margin-bottom: 4px;
	}

	.popover-item:hover,
	.popover-item:focus-visible {
		--color-background: rgba(0, 0, 0, 0.05);
	}

	.popover-item--selected {
		--item-offset-right: 10px;
		--color-background: #e3edfd;
	}

	.popover-item--selected:hover,
	.popover-item--selected:focus-visible {
		--color-background: #d8e7fc;
	}

	.popover-item__label {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.popover-item--selected .popover-item__label {
		font-weight: 500;
	}
</style>
