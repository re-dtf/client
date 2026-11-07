<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { PaginatedResult, Post } from '$lib/api/types';
	import ThemeLoader, { preloadThemeComponent } from '$lib/themes/ThemeLoader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import NetworkErrorState from '$lib/components/NetworkErrorState.svelte';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { loadFeed, peekFeed, sortingOf } from '$lib/feedCache';
	import { feed, openFeedTab, type FeedName, type Period } from '$lib/feed.svelte';
	import { untrack } from 'svelte';
	import { appear } from '$lib/themes/appear';
	import { markFeedLoaded } from '$lib/ready';

	/*
	 * Одна лента главной. Страница держит несколько таких сразу: неактивная скрыта, но сохраняет посты,
	 * подгруженные страницы и раскладку, поэтому возврат на неё мгновенный.
	 */
	let { name, period, active }: { name: FeedName; period: Period; active: boolean } = $props();

	let feedResult = $state.raw<PaginatedResult<Post> | null>(null);
	let loading = $state(true);
	let loadingMore = $state(false);
	let refreshing = $state(false);
	let error = $state<unknown | null>(null);
	// Растёт, когда показана новая первая страница: список пересоздаётся и проигрывает появление (подгрузка вниз его не трогает)
	let epoch = $state(0);

	// Номер запроса: ответ прежнего периода не должен перетереть новый
	let requestId = 0;

	// Свежие посты подставляются, только пока лента у верха: иначе список сменился бы под пальцем. У скрытой — по запомненной прокрутке
	const atTop = () => (active ? window.scrollY : feed.scrollOf(name)) < 100;

	// Свежая первая страница совпадает с началом показанного списка
	const startsWith = (list: PaginatedResult<Post>, first: PaginatedResult<Post>) =>
		first.items.every((post, i) => post.id === list.items[i]?.id && post.sourceId === list.items[i]?.sourceId);

	/**
	 * Показать ленту. Уже виденная лента открывается сразу из кэша, свежие посты подтягиваются следом.
	 * `isRefresh` — явное обновление: старый список остаётся, пока идёт запрос.
	 */
	async function loadInitial(isRefresh = false) {
		const id = ++requestId;
		const cached = isRefresh ? undefined : peekFeed(name, period);
		error = null;
		if (isRefresh) refreshing = true;
		else {
			feedResult = cached ?? null;
			loading = !cached;
			epoch++;
		}
		try {
			// Компонент поста догружается вместе с данными: иначе каждая карточка ленты на миг покажет заглушку
			const [result] = await Promise.all([loadFeed(name, period, isRefresh), preloadThemeComponent(activeTheme.chain, 'Post')]);
			// Скрытая лента (соседняя для свайпа) строит список в простое: сборка десятков карточек не должна совпасть с прокруткой
			if (!active) await new Promise((done) => ('requestIdleCallback' in window ? requestIdleCallback(done, { timeout: 300 }) : setTimeout(done)));
			if (id !== requestId) return;
			if (!cached || (atTop() && !startsWith(cached, result))) {
				feedResult = result;
				epoch++;
			}
		} catch (e: any) {
			// Показанный из кэша список остаётся, даже если обновить его не вышло
			if (id === requestId && !cached) error = e;
			console.error('Failed to load posts:', e);
		} finally {
			if (id === requestId) loading = refreshing = false;
			if (isRefresh) feed.refreshed();
			markFeedLoaded();
		}
	}

	/** Вернулись на сохранённую ленту: если она у верха и устарела, подтягиваем свежие посты, не трогая остальное */
	async function revalidate() {
		const shown = feedResult;
		if (!shown || loading || refreshing) return;
		const id = requestId;
		const result = await loadFeed(name, period).catch(() => undefined);
		if (result && id === requestId && feedResult === shown && atTop() && !startsWith(shown, result)) {
			feedResult = result;
			epoch++;
		}
	}

	async function loadMore() {
		if (loading || loadingMore || !feedResult?.cursors || Object.keys(feedResult.cursors).length === 0) return;
		const id = requestId;
		try {
			loadingMore = true;
			const next = await api.getPosts({ pageName: name, sorting: sortingOf(name, period), cursors: feedResult.cursors });
			if (id === requestId) {
				feedResult = { items: [...feedResult.items, ...next.items], cursors: next.cursors };
			}
		} catch (e: any) {
			console.error('Failed to load more posts:', e);
		} finally {
			loadingMore = false;
		}
	}

	// Лента появилась или у «Популярного» сменился период: загружаем с начала
	$effect(() => {
		void period;
		untrack(() => loadInitial());
	});

	// Вернулись на ленту: свежие посты, если она у верха
	let wasActive = untrack(() => active);
	$effect(() => {
		if (active && !wasActive) untrack(() => revalidate());
		wasActive = active;
	});

	// Клик по логотипу или жест на открытой ленте: обновить без сброса списка
	let handledRefresh = feed.refreshCount;
	$effect(() => {
		if (feed.refreshCount === handledRefresh) return;
		handledRefresh = feed.refreshCount;
		if (untrack(() => active)) untrack(() => loadInitial(true));
	});

	let loaderNode = $state<HTMLElement>();

	// Подгрузка вниз только у открытой ленты. Новый наблюдатель при возврате сразу сообщает, виден ли низ списка
	$effect(() => {
		if (!loaderNode || !active) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) loadMore();
		}, { rootMargin: '1000px' });
		observer.observe(loaderNode);
		return () => observer.disconnect();
	});

	// Список, построенный в скрытой ленте, не анимируется: ленту на экран выводит страница или свайп
	const appearIfShown = (el: HTMLElement) => {
		if (untrack(() => active)) appear('feedIn')(el);
	};
