<script lang="ts">
	import { resolve } from '$app/paths';
	import { api } from '$lib/api/index.svelte';
	import { getPostPath, openPost } from '$lib/overlays';
	import { clickOnKey } from './a11y';
	import { formatNumber } from './format';

	const PAGE_SIZE = 4;

	// Новости — дополнение к ленте: пока грузятся или при ошибке виджета просто нет
	const newsPromise = api.getEditorialNews().catch(() => []);
	let visibleCount = $state(PAGE_SIZE);
</script>

{#await newsPromise then news}
	{#if news.length > 0}
		<section class="news-widget" aria-label="Новости">
			{#each news.slice(0, visibleCount) as item (item.sourceId + '_' + item.id)}
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

			{#if visibleCount < news.length}
				<div class="news-widget__footer">
					<div
						class="news-widget__load-more"
						role="button"
						tabindex="0"
						onclick={() => (visibleCount += PAGE_SIZE)}
						onkeydown={clickOnKey}
					>
						<span>Показать ещё</span>
						<svg height="9" width="10" class="icon" aria-hidden="true">
							<use href="/icons.svg#v_arrow_down"></use>
						</svg>
					</div>
				</div>
			{/if}
		</section>
	{/if}
{/await}

<style>
	.news-widget {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		max-width: 640px;
		/* верхний отступ ленты (padding страницы у DTF; ниже него там панель сортировки в 36px — её у нас нет) */
		margin-top: 16px;
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

	.news-widget__footer {
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
