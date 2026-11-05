<script lang="ts">
	import { page } from '$app/state';
	import PostContent from '$lib/components/PostContent.svelte';
	import { resolve } from '$app/paths';

	let id = $derived(Number(page.params.id));
	let sourceId = $derived(page.url.searchParams.get('source') || 'dtf');
	// Ссылка «Скопировать» ведёт на #comment-<источник>_<id>, ссылки dtf.ru — на ?comment=<id>
	let commentId = $derived(
		Number(page.url.searchParams.get('comment')) || Number(/^#comment-\w+_(\d+)$/.exec(page.url.hash)?.[1]) || undefined
	);
	let toComments = $derived(page.url.hash === '#comments');
	let pageTitle = $state('Загрузка... - reDTF');
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<PostContent postId={id} {sourceId} {commentId} {toComments} onLoaded={(title) => pageTitle = `${title} - reDTF`}>
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
