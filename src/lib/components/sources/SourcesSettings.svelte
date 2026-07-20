<script lang="ts">
	import { sourceStorage } from '$lib/storage/sources.svelte';
	import { sourceRegistry } from '$lib/api/sources/registry.svelte';
	import SourceCard from './SourceCard.svelte';
	import SourcePermissions from './SourcePermissions.svelte';
	import SourceUpdate from './SourceUpdate.svelte';
	import type { SourceManifest } from '$lib/api/sources/types';
	import type { ManifestUpdateResult } from '$lib/api/sources/registry.svelte';
	import { fade } from 'svelte/transition';

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

<div class="sources-settings">
	<div class="sources-header">
		<h3>Управление источниками</h3>
		<p class="description">Добавляйте кастомные сервера и плагины для изменения функционала клиента.</p>
	</div>

	<div class="add-source-box">
		<label for="source-url">Добавить источник (URL репозитория):</label>
		<div class="input-group">
			<input 
				id="source-url" 
				type="text" 
				bind:value={newSourceUrl} 
				placeholder="github:user/repo или https://..." 
				disabled={isAdding}
				onkeydown={(e) => { if (e.key === 'Enter' && newSourceUrl && !isAdding) handleAddSource(); }}
			/>
			<button class="btn primary" onclick={handleAddSource} disabled={isAdding || !newSourceUrl}>
				{isAdding ? 'Загрузка...' : 'Добавить'}
			</button>
			<button class="btn secondary">Каталог</button>
		</div>
		{#if addError}
			<div class="error-msg" in:fade={{ duration: 200 }}>{addError}</div>
		{/if}
	</div>

	<div class="sources-list">
		{#if sources.length === 0}
			<div class="empty-state">Нет установленных источников</div>
		{:else}
			{#each sources as source (source.manifest.id)}
				<div transition:fade={{ duration: 200 }}>
					<SourceCard {source} onUpdateReady={handleUpdateReady} />
				</div>
			{/each}
		{/if}
	</div>
</div>

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

<style>
	.sources-settings {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.sources-header h3 {
		margin: 0 0 8px 0;
		color: #333;
	}

	.description {
		font-size: 14px;
		color: #666;
		margin: 0;
	}

	.add-source-box {
		background: #f4f5f7;
		padding: 16px;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.add-source-box label {
		font-size: 13px;
		font-weight: 500;
		color: #555;
	}

	.input-group {
		display: flex;
		gap: 8px;
	}

	.input-group input {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 14px;
	}

	.btn {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn.primary {
		background: #1976d2;
		color: white;
	}

	.btn.primary:not(:disabled):hover {
		background: #1565c0;
	}

	.btn.secondary {
		background: white;
		border-color: #ccc;
		color: #333;
	}

	.btn.secondary:hover {
		background: #f0f0f0;
	}

	.error-msg {
		color: #d32f2f;
		font-size: 13px;
		margin-top: 4px;
	}

	.sources-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.empty-state {
		text-align: center;
		padding: 30px;
		background: #f9f9f9;
		border-radius: 8px;
		color: #888;
		font-style: italic;
	}
</style>
