<script lang="ts" generics="T extends string | number">
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
		items: { value: T; label: string; icon?: string }[];
		selected?: T;
		onselect: (value: T) => void;
		width?: number | string;
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
		<div class={['popover', { 'popover--left': align === 'left' }]} style:width={typeof width === 'number' ? `${width}px` : width} role="listbox" aria-label={label}>
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
						{#if item.icon}
							<div class={['popover-item__icon', { 'popover-item__icon--active': item.icon === 'v_bookmark_solid' }]}>
								<svg class="icon" width="20" height="20" aria-hidden="true">
									<use href="/icons.svg#{item.icon}"></use>
								</svg>
							</div>
						{/if}
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
		width: var(--popover-anchor-width, auto);
	}

	.popover {
		--item-offset-right: 18px;

		position: absolute;
		top: calc(100% + var(--popover-gap, 8px));
		right: 0;
		z-index: 17;
		max-width: var(--popover-max-width, 400px);
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

	.popover-item__icon {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		margin-right: 10px;
	}

	/* Добавленная закладка в меню синяя */
	.popover-item__icon--active {
		color: var(--color-blue);
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
