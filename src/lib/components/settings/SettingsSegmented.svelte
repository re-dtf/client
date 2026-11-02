<script lang="ts" generics="T extends string | number">
	/*
	 * Сегментированный выбор из нескольких вариантов в одной «таблетке»: выбранный выделен цветом.
	 * Цвет варианта (`tone`) — любая CSS-переменная или цвет, по умолчанию акцент окна.
	 */
	let { options, value, label, disabled = false, onchange }: {
		options: { value: T; title: string; tone?: string }[];
		value: T;
		label: string;
		disabled?: boolean;
		onchange: (value: T) => void;
	} = $props();
</script>

<div class="segmented" role="group" aria-label={label}>
	{#each options as option (option.value)}
		<button
			class="segment"
			type="button"
			style:--tone={option.tone}
			aria-pressed={option.value === value}
			{disabled}
			onclick={() => onchange(option.value)}
		>
			{option.title}
		</button>
	{/each}
</div>

<style>
	.segmented {
		display: inline-flex;
		flex: none;
		gap: 2px;
		padding: 3px;
		border-radius: 19px;
		background: var(--st-button);
	}

	.segment {
		min-width: 36px;
		min-height: 32px;
		padding: 0 10px;
		border-radius: 16px;
		color: var(--st-muted);
		font-size: 14px;
		cursor: pointer;
		transition:
			background-color var(--duration-base),
			color var(--duration-base);
	}

	.segment:hover:not(:disabled):not([aria-pressed='true']) {
		background: var(--st-button-hover);
	}

	.segment[aria-pressed='true'] {
		background: var(--st-card);
		box-shadow: var(--st-card-shadow-soft);
		color: var(--tone, var(--st-accent));
		font-weight: 500;
	}

	/* Отключённый переключатель остаётся виден, но не нажимается */
	.segment:disabled {
		cursor: default;
		opacity: 0.45;
	}

	.segment:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 1px;
	}
</style>