</script>

<!-- Обновление жестом рисует сам жест: тогда список не притухает и своего индикатора нет -->
<div class={['feed', { 'feed--refreshing': refreshing && !feed.refreshQuiet }]}>
	{#if refreshing && !feed.refreshQuiet}
		<div class="refresh"><ThemeLoader componentName="Spinner" inline={true} /></div>
	{/if}

	{#if error}
		<NetworkErrorState {error} onretry={() => loadInitial()} />
	{:else}
		<Reveal ready={!loading} block>
			{#if feedResult?.items.length === 0}
				<div class="empty">Нет постов</div>
			{:else if feedResult}
				{#key epoch}
					<div class="list" {@attach appearIfShown}>
						<ThemeLoader
							componentName="FeedTabs"
							currentFeed={name}
							switchFeed={openFeedTab}
							{period}
							switchPeriod={(next: Period) => openFeedTab('popular', next)}
						/>
						{#if name === 'popular' && period === 'now'}
							<ThemeLoader componentName="EditorialNews" />
						{/if}
						{#each feedResult.items as post (post.sourceId + '_' + post.id)}
							<ThemeLoader componentName="Post" {post} />
						{/each}

						{#if feedResult.cursors && Object.keys(feedResult.cursors).length > 0}
							<div bind:this={loaderNode} class="infinite-loader">
								{#if loadingMore}
									<ThemeLoader componentName="Spinner" inline={true} />
								{/if}
							</div>
						{/if}
					</div>
				{/key}
			{/if}
		</Reveal>
	{/if}
</div>

<style>
	/* В темах с flex-раскладкой (dtf2022) иначе лента сжимается по контенту */
	.feed {
		position: relative;
		width: 100%;
	}
	/* Обновление по нажатию: старый список остаётся, но притухает, а сверху крутится индикатор */
	.list {
		width: 100%;
		transition: opacity 0.2s ease;
	}
	.feed--refreshing .list {
		opacity: 0.55;
	}
	.refresh {
		position: absolute;
		top: 8px;
		left: 50%;
		z-index: 5;
		translate: -50% 0;
		border-radius: 999px;
		background: var(--bg-card, #fff);
		color: var(--text-primary, inherit);
		border: 1px solid var(--border-subtle, transparent);
		box-shadow: var(--shadow-popup, 0 2px 12px rgba(0, 0, 0, 0.18));
		animation: refresh-in 0.25s cubic-bezier(0.165, 0.84, 0.44, 1) backwards;
		pointer-events: none;
	}
	@keyframes refresh-in {
		from {
			opacity: 0;
			translate: -50% -12px;
			scale: 0.8;
		}
	}
	.empty,
	.infinite-loader {
		text-align: center;
		padding: 40px;
		color: var(--text-muted, #666);
		font-size: 1.1em;
	}
	.infinite-loader {
		padding: 20px;
		min-height: 50px;
		display: flex;
		justify-content: center;
	}
</style>
