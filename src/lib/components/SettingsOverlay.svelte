<script lang="ts">
	import SettingsScreen from './settings/SettingsScreen.svelte';
	import { closeOverlay } from '$lib/navigation';

	let { page }: { page?: string } = $props();
</script>

<SettingsScreen onclose={closeOverlay} {page} />
