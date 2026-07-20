<script lang="ts">
	import type { SourceManifest, SourcePermission } from '$lib/api/sources/types';
	import { fade } from 'svelte/transition';
	import { getPermissionDescription } from './utils';

	let {
		manifest,
		onConfirm,
		onCancel
	}: {
		manifest: SourceManifest;
		onConfirm: (grantedPermissions: string[]) => void;
		onCancel: () => void;
	} = $props();

	function preparePermissions(m: SourceManifest) {
		let perms = (m.permissions || []).map(p => 
			p.id === 'auth:bio_write' ? { ...p, required: true } : p
		);
		if (m.auth?.type === 'bio_verification') {
			if (!perms.find((p) => p.id === 'auth:bio_write')) {
				perms.push({
					id: 'auth:bio_write',
					description: '',
					required: true
				});
			}
		}
		return perms;
	}

	let permissionsToReview = $derived(preparePermissions(manifest));

	function initCheckedState(perms: SourcePermission[]) {
		const state: Record<string, boolean> = {};
		for (const p of perms) {
			state[p.id] = p.required ? true : false;
		}
		return state;
	}

	let checkedState = $state<Record<string, boolean>>(
		initCheckedState(preparePermissions(manifest))
	);

	function handleConfirm() {
		const granted = permissionsToReview
			.filter(p => p.required || checkedState[p.id])
			.map(p => p.id);
		onConfirm(granted);
	}
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onCancel(); }} />

<div 
	class="modal-overlay" 
	transition:fade={{duration: 200}} 
	onclick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
	role="presentation"
>
	<div class="modal-content">
		<h2>Подключение источника</h2>
		<p>Вы собираетесь добавить источник: <strong>{manifest.name}</strong></p>
		
		<div class="section">
			<h3>📋 ЭНДПОИНТЫ (информационно)</h3>
			<div class="endpoints-list">
				{#if Object.values(manifest.endpoints || {}).length === 0}
					<div class="endpoint-item"><span style="font-size: 13px; color: #666;">Нет эндпоинтов</span></div>
				{:else}
					{#each Object.values(manifest.endpoints || {}) as endpoint}
						<div class="endpoint-item">
							<span class="method {endpoint.method.toLowerCase()}">{endpoint.method}</span>
							<div class="endpoint-info">
								<strong>{endpoint.label}</strong>
								<span>{endpoint.description}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		{#if permissionsToReview.length > 0}
			<div class="section">
				<h3>⚠️ РАЗРЕШЕНИЯ (подтверждение)</h3>
				<div class="permissions-list">
					{#each permissionsToReview as perm (perm.id)}
						<label class="permission-item" class:required={perm.required}>
							<input 
								type="checkbox" 
								bind:checked={checkedState[perm.id]} 
								disabled={perm.required}
							/>
							<span>{getPermissionDescription(perm)}</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}

		<div class="actions">
			<button class="btn secondary" onclick={onCancel}>Отмена</button>
			<button class="btn primary" onclick={handleConfirm}>Подтвердить</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	}
	.modal-content {
		background: white;
		border-radius: 12px;
		padding: 24px;
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-shadow: 0 4px 24px rgba(0,0,0,0.15);
	}
	.section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2 { margin: 0; font-size: 20px; color: #333; }
	p { margin: 0; font-size: 15px; color: #444; }
	h3 { margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
	.endpoints-list, .permissions-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: #f8f9fa;
		padding: 12px;
		border-radius: 8px;
		border: 1px solid #eee;
	}
	.endpoint-item {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding-bottom: 8px;
		border-bottom: 1px solid #eee;
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
	.method.get { background: #4caf50; }
	.method.post { background: #2196f3; }
	.method.put { background: #ff9800; }
	.method.delete { background: #f44336; }
	
	.endpoint-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 13px;
	}
	.endpoint-info strong { color: #333; }
	.endpoint-info span { color: #666; }
	
	.permission-item {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		font-size: 14px;
		cursor: pointer;
		color: #333;
	}
	.permission-item.required {
		opacity: 0.8;
		cursor: not-allowed;
	}
	.permission-item input {
		margin-top: 3px;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 8px;
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
	.btn.primary {
		background: #1976d2;
		color: white;
	}
	.btn.primary:hover {
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
</style>
