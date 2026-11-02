<script lang="ts">
	import type { Snippet } from 'svelte';

	/* Кнопка настроек: обычная серая, «suggested» (акцент) и «destructive» (красный текст). С href это ссылка в новой вкладке */
	let { variant = 'flat', disabled = false, href, onclick, children }: {
		variant?: 'flat' | 'suggested' | 'destructive';
		disabled?: boolean;
		href?: string;
		onclick?: () => void;
		children: Snippet;
	} = $props();
</script>

{#if href}
	<a class="btn btn--{variant}" {href} target="_blank" rel="noopener noreferrer">
		{@render children()}
	</a>
{:else}
	<button class="btn btn--{variant}" type="button" {disabled} {onclick}>
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		min-height: 38px;
		padding: 0 20px;
		border-radius: 19px;
		font-size: 14px;
		font-weight: 500;
		line-height: 20px;
		cursor: pointer;
		transition: background-color var(--duration-base), opacity var(--duration-base);
	}

	.btn--flat {
		background: var(--st-button);
	}

	.btn--flat:not(:disabled):hover {
		background: var(--st-button-hover);
	}

	.btn--suggested {
		background: var(--st-accent);
		color: #fff;
	}

	.btn--suggested:not(:disabled):hover {
		filter: brightness(0.93);
	}

	.btn--destructive {
		background: var(--st-button);
		color: var(--st-danger);
	}

	.btn--destructive:not(:disabled):hover {
		background: var(--st-button-hover);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.btn:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}
</style>
