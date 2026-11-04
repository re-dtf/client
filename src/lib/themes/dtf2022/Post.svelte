<script lang="ts">
	import type { Post } from '$lib/api/types';
	import PostCard from './post/PostCard.svelte';
	import PostPage from './post/PostPage.svelte';
	import FilteredCard from './post/FilteredCard.svelte';
	import { filterSettings, matchPostFilter } from '$lib/storage/filter.svelte';

	let { post, preview = true }: { post: Post; preview?: boolean } = $props();

	let filterMatch = $derived(preview ? matchPostFilter(post) : null);
	let revealed = $state(false);
</script>

{#if preview}
	{#if filterMatch && !revealed}
		{#if filterSettings.value.mode === 'soft'}
			<FilteredCard {post} match={filterMatch} onreveal={() => (revealed = true)} />
		{/if}
	{:else}
		<PostCard {post} />
	{/if}
{:else}
	<PostPage {post} />
{/if}
