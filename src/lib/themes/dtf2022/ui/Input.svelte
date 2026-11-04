<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { value = $bindable(''), type = 'text', ...rest }: HTMLInputAttributes = $props();
</script>

<div class="field">
	<label class="field__wrapper">
		<input {type} bind:value {...rest} />
	</label>
</div>

<style>
	.field {
		line-height: 24px;
		margin-bottom: 1rem;
	}

	.field__wrapper {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		height: 48px;
		padding: 0 11px;
		font-size: 16px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-input);
		border-radius: 8px;
		transition: background-color 0.1s linear, border-color 0.1s linear, box-shadow 0.1s linear;
	}

	/* focus-within — видимый фокус с клавиатуры (у самого input outline сброшен) */
	.field__wrapper:hover,
	.field__wrapper:focus-within {
		background-color: var(--bg-card);
		border-color: var(--border-focus);
		box-shadow: var(--focus-ring);
	}

	input {
		width: 100%;
		height: 100%;
		line-height: 1;
		background-color: transparent;
	}
</style>
