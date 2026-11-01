<script lang="ts">
	import type { Post } from '$lib/api/types';
	import PostCard from './post/PostCard.svelte';
	import PostPage from './post/PostPage.svelte';

	let { post, preview = true }: { post: Post; preview?: boolean } = $props();
</script>

{#if preview}
	<PostCard {post} />
{:else}
	<PostPage {post} />
{/if}
