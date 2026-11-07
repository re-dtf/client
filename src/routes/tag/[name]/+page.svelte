<script lang="ts">
	import { page } from '$app/state';
	import TagContent from '$lib/components/TagContent.svelte';

	let tag = $derived(page.params.name ?? '');
</script>

<svelte:head>
	<title>#{tag} - reDTF</title>
</svelte:head>

{#key tag}
	<TagContent {tag} />
{/key}
