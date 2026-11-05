<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import LoginContent from '$lib/components/LoginContent.svelte';
	import { closeOverlay } from '$lib/navigation';
</script>

<ThemeLoader componentName="LoginModal">
	<!-- Фолбэк для тем без своего окна входа -->
	<LoginContent>
		{#snippet backButton()}
			<button class="back-link" onclick={closeOverlay}>← Назад</button>
		{/snippet}
	</LoginContent>
</ThemeLoader>

<style>
	.back-link {
		background: var(--bg-button, #f4f5f7);
		border: 1px solid var(--border-color, transparent);
		border-radius: 6px;
		color: var(--text-primary, #333);
		cursor: pointer;
		font-size: 14px;
		padding: 8px 16px;
		font-weight: 500;
		transition: background var(--duration-base);
	}
	.back-link:hover {
		background: var(--bg-button-hover, #e4e5e7);
	}
</style>
