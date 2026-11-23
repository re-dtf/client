<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { editorialNews } from '$lib/editorialNews.svelte';
	import { getPostPath, openPost } from '$lib/navigation';
	import { filterNewsItems } from '$lib/storage/filter.svelte';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { reducedMotion } from '$lib/motion';
	import { clickOnKey } from '../dtf2022/a11y';
	import { isPostHidden } from '../dtf2022/actions.svelte';
	import { formatNumber } from '../dtf2022/format';
	import Preloader from '../dtf2022/ui/Preloader.svelte';

	const revealed = new SvelteSet<string>();
	const rows = $derived(filterNewsItems(editorialNews.items, { revealed, isHidden: isPostHidden }));
</script>

{#if rows.length > 0 || (editorialNews.items.length > 0 && editorialNews.hasMore)}
	<section class="news-widget" class:news-widget--loading={editorialNews.loading} aria-label="Новости">
		{#each rows as { item, key, match } (key)}
			<div class={['news-item', { 'news-item--filtered': !!match }]} in:slide={{ duration: reducedMotion() ? 0 : 350, easing: cubicOut }}>
				{#if match}
					<span class="news-item__filtered-text">
						{match.kind === 'user' ? 'Новость скрыта: вы скрыли автора' : `Новость скрыта фильтром (${match.rule})`}
					</span>
					<button type="button" class="news-item__reveal" onclick={() => revealed.add(key)}>
						{match.kind === 'user' ? 'Показать один раз' : 'Показать'}
					</button>
				{:else}
					{@const href = resolve(getPostPath(item) as any)}
					{@const commentsHref = resolve(getPostPath(item, 'comments') as any)}
					<a {href} class="news-item__title" onclick={(e) => openPost(e, item)}>{item.title}</a>
					{#if !item.commentsDisabled}
						<a href={commentsHref} class="comments-counter" aria-label="Комментарии: {item.commentsCount}" onclick={(e) => openPost(e, item, { toComments: true })}>
							<span class="comments-counter__icon">
								<svg class="icon" width="16" height="16" aria-hidden="true">
									<use href="#v_comments"></use>
								</svg>
							</span>
							<span class="comments-counter__number">{formatNumber(item.commentsCount)}</span>
						</a>
					{/if}
				{/if}
			</div>
		{/each}

		{#if editorialNews.hasMore}
			<div class="news-widget__footer">
				{#if editorialNews.loading}
					<Preloader />
				{:else}
					<div class="news-widget__load-more" role="button" tabindex="0" onclick={() => editorialNews.loadMore()} onkeydown={clickOnKey}>
						<span>Показать ещё</span>
						<svg height="9" width="10" class="icon" aria-hidden="true">
							<use href="#v_arrow_down"></use>
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

	.news-item--filtered {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.news-item__filtered-text {
		min-width: 0;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 22px;
	}

	.news-item__reveal {
		flex-shrink: 0;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-blue);
		font-size: 14px;
		font-weight: 500;
		line-height: 22px;
		cursor: pointer;
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

	/* Круг подсветки при наведении, как у «малого» счётчика DTF */
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

	.news-widget__footer:first-child {
		margin-top: 0;
	}

	.news-widget__load-more {
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;
		font-size: 17px;
		line-height: 26px;
		font-weight: 500;
		cursor: pointer;
		user-select: none;
	}

	.news-widget__load-more .icon {
		margin-left: 6px;
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
