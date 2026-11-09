<script lang="ts">
	/*
	 * Пометка репоста над шапкой. У DTF 2022–23 это была строка `.content-header-repost`: иконка v_repost
	 * и «<кто> сделал репост». Теперь репост — ответ со своим автором, он и так виден в шапке, поэтому
	 * остаётся иконка и слово «Репост».
	 */
	let { variant = 'card' }: { variant?: 'card' | 'page' } = $props();
</script>

<div class={['repost-label', { 'repost-label--card': variant === 'card' }]}>
	<svg class="icon" width="20" height="20" aria-hidden="true">
		<use href="/icons.svg#v_repost"></use>
	</svg>
	Репост
</div>

<style>
	.repost-label {
		display: flex;
		align-items: center;
		margin-bottom: 8px;
		color: var(--text-muted);
		font-size: 15px;
		line-height: 22px;
		white-space: nowrap;
	}

	.repost-label .icon {
		flex-shrink: 0;
		margin: 0 9px 0 1px;
	}

	/* Как .content-header-repost: 40px вместе с отступом сверху, шапка поднимается на 3px */
	.repost-label--card {
		box-sizing: border-box;
		width: 100%;
		height: 40px;
		margin-bottom: -3px;
		padding: 16px var(--island-offset-x, 16px) 0;
	}
</style>
