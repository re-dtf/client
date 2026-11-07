<script lang="ts">
	import { untrack } from 'svelte';
	import { api } from '$lib/api/index.svelte';
	import type { CursorData, Post, SearchFilters, SearchSorting, SearchSubsite } from '$lib/api/types';
	import type { SearchTab } from '$lib/themes/contract';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import Reveal from './Reveal.svelte';

	/*
	 * Результаты поиска. Записи листаются по курсору, блоги и темы приходят одной страницей.
	 * Хранится только открытая вкладка: смена вкладки, порядка или запроса начинает выдачу заново.
	 * Разметку рисует компонент темы SearchPage.
	 */
	let { query }: { query: string } = $props();

	let tab = $state<SearchTab>('posts');
	let sorting = $state<SearchSorting>('relevance');
	let filters = $state<SearchFilters>({ title: false, editorial: false, strict: false });
	let posts = $state.raw<Post[]>([]);
	let subsites = $state.raw<SearchSubsite[]>([]);
	let total = $state<number>();
	let hasMore = $state(false);
	let loaded = $state(false);
	let loading = $state(false);
	let error = $state<unknown>();
	// Первая выдача пришла: до этого страница показывает загрузку целиком, после — только список
	let shown = $state(false);
	let cursor: CursorData | undefined;
	// Номер запроса: ответ прежней выдачи не должен перетереть новую
	let requestId = 0;

	async function load(more = false) {
		if (more && (loading || !hasMore)) return;
		const id = ++requestId;
		loading = true;
		error = undefined;
		if (!more) {
			loaded = hasMore = false;
			posts = subsites = [];
			total = cursor = undefined;
		}
		try {
			if (tab === 'posts') {
				const result = await api.searchPosts(query, sorting, $state.snapshot(filters), cursor);
				if (id !== requestId) return;
				posts = more ? [...posts, ...result.items] : result.items;
				total = result.total;
				hasMore = result.items.length > 0 && result.lastId !== undefined;
				cursor = hasMore ? { lastId: result.lastId!, lastSortingValue: result.lastSortingValue ?? 0 } : undefined;
			} else {
				const result = await api.searchSubsites(query, tab === 'topics');
				if (id !== requestId) return;
				subsites = result.items;
				total = result.total;
			}
			loaded = true;
		} catch (e) {
			if (id === requestId) {
				error = e;
				loaded = true;
			}
		} finally {
			if (id === requestId) {
				loading = false;
				shown = true;
			}
		}
	}

	$effect(() => {
		void query, tab, sorting, filters;
		untrack(() => load());
	});
</script>

<div class="search-screen">
	<Reveal ready={shown} anim="contentIn">
		<ThemeLoader
			componentName="SearchPage"
			{query}
			{tab}
			onTabChange={(value: SearchTab) => (tab = value)}
			{sorting}
			onSortingChange={(value: SearchSorting) => (sorting = value)}
			{filters}
			onFiltersChange={(value: SearchFilters) => (filters = value)}
			{posts}
			{subsites}
			{total}
			{loaded}
			{loading}
			{error}
			{hasMore}
			loadMore={() => load(true)}
			onretry={() => load()}
		>
			<!-- Фолбэк для тем без своей страницы поиска -->
			<div class="search-fallback">
				<h1>Поиск: {query}</h1>
				{#each posts as post (post.id)}
					<ThemeLoader componentName="Post" {post} />
				{/each}
			</div>
		</ThemeLoader>
	</Reveal>
</div>

<style>
	.search-screen {
		width: 100%;
	}
	.search-fallback {
		padding: 20px;
	}
</style>
