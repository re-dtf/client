<script lang="ts">
	import { page } from '$app/state';
	import SearchContent from '$lib/components/SearchContent.svelte';

	let query = $derived(page.url.searchParams.get('q')?.trim() ?? '');
</script>

<svelte:head>
	<title>{query ? `${query} - ` : ''}Поиск - reDTF</title>
</svelte:head>

{#if query}
	<SearchContent {query} />
{/if}
