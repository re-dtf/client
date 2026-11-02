<script lang="ts">
	import type { Snippet } from 'svelte';

	/*
	 * Группа настроек в духе libadwaita: заголовок, пояснение и белая карточка со строками на мягкой тени.
	 * Цвета берутся из переменных окна (SettingsScreen).
	 */
	let { title, description, children }: { title?: string; description?: string; children: Snippet } = $props();
</script>

<section class="group">
	{#if title}
		<h3 class="group__title">{title}</h3>
	{/if}
	{#if description}
		<p class="group__description">{description}</p>
	{/if}
	<div class="group__list">
		{@render children()}
	</div>
</section>

<style>
	.group {
		margin-bottom: 36px;
	}

	.group__title {
		margin: 0 4px 6px;
		font-size: 17px;
		font-weight: 500;
		line-height: 24px;
	}

	.group__description {
		margin: 0 4px 12px;
		color: var(--st-muted);
		font-size: 14px;
		line-height: 20px;
	}

	.group__title + .group__list {
		margin-top: 12px;
	}

	.group__list {
		overflow: hidden;
		border-radius: 14px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow);
	}
</style>
