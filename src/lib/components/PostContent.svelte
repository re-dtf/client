<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import type { Snippet } from 'svelte';

	let { postId, sourceId = 'dtf', onLoaded, backButton } = $props<{
		postId: number;
		sourceId?: string;
		onLoaded?: (title: string) => void;
		backButton?: Snippet;
	}>();

	// svelte-ignore state_referenced_locally
	let postPromise = api.getPost(postId, sourceId);

	$effect(() => {
		postPromise
			.then(post => onLoaded?.(post.title))
			.catch(() => onLoaded?.('Ошибка'));
	});
</script>

<div class="post-screen">
	{#await postPromise}
		<div class="spinner-wrapper">
			<ThemeLoader componentName="Spinner" />
		</div>
	{:then post}
		<ThemeLoader componentName="Post" {post} preview={false} />
		<ThemeLoader componentName="Comments" postId={post.id} sourceId={post.sourceId} commentsCount={post.commentsCount} />
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
	/* Темы подстраивают обёртку через CSS-переменные (см. dtf2022/theme.css) */
	.post-screen {
		width: 100%;
		max-width: var(--post-screen-max-width, 800px);
		margin: 0 auto;
		padding: var(--post-screen-padding, 20px 0);
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
		display: var(--post-screen-actions-display, block);
		margin-top: 20px;
	}
</style>
