<script lang="ts">
	let { text = 'Выберите раздел в меню слева' }: { text?: string } = $props();
</script>

<div class="empty-state">
	<p class="empty-text">{text}</p>
</div>

<style>
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		width: 100%;
		height: 100%;
		min-height: 100%;
		padding: 40px 20px;
		box-sizing: border-box;
		text-align: center;
		color: var(--st-muted);
	}

	.empty-text {
		margin: 0;
		font-size: 15px;
		line-height: 22px;
		text-align: center;
		color: var(--st-muted);
	}
</style>
