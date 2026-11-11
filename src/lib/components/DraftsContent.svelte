<script lang="ts">
	import { untrack } from 'svelte';
	import { api } from '$lib/api/index.svelte';
	import { authStorage } from '$lib/storage/auth.svelte';
	import type { Post } from '$lib/api/types';
	import { openOverlay } from '$lib/navigation';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import Reveal from './Reveal.svelte';

	/*
	 * Черновики вошедшего пользователя: постранично по смещению, открываются в редакторе.
	 * Разметку рисует компонент темы DraftsPage.
	 */
	const PAGE_SIZE = 20;

	let posts = $state.raw<Post[]>([]);
	let hasMore = $state(true);
	let loaded = $state(false);
	let loading = $state(false);
	let error = $state<unknown>();
	let shown = $state(false);

	async function load(more = false) {
		if (loading || (more && !hasMore)) return;
		loading = true;
		error = undefined;
		try {
			const page = await api.getDrafts(more ? posts.length : 0);
			posts = more ? [...posts, ...page] : page;
			hasMore = page.length >= PAGE_SIZE;
		} catch (e) {
			error = e;
		} finally {
			loaded = shown = true;
			loading = false;
		}
	}

	// Без входа черновиков нет: после входа или выхода список загружается заново
	$effect(() => {
		if (authStorage.isAuthenticated) untrack(() => load());
		else {
			posts = [];
			loaded = shown = true;
		}
	});
</script>

<div class="drafts-screen">
	<Reveal ready={shown} anim="contentIn">
		<ThemeLoader
			componentName="DraftsPage"
			{posts}
			{loaded}
			{loading}
			{error}
			{hasMore}
			loadMore={() => load(true)}
			onretry={() => load()}
			onopen={(post: Post) => openOverlay({ type: 'editor', data: { postId: post.id } })}
		/>
	</Reveal>
</div>

<style>
	.drafts-screen {
		width: 100%;
	}
</style>
