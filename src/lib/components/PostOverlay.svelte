<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { navigation } from '$lib/navigation.svelte';
	import { themeState } from '$lib/themes/index.svelte';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import Comments from '$lib/components/Comments/Comments.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	let themeClass = $derived(`theme-${themeState.value}`);
	let postId = $derived(navigation.activePostId);

	function goBack() {
		navigation.closePost();
	}
</script>

{#if postId !== null}
	<div class="post-page {themeClass}">
		{#await api.getPost(postId)}
			<Spinner />
		{:then post}
			<ThemeLoader componentName="Post" {post} preview={false} />
			<Comments postId={post.id} commentsCount={post.commentsCount} />
			<div class="actions">
				<button class="back-link" onclick={goBack}>← Вернуться в ленту</button>
			</div>
		{:catch error}
			<div class="message error">{error.message}</div>
		{/await}
	</div>
{/if}

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
		background: none;
		border: none;
		color: #1976d2;
		cursor: pointer;
		font-size: inherit;
		padding: 0;
	}
	.back-link:hover {
		text-decoration: underline;
	}
</style>
