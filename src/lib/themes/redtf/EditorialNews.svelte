<script lang="ts" module>
	import type { Post } from '$lib/api/types';

	// Новости переживают закрытие компонента: он создаётся заново при каждом возврате на «Популярное»
	let cache: { news: Post[]; lastId: number; hasMore: boolean; time: number } | undefined;
	const STALE = 5 * 60_000;
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { api } from '$lib/api/index.svelte';
	import { feed } from '$lib/feed.svelte';
	import { getPostPath, openPost } from '$lib/navigation';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { reducedMotion } from '$lib/motion';
	import Reveal from '$lib/components/Reveal.svelte';
	import { clickOnKey } from '../dtf2022/a11y';
	import { formatNumber } from '../dtf2022/format';
	import Preloader from '../dtf2022/ui/Preloader.svelte';
	import { untrack } from 'svelte';

	// Новости — дополнение к ленте: пока грузятся или при ошибке виджета просто нет
	let news = $state.raw<Post[]>(cache?.news ?? []);
	let lastId = cache?.lastId ?? 0;
	let loading = $state(false);
	let hasMore = $state(cache?.hasMore ?? true);
	// Первая загрузка закончилась (успешно или нет): до этого на месте блока стоит заглушка
	let ready = $state(cache !== undefined);

	// Как у DTF: порция приходит с сервера по id последней новости, «Показать ещё» запрашивает следующую.
	// `replace` — загрузить первую порцию заново, не убирая показанное
	async function loadMore(replace = false) {
		if (loading) return;
		loading = true;
		try {
			const page = await api.getEditorialNews(replace ? 0 : lastId);
			news = replace ? page.items : [...news, ...page.items];
			lastId = page.lastId ?? lastId;
			hasMore = page.items.length > 0;
			cache = { news, lastId, hasMore, time: Date.now() };
		} catch (e) {
			console.error('Failed to load news:', e);
		} finally {
			loading = false;
			ready = true;
		}
	}

	// Вкладки ленты не должны каждый раз загружать новости заново: виденное показываем сразу
	if (!cache) loadMore();
	else if (Date.now() - cache.time > STALE) loadMore(true);

	// Клик по логотипу или повторный клик по вкладке ленты: обновить новости
	let handledRefresh = feed.refreshCount;
	$effect(() => {
		if (feed.refreshCount !== handledRefresh) {
			handledRefresh = feed.refreshCount;
			untrack(() => loadMore(true));
		}
	});
</script>

<!-- display: contents: обёртка только передаёт заглушке размер, раскладку не трогает -->
<div class="news-slot">
<Reveal {ready} block>
{#if news.length > 0}
	<section class="news-widget" class:news-widget--loading={loading} aria-label="Новости">
		{#each news as item (item.sourceId + '_' + item.id)}
			{@const href = resolve(getPostPath(item) as any)}
			<div class="news-item" in:slide={{ duration: reducedMotion() ? 0 : 350, easing: cubicOut }}>
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
</Reveal>
</div>

<style>
	/* Заглушка новостей — та же карточка, что у ленты, только ниже */
	.news-slot {
		display: contents;
		--placeholder-height: 132px;
		--placeholder-top: 0px;
	}

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

	.news-item__title {
		margin-right: 4px;
		font-size: 17px;
		line-height: 26px;
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
		.news-slot {
			--placeholder-top: 0px;
		}
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
		font-size: 17px;
		line-height: 26px;
		font-weight: 500;
		cursor: pointer;
	}

	.news-widget__load-more .icon {
		margin-left: 6px;
	}

	@media (hover: hover) {
		.news-item__title:hover,
		.news-widget__load-more:hover {
			color: var(--text-link);
		}
	}
</style>
