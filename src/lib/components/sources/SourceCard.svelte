<script lang="ts">
	import type { SourceState } from '$lib/api/sources/types';
	import { sourceRegistry } from '$lib/api/sources/registry.svelte';
	import type { ManifestUpdateResult } from '$lib/api/sources/registry.svelte';
	import { sourceStorage } from '$lib/storage/sources.svelte';
	import BioVerification from './BioVerification.svelte';
	import SettingsButton from '$lib/components/settings/SettingsButton.svelte';
	import SettingsSwitch from '$lib/components/settings/SettingsSwitch.svelte';

	let { source, onUpdateReady }: { 
		source: SourceState;
		onUpdateReady?: (sourceId: string, result: ManifestUpdateResult) => void;
	} = $props();

	let manifest = $derived(source.manifest);
	let hasToken = $derived(!!sourceStorage.getToken(source.manifest.id));
	let isUpdating = $state(false);
	let showBioAuth = $state(false);

	function toggleEnabled() {
		sourceRegistry.toggleSource(manifest.id, !source.enabled);
	}

	async function handleUpdate() {
		if (isUpdating || !onUpdateReady) return;
		isUpdating = true;
		try {
			const result = await sourceRegistry.refreshManifest(manifest.id);
			onUpdateReady(manifest.id, result);
		} catch (err: any) {
			alert('Ошибка при проверке обновлений: ' + err.message);
		} finally {
			isUpdating = false;
		}
	}

	function removeSource() {
		if (confirm(`Вы уверены, что хотите удалить источник "${manifest.name}"?`)) {
			sourceRegistry.removeSource(manifest.id);
		}
	}
	
	function handleAuth() {
		if (manifest.auth?.type === 'bio_verification') {
			showBioAuth = true;
		} else {
			sourceRegistry.authenticate(manifest.id).catch(err => {
				alert('Ошибка авторизации: ' + err.message);
			});
		}
	}
	
	function handleRevokeAuth() {
		if (confirm('Выйти из аккаунта на этом источнике?')) {
			sourceRegistry.revokeAuth(manifest.id);
		}
	}
</script>

<article class={['card', { 'card--off': !source.enabled }]}>
	<header class="card__header">
		{#if manifest.icon}
			<img src={manifest.icon} alt="" class="card__icon" />
		{/if}
		<div class="card__info">
			<h4 class="card__name">
				{manifest.name}
				<span class="version">v{manifest.version}</span>
			</h4>
			{#if manifest.author}
				<p class="card__meta">
					от
					{#if manifest.author.url && manifest.author.url.startsWith('http')}
						<a class="link" href={manifest.author.url} target="_blank" rel="noopener noreferrer">{manifest.author.name}</a>
					{:else}
						{manifest.author.name}
					{/if}
				</p>
			{/if}
		</div>
		<span class={['pill', source.enabled ? 'pill--ok' : 'pill--off']}>{source.enabled ? 'Подключен' : 'Выключен'}</span>
		<SettingsSwitch checked={source.enabled} label="Источник {manifest.name} включён" onchange={toggleEnabled} />
	</header>

	<p class="card__description">{manifest.description}</p>
	<p class="card__meta">Адрес: {manifest.api.baseUrl}</p>

	<div class="tags">
		{#if source.isBuiltin}
			<span class="tag tag--builtin">Встроенный</span>
		{/if}
		{#each manifest.tags || [] as tag}
			<span class="tag">{tag}</span>
		{/each}
		{#if manifest.auth && manifest.auth.type !== 'none'}
			{#if hasToken}
				<span class="tag tag--ok">Авторизован</span>
			{:else}
				<span class="tag tag--warn">Требуется вход</span>
			{/if}
		{/if}
	</div>

	<footer class="card__footer">
		<SettingsButton>Настроить</SettingsButton>
		<SettingsButton onclick={handleUpdate} disabled={isUpdating}>
			{isUpdating ? 'Поиск...' : 'Обновить'}
		</SettingsButton>
		{#if manifest.auth && manifest.auth.type !== 'none'}
			{#if hasToken}
				<SettingsButton onclick={handleRevokeAuth}>Выйти</SettingsButton>
			{:else}
				<SettingsButton variant="suggested" onclick={handleAuth}>Авторизоваться</SettingsButton>
			{/if}
		{/if}
		{#if !source.isBuiltin}
			<span class="card__spacer"></span>
			<SettingsButton variant="destructive" onclick={removeSource}>Удалить</SettingsButton>
		{/if}
	</footer>
</article>

{#if showBioAuth}
	<BioVerification 
		source={source} 
		onComplete={() => { showBioAuth = false; }} 
		onCancel={() => { showBioAuth = false; }} 
	/>
{/if}

<style>
	.card {
		padding: 20px;
		border-radius: 14px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow);
		transition: opacity var(--duration-base);
	}

	.card--off {
		opacity: 0.7;
	}

	.card__header {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 12px;
	}

	.card__icon {
		flex: none;
		width: 40px;
		height: 40px;
		border-radius: 8px;
		object-fit: cover;
	}

	.card__info {
		flex: 1;
		min-width: 0;
	}

	.card__name {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 17px;
		font-weight: 500;
		line-height: 24px;
	}

	.version {
		padding: 0 6px;
		border-radius: 6px;
		background: var(--st-button);
		color: var(--st-muted);
		font-size: 12px;
		font-weight: 500;
	}

	.card__meta {
		overflow-wrap: anywhere;
		color: var(--st-muted);
		font-size: 13px;
		line-height: 19px;
	}

	.card__description {
		margin-bottom: 6px;
		font-size: 15px;
		line-height: 22px;
	}

	.link {
		color: var(--text-link, var(--st-accent));
	}

	.link:hover {
		text-decoration: underline;
	}

	.pill {
		flex: none;
		padding: 2px 10px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 500;
	}

	.pill--ok {
		background: color-mix(in srgb, var(--st-ok) 14%, transparent);
		color: var(--st-ok);
	}

	.pill--off {
		background: var(--st-button);
		color: var(--st-muted);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 12px 0 18px;
	}

	.tags:empty {
		display: none;
	}

	.tag {
		padding: 2px 8px;
		border-radius: 6px;
		background: var(--st-button);
		color: var(--st-muted);
		font-size: 12px;
	}

	.tag--builtin {
		background: color-mix(in srgb, var(--st-accent) 14%, transparent);
		color: var(--st-accent);
		font-weight: 500;
	}

	.tag--ok {
		background: color-mix(in srgb, var(--st-ok) 14%, transparent);
		color: var(--st-ok);
		font-weight: 500;
	}

	.tag--warn {
		background: color-mix(in srgb, #e5a50a 20%, transparent);
		color: #8a5a00;
		font-weight: 500;
	}

	.card__footer {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		padding-top: 18px;
		border-top: 1px solid var(--st-separator);
	}

	.card__spacer {
		flex: 1;
	}
</style>
