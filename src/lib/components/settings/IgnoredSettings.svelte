<script lang="ts">
	import AccountGate from './AccountGate.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSegmented from './SettingsSegmented.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import { api } from '$lib/api/index.svelte';
	import type { IgnoredSubsite } from '$lib/api/types';
	import {
		addIgnoredKeyword,
		addIgnoredTag,
		filterSettings,
		removeIgnoredKeyword,
		removeIgnoredTag
	} from '$lib/storage/filter.svelte';

	/*
	 * Страница «Чёрный список»:
	 * 1. Локальные фильтры: теги и ключевые слова (с расширяемыми полями ввода как био и скроллируемым списком).
	 * 2. Серверный ЧС: пользователи и темы DTF (с кнопкой «Убрать», которая на мобиле становится круглой с крестиком и всегда остаётся справа).
	 */

	// --- Локальные фильтры ---
	let tagInput = $state('');
	let keywordInput = $state('');

	function handleAddTag() {
		const raw = tagInput.trim();
		if (!raw) return;
		// Поддерживаем как один тег, так и несколько через запятую, пробел или новую строку
		const parts = raw.split(/[\s,]+/);
		for (const part of parts) {
			if (part) addIgnoredTag(part);
		}
		tagInput = '';
	}

	function handleTagKeyDown(e: KeyboardEvent) {
		// Enter без Shift добавляет теги
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAddTag();
		}
	}

	function handleAddKeyword() {
		const raw = keywordInput.trim();
		if (!raw) return;
		// Поддерживаем ключевые слова через запятую или с новой строки
		const parts = raw.split(/[\n,]+/);
		for (const part of parts) {
			const clean = part.trim();
			if (clean) addIgnoredKeyword(clean);
		}
		keywordInput = '';
	}

	function handleKeywordKeyDown(e: KeyboardEvent) {
		// Enter без Shift добавляет ключевые слова
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAddKeyword();
		}
	}

	// --- Серверный ЧС DTF ---
	let items = $state<IgnoredSubsite[]>();
	let error = $state<string>();

	api.getIgnoredSubsites().then(
		(value) => (items = value),
		(e: Error) => (error = e.message)
	);

	let users = $derived(items?.filter((item) => !item.isCommunity) ?? []);
	let communities = $derived(items?.filter((item) => item.isCommunity) ?? []);

	async function restore(item: IgnoredSubsite) {
		if (!items) return;
		const before = items;
		items = items.filter((other) => other.id !== item.id);
		error = undefined;
		try {
			await api.setSubsiteIgnored(item.id, false);
		} catch (e) {
			items = before;
			error = (e as Error).message;
		}
	}
</script>

