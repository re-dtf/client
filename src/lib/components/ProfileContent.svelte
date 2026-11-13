<script lang="ts">
	import type { CursorData, Post, Profile, ProfileListItem, ProfileSorting as Sorting } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import Reveal from './Reveal.svelte';
	import NetworkErrorState from './NetworkErrorState.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import { onDestroy, untrack } from 'svelte';
	import { chunked } from '$lib/chunked';

	/*
	 * Данные профиля для темы: сам профиль, его посты (с подгрузкой) и списки подписчиков/подписок.
	 * Разметку рисует компонент темы Profile.
	 */
	let { profileId, onLoaded }: { profileId: number | string; onLoaded?: (name: string) => void } = $props();

	let lastLoadedId: number | string | undefined;
	let lastPostsId: number | undefined;
	let lastSorting: Sorting | undefined;

	let profile = $state.raw<Profile>();
	let profileError = $state<unknown>();
	let resolvedProfileId = $derived(typeof profileId === 'number' ? profileId : profile?.id);

	function retryLoadProfile() {
		loadProfile(profileId);
	}

	let subscribersPromise = $state<Promise<ProfileListItem[]>>(Promise.resolve([]));
	let subscriptionsPromise = $state<Promise<ProfileListItem[]>>(Promise.resolve([]));

	const CHUNK_SIZE = 5;

	let sorting = $state<Sorting>('new');
	let allPosts: Post[] = [];
	let posts = $state.raw<Post[]>([]);
	let cursor: CursorData | undefined;
	let hasMore = $state(true);
	let loadingPosts = $state(false);
	let postsError = $state<string | null>(null);
	// Номер запроса — чтобы ответ старой сортировки не перетёр новую
	let requestId = 0;
	let inFlight: Promise<boolean> | undefined;

	// Посты показываются порциями по кадрам, чтобы большая пачка не блокировала поток
	const chunks = chunked(
		() => allPosts.length,
		() => posts.length,
		(count) => (posts = allPosts.slice(0, count)),
		CHUNK_SIZE
	);
	onDestroy(chunks.stop);

	function loadPosts(reset = false): Promise<boolean> {
		const currentId = resolvedProfileId;
		if (currentId === undefined) return Promise.resolve(false);
		if (!reset) {
			if (inFlight) return inFlight;
			if (loadingPosts || !hasMore) return Promise.resolve(false);
		}
		const id = ++requestId;
		if (reset) {
			chunks.stop();
			allPosts = [];
			posts = [];
			cursor = undefined;
			hasMore = true;
		}
		loadingPosts = true;
		postsError = null;
		const run = (async () => {
			try {
				const result = await api.getProfilePosts(currentId, sorting, cursor);
				if (id !== requestId) return false;
				allPosts = [...allPosts, ...result.items];
				hasMore = result.items.length > 0 && result.lastId !== undefined;
				cursor = hasMore ? { lastId: result.lastId!, lastSortingValue: result.lastSortingValue ?? 0 } : undefined;
				const promise = chunks.run();
				loadingPosts = false;
				return await promise;
			} catch (e) {
				if (id === requestId) postsError = (e as Error).message;
				return false;
			} finally {
				if (id === requestId) loadingPosts = false;
			}
		})().finally(() => {
			if (inFlight === run) inFlight = undefined;
		});
		inFlight = run;
		return run;
	}

	function loadProfile(currentId: number | string) {
		lastLoadedId = currentId;

		profile = profileError = undefined;
		api.getProfile(currentId).then(
			(value) => {
				if (currentId !== lastLoadedId) return;
				profile = value;
				onLoaded?.(value.name);
			},
			(e) => {
				if (currentId !== lastLoadedId) return;
				profileError = e;
				onLoaded?.('Ошибка');
			}
		);
	}

	$effect(() => {
		const currentId = profileId;
		untrack(() => loadProfile(currentId));
	});

	$effect(() => {
		const currentId = resolvedProfileId;
		if (currentId === undefined) return;
		subscribersPromise = api.getProfileSubscribers(currentId).then((page) => page.items).catch(() => []);
		subscriptionsPromise = api.getProfileSubscriptions(currentId).catch(() => []);
	});

	$effect(() => {
		const currentId = resolvedProfileId;
		if (currentId === undefined) return;
		const currentSorting = sorting;
		if (currentId === lastPostsId && currentSorting === lastSorting) return;
		lastPostsId = currentId;
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
			/>
	{:else}
		<NetworkErrorState error={profileError} title="Не удалось загрузить профиль" onretry={retryLoadProfile} />
	{/if}
	</Reveal>
</div>

<style>
	.profile-screen {
		width: 100%;
	}
</style>
