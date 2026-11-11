<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import SourceAvatar from './SourceAvatar.svelte';
	import { CATALOG_REPO_URL } from '$lib/api/sources/builtins';
	import { catalogTags, fetchCatalog, filterCatalog, isInstalled, type Catalog, type CatalogSource } from '$lib/api/sources/catalog';
	import { sourceStorage } from '$lib/storage/sources.svelte';

	let {
		onInstall,
		onClose
	}: {
		/** Бросает ошибку, если источник не удалось загрузить: каталог покажет её на карточке */
		onInstall: (manifestUrl: string) => Promise<void>;
		onClose: () => void;
	} = $props();

	// Поиск и теги нужны, когда есть из чего выбирать
	const TOOLS_FROM = 4;

	let catalog = $state<Catalog | null>(null);
	let loadError = $state('');
	let loading = $state(true);

	let query = $state('');
	let tag = $state<string | null>(null);

	let installing = $state<string | null>(null);
	let failed = $state<Record<string, string>>({});

	let sources = $derived(catalog?.sources ?? []);
	let tags = $derived(catalogTags(sources));
	let shown = $derived(filterCatalog(sources, query, tag));

	async function load() {
		loading = true;
		loadError = '';
		try {
			catalog = await fetchCatalog();
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Не удалось загрузить каталог';
		} finally {
			loading = false;
		}
	}
	load();

	async function install(source: CatalogSource) {
		installing = source.id;
		const { [source.id]: _cleared, ...rest } = failed;
		failed = rest;
		try {
			await onInstall(source.manifestUrl);
		} catch (e) {
			failed = { ...failed, [source.id]: e instanceof Error ? e.message : 'Не удалось установить источник' };
		} finally {
			installing = null;
		}
	}

	function resetFilters() {
		query = '';
		tag = null;
	}
</script>