{#snippet list(title: string, subsites: IgnoredSubsite[])}
	{#if subsites.length}
		<SettingsGroup {title}>
			{#each subsites as item (item.id)}
				<div class="ignored-row">
					<span class="avatar" style:background-image={item.avatarUrl ? `url(${item.avatarUrl})` : undefined}></span>
					<div class="ignored-row__info">
						<span class="ignored-row__name">{item.name}</span>
						{#if item.description}
							<span class="ignored-row__desc">{item.description}</span>
						{/if}
					</div>
					<button
						class="unignore-btn"
						type="button"
						aria-label="Убрать {item.name} из чёрного списка"
						onclick={() => restore(item)}
					>
						<span class="unignore-btn__text">Убрать</span>
						<svg class="unignore-btn__icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
							<path d="M4 4l8 8M12 4l-8 8" />
						</svg>
					</button>
				</div>
			{/each}
		</SettingsGroup>
	{/if}
{/snippet}

<!-- Параметры фильтрации -->
<SettingsGroup title="Параметры фильтрации" description="Настройка поведения клиентского скрытия нежелательного контента.">
	<SettingsRow
		title="Режим скрытия"
		subtitle={filterSettings.value.mode === 'soft'
			? 'Мягкий: скрывает под плашку с кнопкой «Показать»'
			: 'Жёсткий: полностью вырезает элементы из ленты'}
	>
		<SettingsSegmented
			options={[
				{ value: 'soft', title: 'Мягкий' },
				{ value: 'hard', title: 'Жёсткий' }
			]}
			value={filterSettings.value.mode}
			label="Режим скрытия"
			onchange={(mode) => filterSettings.patch({ mode })}
		/>
	</SettingsRow>
	<SettingsRow
		title="Фильтровать посты"
		subtitle="Скрывать посты в ленте по тегам и фразам"
		tag="label"
	>
		<SettingsSwitch
			checked={filterSettings.value.filterPosts}
			label="Фильтровать посты"
			onchange={(filterPosts) => filterSettings.patch({ filterPosts })}
		/>
	</SettingsRow>
	<SettingsRow
		title="Фильтровать комментарии"
		subtitle="Скрывать комментарии под постами по тегам и фразам"
		tag="label"
	>
		<SettingsSwitch
			checked={filterSettings.value.filterComments}
			label="Фильтровать комментарии"
			onchange={(filterComments) => filterSettings.patch({ filterComments })}
		/>
	</SettingsRow>
</SettingsGroup>

<!-- Локальные фильтры (клиентский ЧС) -->
<SettingsGroup title="Локальные фильтры" description="Скрытие постов в приложении по тегам и фразам без авторизации на DTF.">
	<div class="filter-card">
		<label class="filter-label" for="ignored-tags-input">Скрытые теги (через пробел, запятую или Enter)</label>
		<div class="input-container">
			<textarea
				id="ignored-tags-input"
				class="filter-textarea"
				rows="2"
				placeholder="Например: #аниме, #политика, спойлеры…"
				bind:value={tagInput}
				onkeydown={handleTagKeyDown}
			></textarea>
			<div class="input-actions">
				<SettingsButton disabled={!tagInput.trim()} onclick={handleAddTag}>Добавить</SettingsButton>
			</div>
		</div>

		{#if filterSettings.value.tags.length > 0}
			<div class="chips-container" aria-label="Скрытые теги">
				{#each filterSettings.value.tags as tag (tag)}
					<span class="chip">
						<span class="chip__label">#{tag}</span>
						<button
							class="chip__remove"
							type="button"
							aria-label="Удалить тег #{tag}"
							onclick={() => removeIgnoredTag(tag)}
						>
							<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
								<path d="M4 4l8 8M12 4l-8 8" />
							</svg>
						</button>
					</span>
				{/each}
			</div>
		{:else}
			<p class="empty-hint">Нет скрытых тегов</p>
		{/if}
	</div>

	<div class="filter-card filter-card--top-border">
		<label class="filter-label" for="ignored-keywords-input">Скрытые ключевые слова и фразы</label>
		<div class="input-container">
			<textarea
				id="ignored-keywords-input"
				class="filter-textarea"
				rows="2"
				placeholder="Например: спойлер к финалу, слив сюжета…"
				bind:value={keywordInput}
				onkeydown={handleKeywordKeyDown}
			></textarea>
			<div class="input-actions">
				<SettingsButton disabled={!keywordInput.trim()} onclick={handleAddKeyword}>Добавить</SettingsButton>
			</div>
		</div>

		{#if filterSettings.value.keywords.length > 0}
			<div class="chips-container" aria-label="Скрытые ключевые слова">
				{#each filterSettings.value.keywords as kw (kw)}
					<span class="chip">
						<span class="chip__label">{kw}</span>
						<button
							class="chip__remove"
							type="button"
							aria-label="Удалить ключевое слово {kw}"
							onclick={() => removeIgnoredKeyword(kw)}
						>
							<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
								<path d="M4 4l8 8M12 4l-8 8" />
							</svg>
						</button>
					</span>
				{/each}
			</div>
		{:else}
			<p class="empty-hint">Нет скрытых ключевых слов</p>
		{/if}
	</div>
</SettingsGroup>

<!-- Серверный ЧС DTF -->
<h3 class="section-title">Скрытые на DTF</h3>
<AccountGate>
	{#if items}
		{@render list('Пользователи', users)}
		{@render list('Темы и подсайты', communities)}
		{#if !items.length}
			<p class="status">В аккаунте DTF никого не скрыто.</p>
		{/if}
	{:else if !error}
		<p class="status">Загрузка с DTF…</p>
	{/if}
	{#if error}<p class="status status--error">{error}</p>{/if}
</AccountGate>

<style>
	.section-title {
		margin: 24px 4px 8px;
		color: var(--st-muted);
		font-size: 13px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.filter-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px 20px;
	}

	.filter-card--top-border {
		border-top: 1px solid var(--st-separator);
	}

	.filter-label {
		color: var(--st-muted);
		font-size: 13px;
	}

	.input-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Поле ввода как в описании профиля (био) с вертикальным ресайзом */
	.filter-textarea {
		width: 100%;
		min-width: 0;
		min-height: 48px;
		padding: 10px 14px;
		border: 1px solid transparent;
		border-radius: 14px;
		background: var(--st-field);
		color: inherit;
		font-family: inherit;
		font-size: 14px;
		line-height: 20px;
		outline: none;
		resize: vertical;
		transition: border-color var(--duration-base), background-color var(--duration-base);
	}

	.filter-textarea:focus {
		border-color: var(--st-accent);
		background: var(--st-card);
	}

	.filter-textarea::placeholder {
		color: var(--st-muted);
	}

	.input-actions {
		display: flex;
		justify-content: flex-end;
	}

	/* Просторная скроллируемая область для списка тегов */
	.chips-container {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		min-height: 48px;
		max-height: 200px;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 10px 12px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--st-field) 50%, transparent);
		border: 1px solid var(--st-separator);
		align-content: flex-start;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 32px;
		padding: 0 8px 0 12px;
		border-radius: 16px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow-soft);
		color: inherit;
		font-size: 13px;
		font-weight: 500;
	}

	.chip__label {
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chip__remove {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		color: var(--st-muted);
		cursor: pointer;
		transition: background-color var(--duration-base), color var(--duration-base);
	}

	.chip__remove:hover {
		background: var(--st-button-hover);
		color: var(--st-danger);
	}

	.empty-hint {
		margin: 4px 0 0;
		color: var(--st-muted);
		font-size: 13px;
	}

	/* Строка списка ЧС DTF: гарантированно 1 строка, кнопка всегда справа */
	.ignored-row {
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 12px;
		min-height: 56px;
		padding: 10px 20px;
	}

	.ignored-row:not(:first-child) {
		border-top: 1px solid var(--st-separator);
	}

	.ignored-row__info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.ignored-row__name {
		font-size: 15px;
		line-height: 20px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ignored-row__desc {
		color: var(--st-muted);
		font-size: 13px;
		line-height: 18px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.avatar {
		flex: none;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--st-field) 50% 50% / cover no-repeat;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
	}

	/* Кнопка «Убрать»: на десктопе с текстом, на узких экранах круглая с крестиком */
	.unignore-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		margin-left: auto;
		height: 32px;
		padding: 0 14px;
		border-radius: 16px;
		background: var(--st-button);
		color: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--duration-base), color var(--duration-base);
	}

	.unignore-btn:hover {
		background: var(--st-button-hover);
		color: var(--st-danger);
	}

	.unignore-btn__icon {
		display: none;
	}

	@container (max-width: 719px) {
		.filter-card {
			padding: 14px 16px;
		}

		.ignored-row {
			padding: 10px 16px;
		}

		.unignore-btn {
			width: 34px;
			height: 34px;
			padding: 0;
			border-radius: 50%;
		}

		.unignore-btn__text {
			display: none;
		}

		.unignore-btn__icon {
			display: block;
		}
	}

	.status {
		margin: 0 4px 24px;
		color: var(--st-muted);
		font-size: 14px;
	}

	.status--error {
		color: var(--st-danger);
	}
</style>
