<script lang="ts">
	import SettingsScreen from './settings/SettingsScreen.svelte';
	import { closeOverlay } from '$lib/navigation';

	let { page, section, solo }: { page?: string; section?: string; solo?: boolean } = $props();
</script>

<SettingsScreen onclose={closeOverlay} {page} {section} {solo} />
