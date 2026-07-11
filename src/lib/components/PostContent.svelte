<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { themeState } from '$lib/themes/index.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import type { Snippet } from 'svelte';

	let { postId, onLoaded, backButton } = $props<{
		postId: number;
		onLoaded?: (title: string) => void;
		backButton?: Snippet;
	}>();

	let themeClass = $derived(`theme-${themeState.value}`);
	let postPromise = api.getPost(postId);

	$effect(() => {
		postPromise
			.then(post => onLoaded?.(post.title))
			.catch(() => onLoaded?.('Ошибка'));
	});
</script>

<div class="post-page {themeClass}">
	{#await postPromise}
		<ThemeLoader componentName="Spinner" />
	{:then post}
		<ThemeLoader componentName="Post" {post} preview={false} />
		<ThemeLoader componentName="Comments" postId={post.id} commentsCount={post.commentsCount} />
		{#if backButton}
			<div class="actions">
				{@render backButton()}
			</div>
		{/if}
	{:catch error}
		<div class="message error">{error.message}</div>
	{/await}
</div>

<style>
	.post-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px 0;
	}
	.message {
		text-align: center;
		padding: 40px;
		color: #666;
		font-size: 1.1em;
	}
	.error {
		color: #d32f2f;
	}
	.actions {
		margin-top: 20px;
	}
</style>
