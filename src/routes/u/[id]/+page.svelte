<script lang="ts">
	import { page } from '$app/state';
	import ProfileContent from '$lib/components/ProfileContent.svelte';

	let id = $derived(Number(page.params.id));
	let pageTitle = $state('Загрузка... - reDTF');
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

{#key id}
	<ProfileContent profileId={id} onLoaded={(name) => (pageTitle = `${name} - reDTF`)} />
{/key}
