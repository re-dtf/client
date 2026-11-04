<script lang="ts">
	import { sourceStorage } from '$lib/storage/sources.svelte';
	import { sourceRegistry } from '$lib/api/sources/registry.svelte';
	import SettingsButton from '$lib/components/settings/SettingsButton.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SourceCard from './SourceCard.svelte';
	import SourcePermissions from './SourcePermissions.svelte';
	import SourceUpdate from './SourceUpdate.svelte';
	import SourceCatalog from './SourceCatalog.svelte';
	import type { SourceManifest } from '$lib/api/sources/types';
	import type { ManifestUpdateResult } from '$lib/api/sources/registry.svelte';

	let showCatalog = $state(false);

	let newSourceUrl = $state('');
	let isAdding = $state(false);
	let addError = $state('');
	let reviewManifest = $state<SourceManifest | null>(null);
	let reviewManifestUrl = $state('');

	let updateResult = $state<ManifestUpdateResult | null>(null);
	let updateSourceId = $state('');

	let sources = $derived(sourceStorage.sources);

	async function handleAddSource() {
		if (!newSourceUrl) return;
		
		isAdding = true;
		addError = '';
		try {
			reviewManifest = await sourceRegistry.addSource(newSourceUrl);
			reviewManifestUrl = newSourceUrl;
			newSourceUrl = '';
		} catch (err: any) {
			addError = err.message || 'Ошибка при загрузке источника';
		} finally {
			isAdding = false;
		}
	}

	function handleInstallFromCatalog(manifestUrl: string) {
		showCatalog = false;
		newSourceUrl = manifestUrl;
		handleAddSource();
	}

	function handleConfirmPermissions(grantedPermissions: string[]) {
		if (reviewManifest) {
			sourceRegistry.installSource(reviewManifestUrl, reviewManifest, grantedPermissions);
			reviewManifest = null;
			reviewManifestUrl = '';
		}
	}

	function handleCancelPermissions() {
		reviewManifest = null;
		reviewManifestUrl = '';
	}

	function handleUpdateReady(sourceId: string, result: ManifestUpdateResult) {
		if (result.newVersion === result.oldVersion && 
			Object.keys(result.addedEndpoints).length === 0 &&
			result.removedEndpoints.length === 0 &&
			Object.keys(result.modifiedEndpoints).length === 0 &&
			result.addedPermissions.length === 0 &&
			result.removedPermissions.length === 0) {
			alert('Нет новых обновлений.');
			return;
		}
		updateResult = result;
		updateSourceId = sourceId;
	}

	function handleConfirmUpdate(grantedPermissions: string[]) {
		if (updateResult && updateSourceId) {
			sourceRegistry.applyUpdate(updateSourceId, updateResult, grantedPermissions);
			updateResult = null;
			updateSourceId = '';
		}
	}

	function handleCancelUpdate() {
		updateResult = null;
		updateSourceId = '';
	}
</script>

<aside class="warning">
	<b>ВНИМАНИЕ!</b> Не вводите данные от своих аккаунтов (включая аккаунт DTF) для авторизации на сторонних серверах. Мы не несём
	ответственность за их действия, re:project управляет только источником «Сервер re:». Мы не можем проверить остальные источники на
	их добросовестность.
</aside>

<section class="sources" aria-label="Установленные источники">
	{#if sources.length === 0}
		<p class="empty">Нет установленных источников</p>
	{:else}
		{#each sources as source (source.manifest.id)}
			<SourceCard {source} onUpdateReady={handleUpdateReady} />
		{/each}
	{/if}
</section>

<SettingsGroup title="Добавить источник" description="Кастомные сервера и плагины меняют функционал клиента. Адрес репозитория или манифеста:">
	<div class="add">
		<input
			class="entry"
			type="text"
			aria-label="Адрес источника"
			bind:value={newSourceUrl}
			placeholder="github:user/repo или https://..."
			disabled={isAdding}
			onkeydown={(e) => {
				if (e.key === 'Enter' && newSourceUrl && !isAdding) handleAddSource();
			}}
		/>
		<SettingsButton variant="suggested" onclick={handleAddSource} disabled={isAdding || !newSourceUrl}>
			{isAdding ? 'Загрузка...' : 'Добавить'}
		</SettingsButton>
		<SettingsButton onclick={() => (showCatalog = true)}>Каталог</SettingsButton>
	</div>
	{#if addError}
		<p class="error" role="alert">{addError}</p>
	{/if}
</SettingsGroup>

{#if reviewManifest}
	<SourcePermissions 
		manifest={reviewManifest} 
		onConfirm={handleConfirmPermissions} 
		onCancel={handleCancelPermissions} 
	/>
{/if}

{#if updateResult}
	<SourceUpdate 
		{updateResult}
		currentGranted={sources.find(s => s.manifest.id === updateSourceId)?.grantedPermissions || []}
		onConfirm={handleConfirmUpdate}
		onCancel={handleCancelUpdate}
	/>
{/if}

{#if showCatalog}
	<SourceCatalog 
		onClose={() => showCatalog = false}
		onInstall={handleInstallFromCatalog}
	/>
{/if}

<style>
	.warning {
		margin-bottom: 28px;
		padding: 14px 20px;
		border-radius: 14px;
		background: color-mix(in srgb, #e5a50a 16%, var(--st-card));
		border: 1px solid color-mix(in srgb, #e5a50a 30%, transparent);
		font-size: 14px;
		line-height: 20px;
	}

	.sources {
		display: flex;
		flex-direction: column;
		gap: 20px;
		margin-bottom: 36px;
	}

	.empty {
		padding: 32px 24px;
		border-radius: 14px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow);
		color: var(--st-muted);
		text-align: center;
	}

	.add {
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
	}

	.error {
		margin: 0;
		padding: 0 20px 18px;
		color: var(--st-danger);
		font-size: 13px;
	}
</style>
