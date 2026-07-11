<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';

	function goBack() {
		history.back();
	}
</script>

<div class="overlay-container">
	<div class="actions">
		<button class="back-link" onclick={goBack}>← Закрыть настройки</button>
	</div>
	<ThemeLoader componentName="Settings" />
</div>

<style>
	.overlay-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px 0;
	}
	.actions {
		margin-bottom: 20px;
	}
	.back-link {
		background: none;
		border: none;
		color: #1976d2;
		cursor: pointer;
		font-size: inherit;
		padding: 0;
	}
	.back-link:hover {
		text-decoration: underline;
	}
</style>
