<script lang="ts">
	import type { CursorData, Post, Profile, ProfileListItem, ProfileSorting as Sorting } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import Reveal from './Reveal.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { untrack } from 'svelte';

	/*
	 * Данные профиля для темы: сам профиль, его посты (с подгрузкой) и списки подписчиков/подписок.
	 * Разметку рисует компонент темы Profile.
	 */
	let { profileId, onLoaded }: { profileId: number; onLoaded?: (name: string) => void } = $props();

	let lastLoadedId: number | undefined;
	let lastSorting: Sorting | undefined;

	let profile = $state.raw<Profile>();
	let profileError = $state<string>();

	let subscribersPromise = $state<Promise<ProfileListItem[]>>(Promise.resolve([]));
	let subscriptionsPromise = $state<Promise<ProfileListItem[]>>(Promise.resolve([]));

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
		const currentId = profileId;
		if (currentId === lastLoadedId) return;
		lastLoadedId = currentId;

		subscribersPromise = api.getProfileSubscribers(currentId).then((page) => page.items).catch(() => []);
		subscriptionsPromise = api.getProfileSubscriptions(currentId).catch(() => []);

		profile = profileError = undefined;
		api.getProfile(currentId).then(
			(value) => {
				if (currentId !== lastLoadedId) return;
				profile = value;
				onLoaded?.(value.name);
			},
			(e) => {
				if (currentId !== lastLoadedId) return;
				profileError = e.message;
				onLoaded?.('Ошибка');
			}
		);
	});

	$effect(() => {
		const currentId = profileId;
		const currentSorting = sorting;
		if (currentId === lastLoadedId && currentSorting === lastSorting) return;
		lastSorting = currentSorting;
		untrack(() => loadPosts(true));
	});
</script>

<div class="profile-screen">
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
				onProfileUpdate={(value: Profile) => (profile = value)}
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
</div>

<style>
	.profile-screen {
		width: 100%;
	}
	.profile-fallback {
		padding: 40px;
		text-align: center;
	}
</style>
