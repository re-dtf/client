<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/*
	 * Размеры настраиваются снаружи CSS-переменными (наследуются от любого предка):
	 * --btn-height, --btn-min-width, --btn-font-size, --btn-offset, --btn-icon-size,
	 * --btn-radius, --btn-icon-margin-left, --btn-icon-margin-right.
	 */
	let {
		variant = 'default',
		disabled = false,
		fullWidth = false,
		type = 'button',
		icon = '',
		iconSize = 24,
		label = '',
		children,
		...rest
	}: {
		variant?: 'default' | 'blue';
		disabled?: boolean;
		fullWidth?: boolean;
		icon?: string;
		iconSize?: number;
		label?: string;
		children?: Snippet;
	} & HTMLButtonAttributes = $props();
</script>

<button
	{type}
	{disabled}
	class={['btn', { 'btn--blue': variant === 'blue', 'btn--disabled': disabled, 'btn--full': fullWidth }]}
	{...rest}
>
	{#if icon}
		<span class="btn__icon">
			<svg height={iconSize} width={iconSize} class="icon" aria-hidden="true">
				<use href="/icons.svg#{icon}"></use>
			</svg>
		</span>
	{/if}

	{#if children || label}
		<span class="btn__label">
			{#if children}{@render children()}{:else}{label}{/if}
		</span>
	{/if}
</button>

<style>
	.btn {
		--offset: var(--btn-offset, 16px);
		--icon-size: var(--btn-icon-size, 24px);

		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		grid-column: span 3;
		height: var(--btn-height, 48px);
		min-width: var(--btn-min-width, 44px);
		border-radius: var(--btn-radius, 8px);
		background-color: var(--bg-button, #fff);
		color: var(--text-primary, #000);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(0, 0, 0, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.12), inset 1px 0 0 rgba(0, 0, 0, 0.06), inset -1px 0 0 rgba(0, 0, 0, 0.06);
		font-size: var(--btn-font-size, 16px);
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
	}

	.btn:hover {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(0, 0, 0, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.12), inset 1px 0 0 rgba(0, 0, 0, 0.06), inset -1px 0 0 rgba(0, 0, 0, 0.06);
	}

	.btn:active {
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.12), inset 1px 0 0 rgba(0, 0, 0, 0.06), inset -1px 0 0 rgba(0, 0, 0, 0.06);
		transform: translateY(1px);
	}

	.btn--blue {
		background-color: var(--bg-submit-button);
		color: var(--text-submit-button);
		box-shadow: 0 1px 2px rgba(70, 131, 217, 0.48), inset 0 -1px 0 rgba(0, 0, 0, 0.12);
	}

	.btn--blue:hover {
		background-color: var(--bg-submit-button--hover);
	}

	.btn--blue:active {
		box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.12);
	}

	.btn--disabled {
		pointer-events: none;
		opacity: 0.5;
	}

	.btn--full {
		width: 100%;
	}

	.btn__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--icon-size);
		height: var(--icon-size);
		margin-left: var(--btn-icon-margin-left, var(--offset));
		margin-right: var(--btn-icon-margin-right, calc(var(--offset) * -0.5 - var(--icon-size)));
	}

	.btn__icon:only-child {
		margin: 0;
	}

	.btn__label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0 var(--offset);
		margin: 0 auto;
	}
</style>
