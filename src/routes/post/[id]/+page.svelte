<script lang="ts">
	import { page } from '$app/state';
	import PostContent from '$lib/components/PostContent.svelte';
	import { resolve } from '$app/paths';

	let id = $derived(Number(page.params.id));
	let pageTitle = $state('Загрузка... - reDTF');
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<PostContent postId={id} onLoaded={(title) => pageTitle = `${title} - reDTF`}>
	{#snippet backButton()}
		<a href={resolve('/')} class="back-link">← Вернуться в ленту</a>
	{/snippet}
</PostContent>

<style>
	.back-link {
		color: #1976d2;
		text-decoration: none;
	}
	.back-link:hover {
		text-decoration: underline;
	}
</style>
