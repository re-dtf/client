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
		searchable = false,
		children
	}: {
		open?: boolean;
		items: { value: T; label: string; icon?: string }[];
		selected?: T;
		onselect: (value: T) => void;
		width?: number | string;
		align?: 'left' | 'right';
		label?: string;
		/** Строка поиска над списком (для длинных списков) */
		searchable?: boolean;
		children: Snippet;
	} = $props();

	let anchor = $state<HTMLElement>();
	let query = $state('');
	const visible = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return needle ? items.filter((item) => item.label.toLowerCase().includes(needle)) : items;
	});

	// Поле поиска живёт, пока список открыт: в него сразу можно печатать, а запрос не переходит на следующее открытие
	function searchField(input: HTMLInputElement) {
		input.focus();
		return () => (query = '');
	}

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
			{#if searchable}
				<input
					class="popover__search"
					type="search"
					placeholder="Поиск"
					aria-label="Поиск"
					autocomplete="off"
					bind:value={query}
					onkeydown={(e) => e.key === 'Enter' && visible[0] && (e.preventDefault(), select(visible[0].value))}
					{@attach searchField}
				/>
			{/if}
			<div class="popover__content">
				{#each visible as item (item.value)}
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
				{:else}
					<div class="popover__empty">Ничего не найдено</div>
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
		background-color: var(--bg-card);
		box-shadow: var(--shadow-dropdown);
		color: var(--text-primary);
		font-size: 16px;
		line-height: 1.5em;
		text-align: left;
		user-select: none;
	}

	.popover--left {
		right: auto;
		left: var(--popover-left, 0);
	}

	/* Длинный список прокручивается внутри себя, а не растягивает страницу */
	.popover__content {
		max-height: min(320px, 50vh);
		padding: 6px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.popover__search {
		display: block;
		width: calc(100% - 12px);
		min-height: 36px;
		margin: 6px 6px 0;
		padding: 0 11px;
		box-sizing: border-box;
		border: 1px solid var(--border-input);
		border-radius: 8px;
		background-color: var(--bg-secondary);
		color: inherit;
		font: inherit;
		outline: 0;
	}

	.popover__search:focus {
		border-color: var(--color-blue);
		background-color: var(--bg-card);
	}

	.popover__empty {
		padding: 6px 10px;
		color: var(--text-subtle);
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
		--color-background: var(--bg-card-hover);
	}

	.popover-item--selected {
		--item-offset-right: 10px;
		--color-background: var(--bg-popover-selected);
	}

	.popover-item--selected:hover,
	.popover-item--selected:focus-visible {
		--color-background: var(--bg-popover-selected-hover);
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
