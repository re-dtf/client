<script lang="ts">
	let {
		type,
		postId,
		commentId,
		sourceId = 'dtf'
	}: {
		type: string;
		postId?: number | string;
		commentId?: number | string;
		sourceId?: string;
	} = $props();

	let dtfUrl = $derived.by(() => {
		if (!postId || (sourceId && sourceId !== 'dtf')) return null;
		return commentId ? `https://dtf.ru/${postId}?comment=${commentId}` : `https://dtf.ru/${postId}`;
	});
</script>

<div class="unknown-block">
	<span class="unknown-block__title">Неизвестный блок</span>
	<span class="unknown-block__content">re:DTF пока не поддерживает блоки типа {type}.</span>
	{#if dtfUrl}
		<a class="unknown-block__button" href={dtfUrl} target="_blank" rel="noreferrer" onclick={(e) => e.stopPropagation()}>
			Открыть на DTF
		</a>
	{/if}
</div>

<style>
	.unknown-block {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
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

	.unknown-block .unknown-block__button {
		display: inline-flex;
		align-items: center;
		margin-top: 6px;
		padding: 6px 12px;
		border: none;
		border-radius: 6px;
		background-color: var(--bg-submit-button, #4683d9);
		color: var(--text-submit-button, #fff);
		font-size: 13px;
		font-weight: 500;
		line-height: 18px;
		text-decoration: none;
		cursor: pointer;
		user-select: none;
	}

	.unknown-block .unknown-block__button:hover {
		background-color: var(--bg-submit-button--hover, #437cce);
		color: var(--text-submit-button, #fff);
		text-decoration: none;
	}
</style>
