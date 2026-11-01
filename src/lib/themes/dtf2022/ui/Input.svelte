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
		background-color: #f5f5f5;
		border: 1px solid rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		transition: background-color 0.1s linear, border-color 0.1s linear, box-shadow 0.1s linear;
	}

	/* focus-within — видимый фокус с клавиатуры (у самого input outline сброшен) */
	.field__wrapper:hover,
	.field__wrapper:focus-within {
		background-color: #fff;
		border-color: #bdd6fa;
		box-shadow: 0 0 0 3px rgba(70, 131, 217, 0.12);
	}

	input {
		width: 100%;
		height: 100%;
		line-height: 1;
		background-color: transparent;
	}
</style>
