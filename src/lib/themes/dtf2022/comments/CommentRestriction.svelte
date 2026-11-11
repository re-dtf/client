<script lang="ts">
	/** Вместо формы, когда писать нельзя: плашка `.restriction--comments` оригинала (бан, чёрный список, только подписчикам) */
	let { text = '' }: { text?: string } = $props();
</script>

<p class="comment-restriction" role="status">{text || 'Комментирование недоступно'}</p>

<style>
	/* Углы у плашки оригинала прямые: панель блокировки снимает с формы фон, рамку и скругление */
	.comment-restriction {
		margin: 0;
		padding: 10px 15px;
		border: 1px solid var(--border-subtle-2);
		font-size: 15px;
		line-height: 22px;
		overflow-wrap: anywhere;
	}

	.comment-restriction :global(a) {
		color: var(--text-link);
	}
</style>
