<script lang="ts">
	import SettingsScreen from './settings/SettingsScreen.svelte';
	import { closeOverlay } from '$lib/navigation';
</script>

<SettingsScreen onclose={closeOverlay} />
