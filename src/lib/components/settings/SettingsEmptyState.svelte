<script lang="ts">
	let { text = 'Выберите раздел для настройки' }: { text?: string } = $props();
</script>

<div class="empty-state">
	<p class="empty-text">{text}</p>
</div>

<style>
	.empty-state {
		display: grid;
		place-items: center;
		min-height: 420px;
		padding: 40px 20px;
		color: var(--st-muted);
	}

	.empty-text {
		margin: 0;
		font-size: 15px;
		line-height: 22px;
		color: var(--st-muted);
	}
</style>
