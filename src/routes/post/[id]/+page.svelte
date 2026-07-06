<script lang="ts">
	import { page } from '$app/state';
	import { api } from '$lib/api/index.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import Comments from '$lib/components/Comments/Comments.svelte';
	import { resolve } from '$app/paths';
	import type { Post } from '$lib/api/types';
	import { onMount } from 'svelte';

	let post = $state<Post | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let id = $derived(Number(page.params.id));

	onMount(async () => {
		try {
			post = await api.getPost(id);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{post ? post.title : 'Загрузка...'} - reDTF</title>
</svelte:head>

<div class="post-page">
	{#if loading}
		<div class="message">Загрузка поста...</div>
	{:else if error}
		<div class="message error">{error}</div>
	{:else if post}
		<ThemeLoader componentName="Post" {post} preview={false} />
		<Comments postId={id} />
		<div class="actions">
			<a href={resolve('/')} class="back-link">← Вернуться в ленту</a>
		</div>
	{:else}
		<div class="message">Пост не найден</div>
	{/if}
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
	.back-link {
		color: #1976d2;
		text-decoration: none;
	}
	.back-link:hover {
		text-decoration: underline;
	}
</style>
