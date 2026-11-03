<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import type { PaginatedResult, Post } from '$lib/api/types';
	import ThemeLoader, { preloadThemeComponent } from '$lib/themes/ThemeLoader.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { loadFeed, peekFeed, sortingOf } from '$lib/feedCache';
	import { feed, feedFromUrl, openFeedTab, periodFromUrl, type Period } from '$lib/feed.svelte';
	import { untrack } from 'svelte';
	import { appear } from '$lib/themes/appear';
	import { markFeedLoaded } from '$lib/ready';

	let feedResult = $state.raw<PaginatedResult<Post> | null>(null);
	let loading = $state(true);
	let loadingMore = $state(false);
	let refreshing = $state(false);
	let error = $state<string | null>(null);
	// Растёт, когда показана новая первая страница: список пересоздаётся и проигрывает появление (подгрузка вниз его не трогает)
	let epoch = $state(0);

	// Лента лежит в адресе (/?feed=new), так что на неё можно дать ссылку
	let currentFeed = $derived(feedFromUrl());
	let currentPeriod = $derived(periodFromUrl());

	// Номер запроса: ответ прежней ленты не должен перетереть новую
	let requestId = 0;

	const sameFirstPage = (a: PaginatedResult<Post>, b: PaginatedResult<Post>) =>
		a.items.length === b.items.length && a.items.every((post, i) => post.id === b.items[i].id && post.sourceId === b.items[i].sourceId);

	/**
	 * Показать ленту. Уже виденная лента открывается сразу из кэша, свежие посты подтягиваются следом
	 * (список меняется под пальцем, только пока пользователь не отошёл от верха). `isRefresh` — явное обновление:
	 * старый список остаётся, пока идёт запрос.
	 */
	async function loadInitial(isRefresh = false) {
		const id = ++requestId;
		const cached = isRefresh ? undefined : peekFeed(currentFeed, currentPeriod);
		error = null;
		if (isRefresh) refreshing = true;
		else {
			feedResult = cached ?? null;
			loading = !cached;
			epoch++;
		}
		try {
			// Компонент поста догружается вместе с данными: иначе каждая карточка ленты на миг покажет заглушку
			const [result] = await Promise.all([loadFeed(currentFeed, currentPeriod, isRefresh), preloadThemeComponent(activeTheme.chain, 'Post')]);
			if (id !== requestId) return;
			if (!cached || (window.scrollY < 100 && !sameFirstPage(cached, result))) {
				feedResult = result;
				epoch++;
			}
		} catch (e: any) {
			// Показанный из кэша список остаётся, даже если обновить его не вышло
			if (id === requestId && !cached) error = e.message;
			console.error('Failed to load posts:', e);
		} finally {
			if (id === requestId) loading = refreshing = false;
			markFeedLoaded();
		}
	}

	async function loadMore() {
		if (loading || loadingMore || !feedResult?.cursors || Object.keys(feedResult.cursors).length === 0) return;
		const id = requestId;
		try {
			loadingMore = true;
			const next = await api.getPosts({
				pageName: currentFeed,
				sorting: sortingOf(currentFeed, currentPeriod),
				cursors: feedResult.cursors
			});
			if (id === requestId) {
				feedResult = { items: [...feedResult.items, ...next.items], cursors: next.cursors };
			}
		} catch (e: any) {
			console.error('Failed to load more posts:', e);
		} finally {
			loadingMore = false;
		}
	}

	// Открыли другую ленту (или зашли на главную): загружаем её с начала
	$effect(() => {
		feed.setCurrent(currentFeed, currentPeriod);
		untrack(() => loadInitial());
	});

	// Клик по логотипу на самой ленте: обновить без сброса списка
	let handledRefresh = feed.refreshCount;
	$effect(() => {
		if (feed.refreshCount !== handledRefresh) {
			handledRefresh = feed.refreshCount;
			untrack(() => loadInitial(true));
		}
	});

	let loaderNode = $state<HTMLElement>();

	$effect(() => {
		if (!loaderNode) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				loadMore();
			}
		}, { rootMargin: '1000px' });
		
		observer.observe(loaderNode);
		
		return () => {
			observer.disconnect();
		};
	});
</script>

<svelte:head>
	<title>reDTF - Лента</title>
</svelte:head>

<div class={['feed', { 'feed--refreshing': refreshing }]}>
	{#if refreshing}
		<div class="refresh"><ThemeLoader componentName="Spinner" inline={true} /></div>
	{/if}

	{#if error}
		<div class="error">{error}</div>
	{:else}
		<Reveal ready={!loading} block>
			{#if feedResult?.items.length === 0}
				<div class="empty">Нет постов</div>
			{:else if feedResult}
				{#key epoch}
					<div class="list" {@attach appear('feedIn')}>
						<ThemeLoader
							componentName="FeedTabs"
							{currentFeed}
							switchFeed={openFeedTab}
							period={currentPeriod}
							switchPeriod={(period: Period) => openFeedTab('popular', period)}
						/>
						{#if currentFeed === 'popular' && currentPeriod === 'now'}
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
		background: #fff;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
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
	.empty, .infinite-loader {
		text-align: center;
		padding: 40px;
		color: #666;
		font-size: 1.1em;
	}
	.infinite-loader {
		padding: 20px;
		min-height: 50px;
		display: flex;
		justify-content: center;
	}
	.error {
		color: red;
		text-align: center;
		padding: 40px;
		font-weight: bold;
	}
</style>
