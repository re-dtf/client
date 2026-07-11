<script lang="ts">
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';

	function goBack() {
		history.back();
	}
</script>

<div class="dialog-box">
	<div class="actions">
		<button class="back-link" onclick={goBack}>← Закрыть настройки</button>
	</div>
	<ThemeLoader componentName="Settings" />
</div>

<style>
	.dialog-box {
		background: #fff;
		border-radius: 12px;
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		padding: 24px;
		box-shadow: 0 10px 40px rgba(0,0,0,0.15);
		box-sizing: border-box;
	}
	.actions {
		margin-bottom: 20px;
		display: flex;
		justify-content: flex-end;
	}
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
