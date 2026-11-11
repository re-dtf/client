<script lang="ts">
	/* Значок источника: картинка по https, а если её нет или она не загрузилась, первая буква названия */
	let { name, icon, size = 44 }: { name: string; icon?: string; size?: number } = $props();

	let broken = $state(false);
	let src = $derived(icon?.startsWith('https://') && !broken ? icon : undefined);
</script>

<span class="avatar" style:width="{size}px" style:height="{size}px" style:font-size="{Math.round(size * 0.42)}px" aria-hidden="true">
	{#if src}
		<img {src} alt="" onerror={() => (broken = true)} />
	{:else}
		{name.trim().charAt(0).toUpperCase()}
	{/if}
</span>

<style>
	.avatar {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 25%;
		background: color-mix(in srgb, var(--st-accent, var(--color-blue, #3584e4)) 16%, transparent);
		color: var(--st-accent, var(--color-blue, #3584e4));
		font-weight: 600;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
