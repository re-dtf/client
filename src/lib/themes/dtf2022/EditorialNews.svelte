<script lang="ts">
	import { resolve } from '$app/paths';
	import { api } from '$lib/api/index.svelte';
	import type { Post } from '$lib/api/types';
	import { feed } from '$lib/feed.svelte';
	import { getPostPath, openPost } from '$lib/navigation';
	import { clickOnKey } from './a11y';
	import { formatNumber } from './format';
	import Preloader from './ui/Preloader.svelte';
	import { untrack } from 'svelte';

	// Новости — дополнение к ленте: пока грузятся или при ошибке виджета просто нет
	let news = $state.raw<Post[]>([]);
	let lastId = 0;
	let loading = $state(false);
	let hasMore = $state(true);

	// Как у DTF: порция приходит с сервера по id последней новости, «Показать ещё» запрашивает следующую
	async function loadMore(replace = false) {
		if (loading) return;
		loading = true;
		try {
			const page = await api.getEditorialNews(replace ? 0 : lastId);
			news = replace ? page.items : [...news, ...page.items];
			lastId = page.lastId ?? lastId;
			hasMore = page.items.length > 0;
		} catch (e) {
			console.error('Failed to load news:', e);
		} finally {
			loading = false;
		}
	}

	loadMore();

	// Клик по логотипу или повторный клик по вкладке ленты: обновить новости
	let handledRefresh = feed.refreshCount;
	$effect(() => {
		if (feed.refreshCount !== handledRefresh) {
			handledRefresh = feed.refreshCount;
			untrack(() => loadMore(true));
		}
	});
</script>

{#if news.length > 0}
	<section class="news-widget" class:news-widget--loading={loading} aria-label="Новости">
		{#each news as item (item.sourceId + '_' + item.id)}
			{@const href = resolve(getPostPath(item) as any)}
			{@const commentsHref = resolve(getPostPath(item, 'comments') as any)}
			<div class="news-item">
				<a {href} class="news-item__title" onclick={(e) => openPost(e, item)}>{item.title}</a>
				<a href={commentsHref} class="comments-counter" aria-label="Комментарии: {item.commentsCount}" onclick={(e) => openPost(e, item, { toComments: true })}>
					<span class="comments-counter__icon">
						<svg class="icon" width="16" height="16" aria-hidden="true">
							<use href="/icons.svg#v_comments"></use>
						</svg>
					</span>
					<span class="comments-counter__number">{formatNumber(item.commentsCount)}</span>
				</a>
			</div>
		{/each}

		{#if hasMore}
			<div class="news-widget__footer">
				{#if loading}
					<Preloader />
				{:else}
					<div class="news-widget__load-more" role="button" tabindex="0" onclick={() => loadMore()} onkeydown={clickOnKey}>
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
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 20px;
		border-radius: 8px;
		background: var(--bg-card);
	}

	.news-item {
		position: relative;
	}

	.news-item__title {
		margin-right: 4px;
		font-size: 17px;
		line-height: 26px;
	}

	.news-item__title::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.comments-counter {
		position: relative;
		z-index: 1;
		top: 3px;
		display: inline-flex;
		align-items: center;
		vertical-align: top;
		color: var(--text-muted);
	}

	.comments-counter__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		/* Делает иконку контейнером для круга ::before */
		transform: translateZ(0);
	}

	/* Круг подсветки при наведении, у «малого» счётчика DTF он 22px */
	.comments-counter__icon::before {
		content: '';
		position: absolute;
		z-index: 1;
		width: 22px;
		height: 22px;
		border-radius: 100%;
		background-color: var(--color-comments-hover-bg);
		opacity: 0;
	}

	.comments-counter__number {
		margin-left: 4px;
		font-size: 12px;
		line-height: 22px;
		font-weight: 500;
	}

	@media (max-width: 639px) {
		.news-widget {
			margin-top: 0;
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
		display: inline-flex;
		align-items: center;
		font-size: 17px;
		line-height: 26px;
		font-weight: 500;
		cursor: pointer;
		user-select: none;
	}

	.news-widget__load-more .icon {
		margin-left: 6px;
	}

	@media (max-width: 719px) {
		.news-widget__load-more {
			width: 100%;
			height: 100%;
		}
	}

	@media (hover: hover) {
		.news-item__title:hover,
		.news-widget__load-more:hover {
			color: var(--text-link);
		}

		.comments-counter:hover {
			color: var(--color-comments-hover);
		}

		.comments-counter:hover .comments-counter__icon::before {
			opacity: 0.12;
		}
	}
</style>
