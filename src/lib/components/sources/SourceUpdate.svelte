<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import type { ManifestUpdateResult } from '$lib/api/sources/registry.svelte';
	import { getPermissionKey } from '$lib/api/sources/permissions';
	import { getPermissionDescription } from './utils';

	let {
		updateResult,
		currentGranted,
		onConfirm,
		onCancel
	}: {
		updateResult: ManifestUpdateResult;
		currentGranted: string[];
		onConfirm: (grantedPermissions: string[]) => void;
		onCancel: () => void;
	} = $props();

	// Initialize checkboxes for new permissions
	const checkedState = $state<Record<string, boolean>>(
		Object.fromEntries(
			updateResult.addedPermissions.map(p => [getPermissionKey(p.id, p.target), p.required ? true : false])
		)
	);

	function handleConfirm() {
		// Start with existing permissions, excluding those that were removed in the new manifest
		const removedIds = new Set(updateResult.removedPermissions.map(p => getPermissionKey(p.id, p.target)));
		const newGranted = currentGranted.filter(id => !removedIds.has(id));

		// Add newly granted permissions
		for (const p of updateResult.addedPermissions) {
			const key = getPermissionKey(p.id, p.target);
			if (p.required || checkedState[key]) {
				newGranted.push(key);
			}
		}

		// Ensure uniqueness before confirming
		onConfirm(Array.from(new Set(newGranted)));
	}
</script>

<Dialog label="Обновление источника" width="550px" onClose={onCancel}>
	<h2>Обновление источника</h2>
	<p>Вы собираетесь обновить источник <strong>{updateResult.newManifest.name}</strong></p>
	
	<div class="version-badge">
		v{updateResult.oldVersion} &rarr; v{updateResult.newVersion}
	</div>

	{#if updateResult.changelog}
		<div class="section">
			<h3>📄 ИЗМЕНЕНИЯ (CHANGELOG)</h3>
			<div class="changelog-box">
				{updateResult.changelog}
			</div>
		</div>
	{/if}

	{#if Object.keys(updateResult.addedEndpoints).length > 0 || updateResult.removedEndpoints.length > 0 || Object.keys(updateResult.modifiedEndpoints).length > 0}
		<div class="section">
			<h3>📋 ИЗМЕНЕНИЯ ЭНДПОИНТОВ</h3>
			<div class="endpoints-list">
				{#each Object.entries(updateResult.addedEndpoints) as [key, endpoint]}
					<div class="endpoint-item diff-added">
						<span class="method {endpoint.method.toLowerCase()}">{endpoint.method}</span>
						<div class="endpoint-info">
							<strong>[НОВЫЙ] {endpoint.label}</strong>
							<span>{endpoint.description}</span>
						</div>
					</div>
				{/each}
				{#each Object.entries(updateResult.modifiedEndpoints) as [key, { old: oldEndpoint, new: newEndpoint }]}
					<div class="endpoint-item diff-modified">
						<span class="method {newEndpoint.method.toLowerCase()}">{newEndpoint.method}</span>
						<div class="endpoint-info">
							<strong>[ИЗМЕНЁН] {newEndpoint.label}</strong>
							<span>{newEndpoint.description}</span>
						</div>
					</div>
				{/each}
				{#each updateResult.removedEndpoints as key}
					<div class="endpoint-item diff-removed">
						<span class="method delete">DEL</span>
						<div class="endpoint-info">
							<strong>[УДАЛЁН] Эндпоинт {key}</strong>
							<span>Больше не поддерживается</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if updateResult.addedPermissions.length > 0}
		<div class="section">
			<h3>⚠️ НОВЫЕ РАЗРЕШЕНИЯ</h3>
			<div class="permissions-list">
				{#each updateResult.addedPermissions as perm (getPermissionKey(perm.id, perm.target))}
					<label class="permission-item" class:required={perm.required}>
						<input 
							type="checkbox" 
							bind:checked={checkedState[getPermissionKey(perm.id, perm.target)]} 
							disabled={perm.required}
						/>
						<span>{getPermissionDescription(perm)}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}

	{#if updateResult.removedPermissions.length > 0}
		<div class="section">
			<h3>🗑️ УДАЛЁННЫЕ РАЗРЕШЕНИЯ</h3>
			<div class="permissions-list">
				{#each updateResult.removedPermissions as perm (getPermissionKey(perm.id, perm.target))}
					<div class="permission-item diff-removed">
						<span>{getPermissionDescription(perm)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="actions">
		<button class="btn secondary" onclick={onCancel}>Отмена</button>
		<button class="btn primary" onclick={handleConfirm}>Подтвердить обновление</button>
	</div>
</Dialog>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2 { margin: 0; font-size: 20px; color: var(--text-primary, #333); }
	p { margin: 0; font-size: 15px; color: var(--text-secondary, #444); }
	h3 { margin: 0; font-size: 14px; color: var(--text-muted, #666); text-transform: uppercase; letter-spacing: 0.5px; }
	
	.version-badge {
		align-self: flex-start;
		background: var(--bg-highlight, #e3f2fd);
		color: var(--color-blue, #1976d2);
		padding: 4px 12px;
		border-radius: 16px;
		font-weight: 500;
		font-size: 14px;
	}

	.changelog-box {
		background: var(--bg-secondary, #f8f9fa);
		border: 1px solid var(--border-color, #eee);
		padding: 12px;
		border-radius: 8px;
		font-family: monospace;
		font-size: 13px;
		color: var(--text-primary, #333);
		white-space: pre-wrap;
		max-height: 150px;
		overflow-y: auto;
	}

	.endpoints-list, .permissions-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: var(--bg-secondary, #f8f9fa);
		padding: 12px;
		border-radius: 8px;
		border: 1px solid var(--border-color, #eee);
	}
	.endpoint-item {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-color, #eee);
	}
	.endpoint-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}
	.method {
		font-size: 11px;
		font-weight: bold;
		padding: 2px 6px;
		border-radius: 4px;
		background: #ccc;
		color: white;
	}
	.method.get { background: var(--color-positive, #4caf50); }
	.method.post { background: var(--color-blue, #2196f3); }
	.method.put { background: var(--color-dislike, #ff9800); }
	.method.delete { background: var(--color-danger, #f44336); }
	
	.endpoint-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 13px;
	}
	.endpoint-info strong { color: var(--text-primary, #333); }
	.endpoint-info span { color: var(--text-secondary, #666); }
	
	.permission-item {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		font-size: 14px;
		cursor: pointer;
		color: var(--text-primary, #333);
	}
	.permission-item.required {
		opacity: 0.8;
		cursor: not-allowed;
	}
	.permission-item input {
		margin-top: 3px;
	}

	.diff-added strong { color: var(--color-positive, #2e7d32); }
	.diff-modified strong { color: var(--color-dislike, #f57c00); }
	.diff-removed { opacity: 0.6; text-decoration: line-through; }
	
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 8px;
	}
</style>
