<script lang="ts">
	let { type }: { type: string } = $props();
</script>

<div class="unknown-block">
	<span class="unknown-block__title">Неизвестный блок</span>
	<span class="unknown-block__content">Содержимое: {type}</span>
</div>

<style>
	.unknown-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 16px;
		border: 1px dashed var(--text-muted);
		border-radius: 8px;
		color: var(--text-muted);
		font-size: 14px;
		overflow-wrap: anywhere;
	}

	.unknown-block__title {
		font-weight: 500;
	}
</style>
