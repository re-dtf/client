<script lang="ts">
	let { commentsCount, sorting, onSortingChange } = $props<{
		commentsCount: number;
		sorting: string;
		onSortingChange: (event: Event) => void;
	}>();
</script>

<div class="header">
	<h3>
		<span class="header-icon">💬</span>
		Комментарии
		{#if commentsCount > 0}
			<span class="count">{commentsCount}</span>
		{/if}
	</h3>
	<select value={sorting} onchange={onSortingChange}>
		<option value="date">Свежие</option>
		<option value="hotness">Популярные</option>
	</select>
</div>

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.header h3 {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.4em;
		color: var(--comment-header-color, inherit);
	}

	.header-icon {
		font-size: 1.1em;
	}

	.count {
		font-size: 0.75em;
		color: var(--comment-count-color, #888);
		background: var(--comment-breadcrumb-bg, rgba(0,0,0,0.05));
		padding: 2px 8px;
		border-radius: 12px;
		font-weight: 500;
	}

	select {
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid var(--comment-select-border, #ccc);
		background: var(--comment-select-bg, transparent);
		color: var(--comment-select-color, inherit);
		font-weight: 500;
		cursor: pointer;
		outline: none;
	}
</style>
