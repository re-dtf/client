<script lang="ts">
	import type { SourceState } from '$lib/api/sources/types';
	import { sourceRegistry } from '$lib/api/sources/registry.svelte';

	let { source } = $props<{ source: SourceState }>();

	let manifest = $derived(source.manifest);

	function toggleEnabled() {
		sourceRegistry.toggleSource(manifest.id, !source.enabled);
	}

	function removeSource() {
		if (confirm(`Вы уверены, что хотите удалить источник "${manifest.name}"?`)) {
			sourceRegistry.removeSource(manifest.id);
		}
	}
	
	function handleAuth() {
		sourceRegistry.authenticate(manifest.id).catch(err => {
			alert('Ошибка авторизации: ' + err.message);
		});
	}
	
	function handleRevokeAuth() {
		if (confirm('Выйти из аккаунта на этом источнике?')) {
			sourceRegistry.revokeAuth(manifest.id);
		}
	}
</script>

<div class="source-card" class:disabled={!source.enabled}>
	<div class="card-header">
		{#if manifest.icon}
			<img src={manifest.icon} alt="Icon" class="source-icon" />
		{/if}
		<div class="header-info">
			<h3>{manifest.name} <span class="version">v{manifest.version}</span></h3>
			{#if manifest.author}
				<div class="author">
					от 
					{#if manifest.author.url && manifest.author.url.startsWith('http')}
						<a href={manifest.author.url} target="_blank" rel="noopener noreferrer">{manifest.author.name}</a>
					{:else}
						{manifest.author.name}
					{/if}
				</div>
			{/if}
		</div>
		<div class="actions">
			<label class="toggle-switch">
				<input type="checkbox" checked={source.enabled} onchange={toggleEnabled} />
				<span class="slider round"></span>
			</label>
		</div>
	</div>

	<p class="description">{manifest.description}</p>
	
	<div class="tags">
		{#if source.isBuiltin}
			<span class="tag builtin">Встроенный</span>
		{/if}
		{#each manifest.tags || [] as tag}
			<span class="tag">{tag}</span>
		{/each}
		{#if manifest.auth && manifest.auth.type !== 'none'}
			{#if source.authToken}
				<span class="tag auth-success">✓ Авторизован</span>
			{:else}
				<span class="tag auth-required">⚠ Требуется вход</span>
			{/if}
		{/if}
	</div>

	<div class="card-footer">
		<button class="btn secondary">Настроить</button>
		<button class="btn secondary">Обновить</button>
		{#if manifest.auth && manifest.auth.type !== 'none'}
			{#if source.authToken}
				<button class="btn secondary" onclick={handleRevokeAuth}>Выйти</button>
			{:else}
				<button class="btn primary" onclick={handleAuth}>Авторизоваться</button>
			{/if}
		{/if}
		{#if !source.isBuiltin}
			<button class="btn danger" onclick={removeSource}>Удалить</button>
		{/if}
	</div>
</div>

<style>
	.source-card {
		background: #fdfdfd;
		border: 1px solid #eee;
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 12px;
		transition: opacity 0.2s;
	}

	.source-card.disabled {
		opacity: 0.6;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}

	.source-icon {
		width: 40px;
		height: 40px;
		border-radius: 6px;
		object-fit: cover;
	}

	.header-info {
		flex: 1;
	}

	.header-info h3 {
		margin: 0;
		font-size: 16px;
		color: #333;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.version {
		font-size: 12px;
		background: #eef2f5;
		color: #555;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: 500;
	}

	.author {
		font-size: 13px;
		color: #666;
		margin-top: 2px;
	}

	.author a {
		color: #1976d2;
		text-decoration: none;
	}

	.author a:hover {
		text-decoration: underline;
	}

	.description {
		font-size: 14px;
		line-height: 1.4;
		color: #444;
		margin: 0 0 12px 0;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 16px;
	}

	.tag {
		font-size: 11px;
		background: #f0f0f0;
		color: #555;
		padding: 4px 8px;
		border-radius: 4px;
	}

	.tag.builtin {
		background: #e3f2fd;
		color: #1565c0;
		font-weight: 500;
	}
	
	.tag.auth-success {
		background: #e8f5e9;
		color: #2e7d32;
		font-weight: 500;
	}
	
	.tag.auth-required {
		background: #fff3e0;
		color: #e65100;
		font-weight: 500;
	}

	.card-footer {
		display: flex;
		gap: 8px;
		border-top: 1px solid #f0f0f0;
		padding-top: 12px;
	}

	.btn {
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 13px;
		cursor: pointer;
		border: 1px solid transparent;
		background: transparent;
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
		border-color: #ddd;
		color: #333;
		background: #fafafa;
	}

	.btn.secondary:hover {
		background: #f0f0f0;
	}

	.btn.danger {
		color: #d32f2f;
		margin-left: auto;
	}

	.btn.danger:hover {
		background: #ffebee;
	}

	/* Toggle Switch */
	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 22px;
	}
	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}
	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		transition: .4s;
	}
	.slider:before {
		position: absolute;
		content: "";
		height: 16px;
		width: 16px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: .4s;
	}
	input:checked + .slider {
		background-color: #4caf50;
	}
	input:focus + .slider {
		box-shadow: 0 0 1px #4caf50;
	}
	input:checked + .slider:before {
		transform: translateX(18px);
	}
	.slider.round {
		border-radius: 22px;
	}
	.slider.round:before {
		border-radius: 50%;
	}
</style>
