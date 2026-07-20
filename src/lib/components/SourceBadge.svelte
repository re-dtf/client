<script lang="ts">
	import { sourceRegistry } from '$lib/api/sources/registry.svelte';

	let { sourceId } = $props<{ sourceId?: string }>();

	let source = $derived(
		sourceId && sourceId !== 'dtf'
			? sourceRegistry.activeSources.find(s => s.manifest.id === sourceId)
			: null
	);
</script>

{#if source}
	<span class="source-badge" title={source.manifest.description}>
		{#if source.manifest.icon}
			<img src={source.manifest.icon} alt={source.manifest.name} class="source-icon" />
		{/if}
		{source.manifest.name}
	</span>
{/if}

<style>
	.source-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.75em;
		padding: 2px 6px;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 4px;
		color: #666;
		margin-left: 8px;
		vertical-align: middle;
	}
	.source-icon {
		width: 12px;
		height: 12px;
		object-fit: contain;
	}
</style>
