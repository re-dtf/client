<script lang="ts">
	import { untrack } from 'svelte';
	import { api } from '$lib/api/index.svelte';
	import type { Post } from '$lib/api/types';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import Reveal from './Reveal.svelte';
	import NetworkErrorState from './NetworkErrorState.svelte';

	/*
	 * Записи с тегом. У метода нет постраничности: приходит одна страница.
	 * Разметку рисует компонент темы TagPage.
	 */
	let { tag }: { tag: string } = $props();

	let posts = $state.raw<Post[]>([]);
	let loading = $state(true);
	let error = $state<unknown>();
	// Номер запроса: ответ прежнего тега не должен перетереть новый
	let requestId = 0;

	async function load() {
		const id = ++requestId;
		loading = true;
		error = undefined;
		try {
			const result = await api.getTagPosts(tag);
			if (id === requestId) posts = result;
		} catch (e) {
			if (id === requestId) error = e;
		} finally {
			if (id === requestId) loading = false;
		}
	}

	$effect(() => {
		void tag;
		untrack(load);
	});
</script>

<div class="tag-screen">
	<Reveal ready={!loading} anim="contentIn">
		{#if error}
			<NetworkErrorState {error} title="Не удалось загрузить записи" onretry={load} />
		{:else}
			<ThemeLoader componentName="TagPage" {tag} {posts} />
		{/if}
	</Reveal>
</div>

<style>
	.tag-screen {
		width: 100%;
	}
</style>
