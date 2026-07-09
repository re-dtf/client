<script lang="ts">
	import { page } from '$app/state';
	import { api } from '$lib/api/index.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import Comments from '$lib/components/Comments/Comments.svelte';
	import { resolve } from '$app/paths';
	import { themeState } from '$lib/themes/index.svelte';

	let id = $derived(Number(page.params.id));
	let themeClass = $derived(`theme-${themeState.value}`);
	let postPromise = $derived(api.getPost(id));
	
	let pageTitle = $state('Загрузка... - reDTF');
	
	$effect(() => {
		pageTitle = 'Загрузка... - reDTF';
		postPromise
			.then(p => pageTitle = `${p.title} - reDTF`)
			.catch(() => pageTitle = 'Ошибка - reDTF');
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="post-page {themeClass}">
	{#await postPromise}
		<div class="message">Загрузка поста...</div>
	{:then post}
		<ThemeLoader componentName="Post" {post} preview={false} />
		<Comments postId={id} commentsCount={post.commentsCount} />
		<div class="actions">
			<a href={resolve('/')} class="back-link">← Вернуться в ленту</a>
		</div>
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
	.back-link {
		color: #1976d2;
		text-decoration: none;
	}
	.back-link:hover {
		text-decoration: underline;
	}
</style>
