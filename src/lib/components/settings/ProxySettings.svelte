<script lang="ts">
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import { settings, DEFAULT_PROXY_URL } from '$lib/storage/settings.svelte';

	function useAuthorProxy() {
		if (confirm('Использовать прокси от автора проекта?')) {
			settings.patch({ proxyUrl: DEFAULT_PROXY_URL });
		}
	}
</script>

<SettingsGroup
	title="Сеть и авторизация"
	description="CORS-прокси для входа и обновления токена DTF (Cloudflare Workers и др.). Без прокси вход по паролю недоступен."
>
	<div class="body">
		<input
			class="entry"
			type="url"
			aria-label="URL прокси"
			placeholder="https://auth-proxy.example.workers.dev"
			bind:value={() => settings.value.proxyUrl, (value) => settings.patch({ proxyUrl: value })}
		/>
		{#if DEFAULT_PROXY_URL}
			<SettingsButton onclick={useAuthorProxy}>Прокси от автора проекта</SettingsButton>
		{/if}
	</div>
</SettingsGroup>

<style>
	.body {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		padding: 18px 20px;
	}

	.entry {
		flex: 1 1 240px;
		min-width: 0;
		height: 40px;
		padding: 0 16px;
		border-radius: 20px;
		background: var(--st-field);
		color: inherit;
		font-size: 14px;
	}

	.entry:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 0;
	}
</style>
