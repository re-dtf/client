<script lang="ts">
	import { resolve } from '$app/paths';
	import { api } from '$lib/api/index.svelte';
	import type { Post } from '$lib/api/types';
	import { getPostPath, openPost } from '$lib/navigation';
	import { clickOnKey } from './a11y';
	import { formatNumber } from './format';
	import Preloader from './ui/Preloader.svelte';

	// Новости — дополнение к ленте: пока грузятся или при ошибке виджета просто нет
	let news = $state.raw<Post[]>([]);
	let lastId = 0;
	let loading = $state(false);
	let hasMore = $state(true);

	// Как у DTF: порция приходит с сервера по id последней новости, «Показать ещё» запрашивает следующую
	async function loadMore() {
		if (loading) return;
		loading = true;
		try {
			const page = await api.getEditorialNews(lastId);
			news = [...news, ...page.items];
			lastId = page.lastId ?? lastId;
			hasMore = page.items.length > 0;
		} catch (e) {
			console.error('Failed to load news:', e);
		} finally {
			loading = false;
		}
	}

	loadMore();
</script>

{#if news.length > 0}
	<section class="news-widget" class:news-widget--loading={loading} aria-label="Новости">
		{#each news as item (item.sourceId + '_' + item.id)}
			{@const href = resolve(getPostPath(item) as any)}
			<div class="news-item">
				<a {href} class="news-item__title" onclick={(e) => openPost(e, item)}>{item.title}</a>
				<a {href} class="comments-counter" aria-label="Комментарии: {item.commentsCount}" onclick={(e) => openPost(e, item)}>
					<svg class="icon" width="16" height="16" aria-hidden="true">
						<use href="/icons.svg#v_comments"></use>
					</svg>
					<span class="comments-counter__number">{formatNumber(item.commentsCount)}</span>
				</a>
			</div>
		{/each}

		{#if hasMore}
			<div class="news-widget__footer">
				{#if loading}
					<Preloader />
				{:else}
					<div class="news-widget__load-more" role="button" tabindex="0" onclick={loadMore} onkeydown={clickOnKey}>
						<span>Показать ещё</span>
						<svg height="9" width="10" class="icon" aria-hidden="true">
							<use href="/icons.svg#v_arrow_down"></use>
						</svg>
					</div>
				{/if}
			</div>
		{/if}
	</section>
{/if}

<style>
	.news-widget {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		max-width: 640px;
		padding: 20px;
		border-radius: 8px;
		background: var(--bg-card);
	}

	.news-item__title {
		margin-right: 4px;
		font-size: 17px;
		line-height: 26px;
	}

	.news-item__title:hover {
		color: var(--text-link);
	}

	.comments-counter {
		position: relative;
		top: 3px;
		display: inline-flex;
		align-items: center;
		vertical-align: top;
		color: var(--text-muted);
	}

	.comments-counter__number {
		margin-left: 4px;
		font-size: 12px;
		line-height: 22px;
		font-weight: 500;
	}

	@media (max-width: 639px) {
		.news-widget {
			padding: 20px 16px;
			border-radius: 0;
		}
	}

	.news-widget--loading {
		pointer-events: none;
	}

	.news-widget__footer {
		display: flex;
		align-items: center;
		height: 26px;
		margin-top: 4px;
	}

	.news-widget__load-more {
		font-size: 17px;
		line-height: 26px;
		font-weight: 500;
		cursor: pointer;
	}

	.news-widget__load-more:hover {
		color: var(--text-link);
	}

	.news-widget__load-more .icon {
		margin-left: 6px;
	}
</style>
