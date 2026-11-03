<script lang="ts">
	import type { CursorData, Post, Profile, ProfileSorting as Sorting } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import Reveal from './Reveal.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { untrack } from 'svelte';

	/*
	 * Данные профиля для темы: сам профиль, его посты (с подгрузкой) и списки подписчиков/подписок.
	 * Разметку рисует компонент темы Profile.
	 */
	let { profileId, onLoaded }: { profileId: number; onLoaded?: (name: string) => void } = $props();

	let profilePromise = $derived(api.getProfile(profileId));
	let subscribersPromise = $derived(api.getProfileSubscribers(profileId).then((page) => page.items).catch(() => []));
	let subscriptionsPromise = $derived(api.getProfileSubscriptions(profileId).catch(() => []));

	let sorting = $state<Sorting>('new');
	let posts = $state.raw<Post[]>([]);
	let cursor: CursorData | undefined;
	let hasMore = $state(true);
	let loadingPosts = $state(false);
	let postsError = $state<string | null>(null);
	// Номер запроса — чтобы ответ старой сортировки не перетёр новую
	let requestId = 0;

	async function loadPosts(reset = false) {
		if (loadingPosts && !reset) return;
		if (!hasMore && !reset) return;
		const id = ++requestId;
		if (reset) {
			posts = [];
			cursor = undefined;
			hasMore = true;
		}
		loadingPosts = true;
		postsError = null;
		try {
			const result = await api.getProfilePosts(profileId, sorting, cursor);
			if (id !== requestId) return;
			posts = [...posts, ...result.items];
			hasMore = result.items.length > 0 && result.lastId !== undefined;
			cursor = hasMore ? { lastId: result.lastId!, lastSortingValue: result.lastSortingValue ?? 0 } : undefined;
		} catch (e) {
			if (id === requestId) postsError = (e as Error).message;
		} finally {
			if (id === requestId) loadingPosts = false;
		}
	}

	$effect(() => {
		profileId;
		sorting;
		untrack(() => loadPosts(true));
	});

	let profile = $state.raw<Profile>();
	let profileError = $state<string>();

	// Профиль загружается один раз на оверлей, поэтому запись состояния здесь не зацикливается
	$effect(() => {
		const promise = profilePromise;
		profile = profileError = undefined;
		promise.then(
			(value) => {
				if (promise !== profilePromise) return;
				profile = value;
				onLoaded?.(value.name);
			},
			(e) => {
				if (promise !== profilePromise) return;
				profileError = e.message;
				onLoaded?.('Ошибка');
			}
		);
	});
</script>

<Reveal ready={profile !== undefined || profileError !== undefined} anim="contentIn">
	{#if profile}
		{@const loaded = profile}
			<ThemeLoader
				componentName="Profile"
				profile={loaded}
				{posts}
				{sorting}
				{hasMore}
				{loadingPosts}
				{postsError}
				{subscribersPromise}
				{subscriptionsPromise}
				onSortingChange={(value: Sorting) => (sorting = value)}
				loadMore={() => loadPosts()}
			>
				<!-- Фолбэк для тем без своего профиля -->
				<div class="profile-fallback">
					<h1>{loaded.name}</h1>
					{#if loaded.url}
						<a href={loaded.url} target="_blank" rel="noreferrer">Открыть профиль на DTF</a>
					{/if}
				</div>
			</ThemeLoader>
	{:else}
		<div class="profile-fallback">{profileError}</div>
	{/if}
</Reveal>

<style>
	.profile-fallback {
		padding: 40px;
		text-align: center;
	}
</style>
