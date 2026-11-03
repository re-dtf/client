<script lang="ts" generics="T extends string | number">
	/*
	 * Выпадающий список в духе libadwaita (AdwComboRow):
	 * кнопка-пилюля с текстом и шевроном, при клике открывает меню-поповер со списком и галочкой.
	 */
	let {
		options,
		value = $bindable(),
		disabled = false,
		label,
		id,
		onchange
	}: {
		options: { value: T; title: string }[];
		value: T;
		disabled?: boolean;
		label?: string;
		id?: string;
		onchange?: (value: T) => void;
	} = $props();

	const listboxId = $props.id();

	let open = $state(false);
	let openUpwards = $state(false);
	let rootEl = $state<HTMLElement>();
	let triggerEl = $state<HTMLButtonElement>();
	let focusedIndex = $state(-1);

	let selected = $derived(options.find((opt) => opt.value === value) ?? options[0]);

	function toggle() {
		if (disabled) return;
		if (!open && triggerEl) {
			const rect = triggerEl.getBoundingClientRect();
			// Если снизу мало места (меньше 180px), но сверху хватает — открываем вверх
			openUpwards = window.innerHeight - rect.bottom < 180 && rect.top > 180;
			focusedIndex = options.findIndex((opt) => opt.value === value);
		}
		open = !open;
	}

	function close() {
		open = false;
		focusedIndex = -1;
	}

	function select(val: T) {
		value = val;
		onchange?.(val);
		close();
		triggerEl?.focus();
	}

	function handleWindowClick(e: MouseEvent) {
		if (open && rootEl && !rootEl.contains(e.target as Node)) {
			close();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
				e.preventDefault();
				toggle();
			}
			return;
		}

		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			triggerEl?.focus();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusedIndex = (focusedIndex + 1) % options.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusedIndex = (focusedIndex - 1 + options.length) % options.length;
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (focusedIndex >= 0 && focusedIndex < options.length) {
				select(options[focusedIndex].value);
			} else {
				close();
			}
		} else if (e.key === 'Tab') {
			close();
		}
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class={['select-wrap', { 'select-wrap--open': open }]} bind:this={rootEl}>
	<button
		{id}
		bind:this={triggerEl}
		class={['select-btn', { 'select-btn--open': open }]}
		type="button"
		role="combobox"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={listboxId}
		aria-label={label}
		{disabled}
		onclick={toggle}
		onkeydown={handleKeydown}
	>
		<span class="select-btn__text">{selected ? selected.title : ''}</span>
		<svg class={['chevron', { 'chevron--open': open }]} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>

	{#if open}
		<div
			id={listboxId}
			class={['popover', { 'popover--up': openUpwards }]}
			role="listbox"
			aria-label={label}
			tabindex="-1"
		>
			{#each options as option, i (option.value)}
				{@const isSelected = option.value === value}
				{@const isFocused = i === focusedIndex}
				<button
					type="button"
					class={['item', { 'item--selected': isSelected, 'item--focused': isFocused }]}
					role="option"
					aria-selected={isSelected}
					onclick={() => select(option.value)}
					onmouseenter={() => (focusedIndex = i)}
				>
					<span class="item__title">{option.title}</span>
					{#if isSelected}
						<svg class="item__check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
							<path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.select-wrap {
		position: relative;
		display: inline-flex;
		flex: none;
		max-width: 100%;
	}

	.select-wrap--open {
		z-index: 50;
	}

	.select-btn {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 38px;
		padding: 0 14px 0 16px;
		border: 0;
		border-radius: 19px;
		background: var(--st-button);
		color: inherit;
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		line-height: 20px;
		cursor: pointer;
		user-select: none;
		transition:
			background-color var(--duration-base),
			opacity var(--duration-base);
	}

	.select-btn:hover:not(:disabled),
	.select-btn--open {
		background: var(--st-button-hover);
	}

	.select-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.select-btn:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}

	.select-btn__text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		flex: none;
		color: var(--st-muted);
		transition: transform var(--duration-base), color var(--duration-base);
	}

	.chevron--open {
		transform: rotate(180deg);
		color: inherit;
	}

	.select-btn:hover:not(:disabled) .chevron {
		color: inherit;
	}

	.popover {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: 100;
		min-width: max(100%, 180px);
		max-width: 320px;
		max-height: 260px;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 6px;
		border-radius: 12px;
		background: var(--st-card);
		box-shadow:
			0 0 0 1px var(--st-separator),
			0 4px 16px rgba(0, 0, 0, 0.12),
			0 12px 32px rgba(0, 0, 0, 0.08);
		transform-origin: top right;
		animation: adw-popover-in var(--duration-base) cubic-bezier(0, 0, 0.2, 1);
	}

	.popover--up {
		top: auto;
		bottom: calc(100% + 6px);
		transform-origin: bottom right;
	}

	@keyframes adw-popover-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		min-height: 36px;
		padding: 7px 12px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 14px;
		line-height: 20px;
		text-align: left;
		cursor: pointer;
		user-select: none;
		transition: background-color var(--duration-base);
	}

	.item:hover,
	.item--focused {
		background: var(--st-hover);
	}

	.item--selected {
		font-weight: 500;
	}

	.item__title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item__check {
		flex: none;
		color: var(--st-accent);
	}
</style>
