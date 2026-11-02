<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import { CATALOG_URL } from '$lib/api/sources/builtins';

	let {
		onInstall,
		onClose
	}: {
		onInstall: (manifestUrl: string) => void;
		onClose: () => void;
	} = $props();

	// Type for catalog
	interface CatalogSource {
		id: string;
		name: string;
		description: string;
		author: string;
		manifestUrl: string;
		icon?: string;
		tags?: string[];
		verified?: boolean;
	}

	interface CatalogData {
		catalogVersion: number;
		lastUpdated: string;
		sources: CatalogSource[];
	}
	
	let catalogPromise = $state<Promise<CatalogData>>(fetchCatalog());

	async function fetchCatalog() {
		const response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(5000) });
		if (!response.ok) {
			throw new Error(`Не удалось загрузить каталог (статус ${response.status})`);
		}
		return await response.json() as CatalogData;
	}

	function handleInstall(source: CatalogSource) {
		onInstall(source.manifestUrl);
	}
</script>

<Dialog label="Каталог источников" width="600px" {onClose}>
	<div class="header">
		<h2>Каталог источников</h2>
		<button class="close-btn" onclick={onClose} aria-label="Закрыть">&times;</button>
	</div>
	
	{#await catalogPromise}
		<div class="loading">Загрузка каталога...</div>
	{:then catalog}
		<div class="catalog-list">
			{#if !catalog?.sources || catalog.sources.length === 0}
				<div class="empty">Каталог пуст</div>
			{:else}
				{#each catalog.sources as source (source.id)}
					<div class="catalog-item">
						{#if source.icon}
							<img src={source.icon} alt="" class="source-icon" />
						{/if}
						<div class="info">
							<div class="title-row">
								<h3>{source.name}</h3>
								{#if source.verified}
									<span class="verified-badge" title="Проверен командой reDTF">✓ Проверен</span>
								{/if}
							</div>
							<p class="desc">{source.description}</p>
							<div class="meta">
								<span class="author">Автор: {source.author}</span>
								{#if source.tags && source.tags.length > 0}
									<div class="tags">
										{#each source.tags as tag}
											<span class="tag">#{tag}</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
						<button class="btn primary install-btn" onclick={() => handleInstall(source)}>
							Установить
						</button>
					</div>
				{/each}
			{/if}
		</div>
		<div class="footer-meta">
			Обновлено: {new Date(catalog.lastUpdated).toLocaleDateString()}
		</div>
	{:catch error}
		<div class="error">
			<p>Ошибка загрузки каталога</p>
			<p class="error-msg">{error.message}</p>
			<button class="btn secondary" onclick={() => catalogPromise = fetchCatalog()}>Повторить</button>
		</div>
	{/await}
</Dialog>

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.header h2 {
		margin: 0;
		font-size: 20px;
		color: #333;
	}
	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		line-height: 1;
		cursor: pointer;
		color: #999;
	}
	.close-btn:hover {
		color: #333;
	}

	.loading, .empty {
		text-align: center;
		padding: 40px;
		color: #666;
	}

	.catalog-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.catalog-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #eee;
		gap: 16px;
	}

	.source-icon {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		object-fit: cover;
		background: white;
		border: 1px solid #e0e0e0;
		flex-shrink: 0;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.title-row h3 {
		margin: 0;
		font-size: 16px;
		color: #333;
	}

	.verified-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		background: #e8f5e9;
		color: #2e7d32;
		border-radius: 12px;
		font-size: 11px;
		font-weight: 600;
		border: 1px solid #c8e6c9;
	}

	.desc {
		margin: 0;
		font-size: 14px;
		color: #555;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 12px;
		color: #777;
		margin-top: 4px;
	}

	.tags {
		display: flex;
		gap: 6px;
	}

	.tag {
		background: #e0e0e0;
		padding: 2px 6px;
		border-radius: 4px;
		color: #555;
	}

	.install-btn {
		margin-left: 16px;
		white-space: nowrap;
	}

	.footer-meta {
		font-size: 12px;
		color: #999;
		text-align: right;
	}

	.error {
		text-align: center;
		padding: 30px;
		color: #d32f2f;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.error-msg {
		font-family: monospace;
		background: #fbe9e7;
		padding: 8px;
		border-radius: 4px;
	}
</style>
