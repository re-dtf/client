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
		background: #f4f5f7;
		border: none;
		border-radius: 6px;
		color: #333;
		cursor: pointer;
		font-size: 14px;
		padding: 8px 16px;
		font-weight: 500;
		transition: background 0.2s;
	}
	.back-link:hover {
		background: #e4e5e7;
	}
</style>