<Dialog label="Каталог источников" width="680px" flush {onClose}>
	<header class="head">
		<div class="head__text">
			<h2>Каталог источников</h2>
			<p>Разрешения, которые нужны источнику, вы увидите до установки.</p>
		</div>
		<button class="close" onclick={onClose} aria-label="Закрыть">
			<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
		</button>
	</header>

	{#if sources.length >= TOOLS_FROM}
		<div class="tools">
			<input class="search" type="search" aria-label="Поиск по каталогу" placeholder="Поиск по названию, автору, тегам" bind:value={query} />
			{#if tags.length > 1}
				<div class="chips" role="group" aria-label="Теги">
					<button class={['chip', { 'chip--on': tag === null }]} aria-pressed={tag === null} onclick={() => (tag = null)}>Все</button>
					{#each tags as t (t)}
						<button class={['chip', { 'chip--on': tag === t }]} aria-pressed={tag === t} onclick={() => (tag = tag === t ? null : t)}>{t}</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="body">
		{#if loading}
			<ul class="list" aria-busy="true" aria-label="Загрузка каталога">
				{#each [0, 1, 2] as i (i)}
					<li class="card card--skeleton">
						<span class="sk sk--avatar"></span>
						<div class="main">
							<span class="sk sk--line" style:width="40%"></span>
							<span class="sk sk--line" style:width="85%"></span>
							<span class="sk sk--line" style:width="25%"></span>
						</div>
					</li>
				{/each}
			</ul>
		{:else if loadError}
			<div class="state" role="alert">
				<h3>Не удалось загрузить каталог</h3>
				<p>{loadError}. Источник можно подключить и вручную, по адресу манифеста.</p>
				<button class="act" onclick={load}>Повторить</button>
			</div>
		{:else if sources.length === 0}
			<div class="state">
				<h3>Каталог пока пуст</h3>
				<p>Источники появятся здесь, когда их добавят в каталог.</p>
			</div>
		{:else if shown.length === 0}
			<div class="state">
				<h3>Ничего не найдено</h3>
				<p>Попробуйте другой запрос или сбросьте фильтры.</p>
				<button class="act" onclick={resetFilters}>Сбросить</button>
			</div>
		{:else}
			<ul class="list">
				{#each shown as source (source.id)}
					{@const installed = isInstalled(source, sourceStorage.sources)}
					<li class="card">
						<SourceAvatar name={source.name} icon={source.icon} />
						<div class="main">
							<div class="title">
								<h3>{source.name}</h3>
								{#if source.verified}
									<span class="badge badge--ok" title="Проверен командой reDTF">
										<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
										Проверен
									</span>
								{:else}
									<span class="badge" title="Источник не проверен командой reDTF: изучите его разрешения перед установкой">Сообщество</span>
								{/if}
							</div>
							{#if source.description}
								<p class="desc">{source.description}</p>
							{/if}
							<p class="meta">
								{#if source.author}<span>{source.author}</span>{/if}
								{#each source.tags as t (t)}<span class="tag">{t}</span>{/each}
							</p>
						</div>
						<div class="side">
							{#if installed}
								<span class="installed">Установлен</span>
							{:else}
								<button class="act suggested" disabled={installing !== null} onclick={() => install(source)}>
									{installing === source.id ? 'Загрузка…' : 'Установить'}
								</button>
							{/if}
						</div>
						{#if failed[source.id]}
							<p class="fail" role="alert">{failed[source.id]}</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<footer class="foot">
		<span>
			{#if catalog?.updatedAt}Обновлён {catalog.updatedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}{/if}
		</span>
		<a href={CATALOG_REPO_URL} target="_blank" rel="noopener noreferrer">Предложить источник</a>
	</footer>
</Dialog>

<style>
	.head,
	.tools,
	.foot {
		display: flex;
		flex: none;
		padding: 18px 24px;
	}

	.head {
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		border-bottom: 1px solid var(--st-separator, var(--border-subtle, rgba(128, 128, 128, 0.2)));
	}

	h2 {
		font-size: 20px;
		font-weight: 600;
		line-height: 28px;
	}

	.head p,
	.meta,
	.foot {
		color: var(--st-muted, var(--text-muted, #66646b));
		font-size: 13px;
		line-height: 19px;
	}

	.close {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		margin: -4px -8px 0 0;
		border-radius: 50%;
		color: var(--st-muted, var(--text-muted, #66646b));
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.close:hover {
		background: var(--st-button, rgba(128, 128, 128, 0.15));
	}

	.close:focus-visible,
	.chip:focus-visible,
	.search:focus-visible {
		outline: 2px solid var(--st-accent, var(--color-blue, #3584e4));
	}

	.tools {
		flex-direction: column;
		gap: 12px;
		padding-bottom: 6px;
	}

	.search {
		width: 100%;
		height: 40px;
		padding: 0 16px;
		border-radius: 20px;
		background: var(--st-field, rgba(128, 128, 128, 0.12));
		color: inherit;
		font-size: 14px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		padding: 4px 12px;
		border-radius: 14px;
		background: var(--st-button, rgba(128, 128, 128, 0.15));
		font-size: 13px;
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.chip:hover {
		background: var(--st-button-hover, rgba(128, 128, 128, 0.22));
	}

	.chip--on,
	.chip--on:hover {
		background: var(--st-accent, var(--color-blue, #3584e4));
		color: #fff;
	}

	.body {
		flex: 1 1 auto;
		min-height: 260px;
		padding: 18px 24px;
		overflow-y: auto;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: start;
		gap: 4px 16px;
		padding: 16px;
		border-radius: 14px;
		background: color-mix(in srgb, currentColor 5%, transparent);
	}

	.main {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.title {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
	}

	h3 {
		font-size: 16px;
		font-weight: 600;
		line-height: 22px;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 1px 8px;
		border-radius: 10px;
		background: var(--st-button, rgba(128, 128, 128, 0.15));
		color: var(--st-muted, var(--text-muted, #66646b));
		font-size: 12px;
		font-weight: 500;
	}

	.badge--ok {
		background: color-mix(in srgb, var(--st-ok, #1f8a3b) 16%, transparent);
		color: var(--st-ok, #1f8a3b);
	}

	.desc {
		font-size: 14px;
		line-height: 20px;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
	}

	.tag {
		padding: 0 8px;
		border-radius: 6px;
		background: var(--st-button, rgba(128, 128, 128, 0.15));
		font-size: 12px;
	}

	.side {
		display: flex;
		align-items: center;
		min-height: 38px;
	}

	.installed {
		color: var(--st-ok, #1f8a3b);
		font-size: 14px;
		font-weight: 500;
	}

	.fail {
		grid-column: 1 / -1;
		padding: 8px 12px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--st-danger, #c01c28) 12%, transparent);
		color: var(--st-danger, #c01c28);
		font-size: 13px;
		line-height: 18px;
		overflow-wrap: anywhere;
	}

	.state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 48px 16px;
		text-align: center;
	}

	.state p {
		max-width: 36ch;
		margin-bottom: 8px;
		color: var(--st-muted, var(--text-muted, #66646b));
		font-size: 14px;
		line-height: 20px;
	}

	.foot {
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		border-top: 1px solid var(--st-separator, var(--border-subtle, rgba(128, 128, 128, 0.2)));
	}

	.foot a {
		color: var(--st-accent, var(--color-blue, #3584e4));
	}

	.foot a:hover {
		text-decoration: underline;
	}

	.sk {
		display: block;
		border-radius: 8px;
		background: color-mix(in srgb, currentColor 10%, transparent);
		animation: pulse 1.4s ease-in-out infinite;
	}

	.sk--avatar {
		width: 44px;
		height: 44px;
		border-radius: 11px;
	}

	.sk--line {
		height: 14px;
	}

	@keyframes pulse {
		50% {
			opacity: 0.45;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sk {
			animation: none;
		}
	}

	@media (max-width: 560px) {
		.head,
		.tools,
		.foot,
		.body {
			padding-inline: 16px;
		}

		.chips {
			flex-wrap: nowrap;
			margin-inline: -16px;
			padding-inline: 16px;
			overflow-x: auto;
			scrollbar-width: none;
		}

		.chip {
			flex: none;
		}

		.card {
			grid-template-columns: auto 1fr;
		}

		.side {
			grid-column: 1 / -1;
		}

		.side .act {
			flex: 1;
		}
	}
</style>
