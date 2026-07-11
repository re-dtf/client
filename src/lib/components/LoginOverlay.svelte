<script lang="ts">
	import LoginContent from '$lib/components/LoginContent.svelte';

	function goBack() {
		history.back();
	}
</script>

<LoginContent>
	{#snippet backButton()}
		<button class="back-link" onclick={goBack}>← Назад</button>
	{/snippet}
</LoginContent>

<style>
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
