<script lang="ts">
	import type { Post } from '$lib/api/types';
	import type { FilterMatch } from '$lib/storage/filter.svelte';

	let {
		post,
		match,
		onreveal
	}: {
		post: Post;
		match: FilterMatch;
		onreveal: () => void;
	} = $props();

	// В личном блоге подсайт — это сам автор, второй раз имя не показываем
	let isPersonalBlog = $derived(
		!post.subsite || post.subsite.id === post.author?.id || post.subsite.name === post.author?.name
	);
</script>

<article class="feed-item">
	<div class="filtered-card">
		<div class="filtered-card__icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
				<line x1="1" y1="1" x2="23" y2="23" />
			</svg>
		</div>

		<div class="filtered-card__body">
			<div class="filtered-card__title">
				<span>{match.kind === 'user' ? 'Вы скрыли автора' : 'Пост скрыт фильтром'}</span>
				{#if match.rule && match.kind !== 'user'}
					<span class="filtered-card__badge">{match.rule}</span>
				{/if}
			</div>
			<div class="filtered-card__meta">
				{#if !isPersonalBlog && post.subsite?.name}
					<span class="filtered-card__subsite">{post.subsite.name}</span>
					<span class="filtered-card__dot">·</span>
				{/if}
				<span class="filtered-card__author">Автор: {post.author?.name || 'Аноним'}</span>
			</div>
		</div>

		<button type="button" class="filtered-card__action" onclick={onreveal}>
			Показать
		</button>
	</div>
</article>

<style>
	.feed-item {
		width: 100%;
		max-width: var(--content-width);
		margin: 28px auto 0;
	}

	.filtered-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px var(--island-offset-x, 16px);
		background: var(--bg-card, #fff);
		border-radius: 8px;
		box-sizing: border-box;
	}

	.filtered-card__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--text-muted, #777);
		opacity: 0.7;
	}

	.filtered-card__body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.filtered-card__title {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 15px;
		font-weight: 500;
		line-height: 20px;
		color: var(--text-primary);
	}

	.filtered-card__badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--st-button, rgba(0, 0, 0, 0.05));
		color: var(--text-muted, #666);
		font-size: 12px;
		font-weight: 600;
		line-height: 16px;
	}

	.filtered-card__meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		line-height: 18px;
		color: var(--text-muted, #777);
	}

	.filtered-card__dot {
		opacity: 0.5;
	}

	.filtered-card__action {
		flex-shrink: 0;
		padding: 6px 16px;
		border-radius: 16px;
		background: var(--st-button, rgba(0, 0, 0, 0.05));
		border: none;
		color: var(--color-blue, #1976d2);
		font-size: 13px;
		font-weight: 600;
		line-height: 20px;
		cursor: pointer;
		transition: background-color 0.15s ease, opacity 0.15s ease;
	}

	.filtered-card__action:hover {
		background: var(--st-hover, rgba(0, 0, 0, 0.1));
	}

	@media (max-width: 859px) {
		.feed-item {
			margin-top: 20px;
		}
	}

	@media (max-width: 639px) {
		.filtered-card {
			padding: 14px var(--island-offset-x, 16px);
			border-radius: 0;
		}
	}
</style>
