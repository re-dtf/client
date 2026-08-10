<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'default',
		size = 'medium',
		disabled = false,
		fullWidth = false,
		type = 'button',
		icon = '',
		iconSprite = '/icons.svg',
		label = '',
		onclick,
		class: className = '',
		children,
		...rest
	} = $props<{
		variant?: 'default' | 'blue' | 'ghost';
		size?: 'medium' | 'small';
		disabled?: boolean;
		fullWidth?: boolean;
		type?: 'button' | 'submit' | 'reset';
		icon?: string;
		iconSprite?: string;
		label?: string;
		onclick?: (e: MouseEvent) => void;
		class?: string;
		children?: Snippet;
		[key: string]: any;
	}>();

	let variantClass = $derived(variant === 'blue' ? 'btn--blue' : variant === 'ghost' ? 'btn--ghost' : '');
	let sizeClass = $derived(size === 'small' ? 'btn--small' : '');
</script>

<button
	{type}
	{disabled}
	class={['btn', variantClass, sizeClass, { 'btn--disabled': disabled, 'submit-button': fullWidth }, className]}
	{onclick}
	{...rest}
>
	{#if icon}
		<div class="btn__icon">
			<svg height="24" width="24" class="icon">
				<use href={`${iconSprite}#${icon}`}></use>
			</svg>
		</div>
	{/if}

	{#if children}
		<span class="btn__label">
			{@render children()}
		</span>
	{:else if label}
		<span class="btn__label">
			{label}
		</span>
	{/if}
</button>
