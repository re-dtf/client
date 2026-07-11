<script lang="ts">
	let { inline = false } = $props<{ inline?: boolean }>();
</script>

<div class="spinner-container" class:inline>
	<div class="spinner"></div>
</div>

<style>
	.spinner-container {
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.spinner-container:not(.inline) {
		padding: 60px 0;
	}
	.spinner {
		width: 30px;
		height: 30px;
		border: 3px solid #ddd;
		border-top-color: #007bff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
