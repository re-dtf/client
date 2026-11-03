<script lang="ts">
	/* Значок строки: цветная плитка с контурной иконкой (path в сетке 24×24) */
	let { path, tint = 'var(--st-accent)' }: { path: string; tint?: string } = $props();
</script>

<span class="tile" style:--tint={tint}>
	<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
		<path d={path} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
</span>

<style>
	.tile {
		display: grid;
		flex: none;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--tint) 14%, transparent);
		color: var(--tint);
	}
</style>
