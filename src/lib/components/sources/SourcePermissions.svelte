<script lang="ts">
	import { untrack } from 'svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import type { SourceManifest, SourcePermission } from '$lib/api/sources/types';
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
		untrack(() => initCheckedState(preparePermissions(manifest)))
	);

	const PARAM_DESCRIPTIONS: Record<string, string> = {
		postId: 'ID постов, которые вы открываете',
		commentId: 'ID комментариев',
		subsiteId: 'ID подсайтов и блогов',
		userId: 'ID профилей пользователей',
		authorId: 'ID авторов'
	};

	let serverHost = $derived.by(() => {
		try {
			return new URL(manifest.api.baseUrl).host;
		} catch {
			return manifest.api.baseUrl;
		}
	});

	let disclosedParams = $derived.by(() => {
		const found = new Set<string>();
		const paramRegex = /\{([a-zA-Z0-9_]+)\}/g;
		for (const ep of Object.values(manifest.endpoints || {})) {
			let m: RegExpExecArray | null;
			while ((m = paramRegex.exec(ep.path)) !== null) {
				found.add(m[1]);
			}
			if (ep.params) {
				for (const p of Object.values(ep.params)) {
					while ((m = paramRegex.exec(p)) !== null) {
						found.add(m[1]);
					}
				}
			}
		}
		return Array.from(found).map((key) => PARAM_DESCRIPTIONS[key] || `Параметр {${key}}`);
	});

	function handleConfirm() {
		const granted = permissionsToReview
			.filter(p => p.required || checkedState[p.id])
			.map(p => p.id);
		onConfirm(granted);
	}
</script>

<Dialog label="Подключение источника" width="500px" onClose={onCancel}>
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

	<div class="section">
		<h3>🔒 ПРИВАТНОСТЬ И СЕТЬ</h3>
		<div class="privacy-box">
			<p>• Сервер источника (<strong>{serverHost}</strong>) видит ваш IP-адрес при выполнении запросов.</p>
			{#if disclosedParams.length > 0}
				<p>• Для загрузки данных серверу передаются:
					{#each disclosedParams as param, i}
						<span>{i > 0 ? ', ' : ''}<em>{param}</em></span>
					{/each}.
				</p>
			{/if}
			{#if manifest.auth?.type === 'none'}
				<p>• Личные токены и пароли от DTF этому источнику <strong>не передаются</strong>.</p>
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
	.privacy-box {
		display: flex;
		flex-direction: column;
		gap: 6px;
		background: var(--bg-secondary, #f8f9fa);
		padding: 12px;
		border-radius: 8px;
		border: 1px solid var(--border-color, #eee);
		font-size: 13px;
		line-height: 18px;
		color: var(--text-secondary, #555);
	}
	.privacy-box p {
		margin: 0;
		font-size: 13px;
		color: inherit;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 8px;
	}
</style>
