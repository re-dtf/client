<script lang="ts" generics="T extends string | number">
	import Popover from './Popover.svelte';

	/** Выпадающий список, как v-select у DTF: поле с шевроном и список под ним на всю ширину */
	let {
		value = $bindable(),
		options,
		placeholder = '',
		searchable = false
	}: {
		value?: T;
		options: { value: T; label: string }[];
		placeholder?: string;
		/** Строка поиска в списке: для длинных списков */
		searchable?: boolean;
	} = $props();

	let open = $state(false);
	let selected = $derived(options.find((option) => option.value === value));
</script>

<div class="select">
	<Popover bind:open items={options} selected={value} onselect={(next) => (value = next)} width="100%" align="left" label={placeholder} {searchable}>
		<button type="button" class={['select__field', { 'select__field--focused': open }]} aria-haspopup="listbox" aria-expanded={open} onclick={() => (open = !open)}>
			{#if selected}
				<span class="select__selected">{selected.label}</span>
			{:else}
				<span class="select__placeholder">{placeholder}</span>
			{/if}
			<svg class="select__chevron icon" width="20" height="20" aria-hidden="true">
				<use href="/icons.svg#{open ? 'v_chevron_up' : 'v_chevron_down'}"></use>
			</svg>
		</button>
	</Popover>
</div>

<style>
	.select {
		--popover-anchor-width: 100%;
		--popover-gap: 10px;
		--popover-max-width: 100%;
		width: 100%;
	}

	.select__field {
		position: relative;
		width: 100%;
		min-height: 38px;
		box-sizing: border-box;
		padding: 7px 42px 7px 11px;
		border: 1px solid var(--border-input);
		border-radius: 8px;
		background-color: var(--bg-secondary);
		color: inherit;
		font-size: 16px;
		line-height: 1.5em;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.1s linear, border-color 0.1s linear, box-shadow 0.1s linear;
	}

	@media (hover: hover) {
		.select__field:hover {
			border-color: var(--border-focus);
			background-color: var(--bg-card);
			box-shadow: var(--focus-ring);
		}
	}

	.select__field--focused {
		z-index: 5;
		border-color: var(--color-blue);
		background-color: var(--bg-card);
		box-shadow: var(--focus-ring);
	}

	.select__placeholder {
		color: var(--text-subtle);
	}

	.select__chevron {
		position: absolute;
		top: 8px;
		right: 11px;
		color: var(--text-subtle);
	}

	.select__field--focused .select__chevron {
		color: var(--text-primary);
	}
</style>
