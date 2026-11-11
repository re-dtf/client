<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
</script>

<svelte:head>
	<title>Вход - reDTF</title>
</svelte:head>

<div class="standalone-login-page">
	<ThemeLoader componentName="LoginModal" />
</div>

<style>
	/* Те же переменные, что и у модального оверлея в +layout.svelte */
	.standalone-login-page {
		position: fixed;
		inset: 0;
		z-index: 999;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--modal-padding, 20px);
		overflow-y: var(--modal-overflow-y, visible);
		background: var(--modal-backdrop, rgba(0, 0, 0, 0.5));
	}

	@media (max-width: 719px) {
		.standalone-login-page {
			padding: 0;
		}
	}
</style>
