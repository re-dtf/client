<script lang="ts">
	import type { Snippet } from 'svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { openOverlay } from '$lib/navigation';

	/* Настройки DTF видны только вошедшему: без входа вместо них приглашение войти */
	let { children }: { children: Snippet } = $props();
</script>

{#if authStorage.isAuthenticated}
	{@render children()}
{:else}
	<SettingsGroup>
		<SettingsRow title="Нужен вход в DTF" subtitle="Эти настройки хранятся на сервере DTF, поэтому без входа их не показать.">
			<SettingsButton variant="suggested" onclick={() => openOverlay({ type: 'login' })}>Войти</SettingsButton>
		</SettingsRow>
	</SettingsGroup>
{/if}
