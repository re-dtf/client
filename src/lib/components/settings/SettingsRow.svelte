<script lang="ts">
	import type { Snippet } from 'svelte';

	/*
	 * Строка группы: слева заголовок и пояснение, справа то, что передали (переключатель, значение, кнопка).
	 * tag="label" делает кликабельной всю строку.
	 */
	let { title, subtitle, tag = 'div', prefix, children }: {
		title: string;
		subtitle?: string;
		tag?: 'div' | 'label';
		prefix?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<svelte:element this={tag} class="row">
	{@render prefix?.()}
	<span class="row__text">
		<span class="row__title">{title}</span>
		{#if subtitle}
			<span class="row__subtitle">{subtitle}</span>
		{/if}
	</span>
	{@render children?.()}
</svelte:element>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 16px;
		min-height: 60px;
		padding: 12px 20px;
	}

	.row:not(:first-child) {
		border-top: 1px solid var(--st-separator);
	}

	label.row {
		position: relative;
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	label.row:hover {
		background: var(--st-hover);
	}

	.row__text {
		display: flex;
		flex: 1 1 180px;
		flex-direction: column;
		min-width: 0;
	}

	.row__title {
		font-size: 15px;
		line-height: 22px;
	}

	.row__subtitle {
		color: var(--st-muted);
		font-size: 13px;
		line-height: 19px;
	}
</style>
