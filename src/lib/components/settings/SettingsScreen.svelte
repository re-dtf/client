<script lang="ts">
	import AboutSettings from './AboutSettings.svelte';
	import AccountSettings from './AccountSettings.svelte';
	import FeedSettings from './FeedSettings.svelte';
	import FieldControl from './FieldControl.svelte';
	import HelpSettings from './HelpSettings.svelte';
	import IgnoredSettings from './IgnoredSettings.svelte';
	import NotificationSettings from './NotificationSettings.svelte';
	import ProxySettings from './ProxySettings.svelte';
	import ReactionsSettings from './ReactionsSettings.svelte';
	import SettingsEmptyState from './SettingsEmptyState.svelte';
	import SettingsIcon from './SettingsIcon.svelte';
	import StatsSettings from './StatsSettings.svelte';
	import SourcesSettings from '$lib/components/sources/SourcesSettings.svelte';
	import { activeTheme, themes } from '$lib/themes/index.svelte';
	import { getTheme, themeSettingsSchema } from '$lib/themes/registry';
	import { activeThemeSettings } from '$lib/themes/settings.svelte';
	import { settings, DEFAULT_THEME } from '$lib/storage/settings.svelte';
	import type { NestingMode, CommentVirtualization, ColorScheme } from '$lib/storage/settings.svelte';
	import { isFieldVisible } from '$lib/themes/types';
	import type { ChoiceField, SettingField, ToggleField } from '$lib/themes/types';
	import { haptics } from '$lib/haptics';

	/*
	 * Окно настроек в духе libadwaita с двухуровневой навигацией:
	 * - Уровень 1 (Главное меню): категории и пункты настроек.
	 *   Пункты могут быть либо прямыми страницами, либо папками.
	 * - Уровень 2 (Подменю раздела): шапка сайдбара меняется на имя раздела со стрелкой назад,
	 *   а в сайдбаре показываются подпункты категории.
	 * - Режим Solo: возможность скрыть сайдбар для сфокусированного просмотра (например, ЧС из Ленты).
	 */
	let {
		onclose,
		page,
		section,
		solo = false
	}: {
		onclose: () => void;
		page?: string;
		section?: string;
		solo?: boolean;
	} = $props();

	// --- Описания общих полей настроек ---
	let colorSchemeDescription = $derived(
		activeTheme.supportsDarkMode
			? 'Цветовая схема для интерфейса приложения и тем с поддержкой тёмного режима.'
			: `Текущая тема (${activeTheme.name}) не поддерживает тёмный режим и отображается в светлом оформлении.`
	);

	let colorSchemeField = $derived<ChoiceField>({
		key: 'colorScheme',
		type: 'radio',
		title: 'Тема оформления',
		description: colorSchemeDescription,
		default: 'auto',
		options: [
			{ value: 'auto', title: 'Системная', description: 'Следовать настройкам системы' },
			{ value: 'light', title: 'Светлая' },
			{ value: 'dark', title: 'Тёмная' }
		]
	});
	const themeField: ChoiceField = {
		key: 'theme',
		type: 'radio',
		title: 'Выбор темы',
		default: DEFAULT_THEME,
		options: themes.map((theme) => ({ value: theme.id, title: theme.name, description: theme.description }))
	};

	const hapticsField: ToggleField = {
		key: 'haptics',
		type: 'toggle',
		title: 'Тактильный отклик (вибрация)',
		description: 'Вибрация при лайках, реакциях и переключении вкладок (для Android)',
		default: true
	};

	const disableMobileTopBarField: ToggleField = {
		key: 'disableMobileTopBar',
		type: 'toggle',
		title: 'Отключить верхний бар в мобильной версии',
		description: 'Скрывать шапку с логотипом на смартфонах для экономии места',
		default: false
	};

	const nestingField: ChoiceField = {
		key: 'commentNesting',
		type: 'radio',
		title: 'Вложенные комментарии',
		description: 'Режим отображения глубоко вложенных комментариев.',
		default: 'flatten',
		options: [
			{ value: 'flatten', title: 'Сглаживание (рекомендуется)', description: 'Глубокие ветки сглаживаются с навигацией к родителю' },
			{ value: 'autopan', title: 'Авто-панорама', description: 'Без лимита вложенности, камера следит за глубиной' }
		]
	};

	const virtualizationField: ChoiceField = {
		key: 'commentVirtualization',
		type: 'radio',
		title: 'Виртуализация комментариев',
		description: 'Оптимизирует отрисовку длинных веток (content-visibility). В Firefox может приводить к пропуску отображения.',
		default: 'auto',
		options: [
			{ value: 'auto', title: 'Авто (рекомендуется)', description: 'Включено в Chromium и Safari, отключено в Firefox' },
			{ value: 'enabled', title: 'Всегда включено', description: 'Максимальная скорость рендера' },
			{ value: 'disabled', title: 'Отключено', description: 'Полная отрисовка всех комментариев' }
		]
	};

	// --- Настройки темы ---
	let themeFields = $derived(themeSettingsSchema(activeTheme.id));
	let themeValues = $derived(activeThemeSettings());

	// Группировка динамических полей темы
	const VOTE_KEYS = new Set(['votes', 'arrowsSide', 'arrowsOrder']);
	const EDITOR_KEYS = new Set(['editorFullscreen']);

	let generalThemeFields = $derived(themeFields.filter((f) => !VOTE_KEYS.has(f.key) && !EDITOR_KEYS.has(f.key)));
	let votesThemeFields = $derived(themeFields.filter((f) => VOTE_KEYS.has(f.key)));
	let editorThemeFields = $derived(themeFields.filter((f) => EDITOR_KEYS.has(f.key)));

	// --- Структура навигации Уровня 1 ---
	interface RootNavItem {
		id: string;
		type: 'page' | 'folder';
		title: string;
		icon: string;
	}

	interface RootNavSection {
		title: string;
		items: RootNavItem[];
	}

	const ROOT_NAVIGATION: RootNavSection[] = [
		{
			title: 'Аккаунт',
			items: [
				{ id: 'account', type: 'page', title: 'Профиль', icon: 'profile' },
				{ id: 'notifications', type: 'page', title: 'Уведомления', icon: 'notifications' },
				{ id: 'ignored', type: 'page', title: 'Чёрный список', icon: 'ignored' }
			]
		},
		{
			title: 'Персонализация',
			items: [
				{ id: 'appearance', type: 'folder', title: 'Внешний вид', icon: 'appearance' },
				{ id: 'behavior', type: 'folder', title: 'Поведение', icon: 'behavior' }
			]
		},
		{
			title: 'Сеть',
			items: [
				{ id: 'sources', type: 'page', title: 'Источники данных', icon: 'sources' }
			]
		},
		{
			title: 'Данные',
			items: [
				{ id: 'stats', type: 'page', title: 'Моя статистика', icon: 'stats' }
			]
		},
		{
			title: 'Приложение',
			items: [
				{ id: 'help', type: 'page', title: 'Хочу помочь', icon: 'help' },
				{ id: 'about', type: 'page', title: 'О приложении', icon: 'about' }
			]
		}
	];

	// --- Структура навигации Уровня 2 ---
	interface SubNavItem {
		id: string;
		title: string;
		icon: string;
	}

	interface SubNavGroup {
		title: string;
		items: SubNavItem[];
	}

	const APPEARANCE_SUBNAV: SubNavGroup[] = [
		{
			title: 'Тема',
			items: [{ id: 'theme-select', title: 'Выбор темы', icon: 'theme-select' }]
		},
		{
			title: 'Персонализация',
			items: [
				{ id: 'appearance-general', title: 'Общее', icon: 'general' },
				{ id: 'appearance-votes', title: 'Оценки', icon: 'votes' },
				{ id: 'appearance-editor', title: 'Редактор', icon: 'editor' }
			]
		}
	];

	const BEHAVIOR_SUBNAV: SubNavGroup[] = [
		{
			title: 'Персонализация',
			items: [
				{ id: 'behavior-feed', title: 'Лента', icon: 'feed' },
				{ id: 'behavior-reactions', title: 'Реакции', icon: 'reactions' },
				{ id: 'behavior-comments', title: 'Комментарии', icon: 'comments' }
			]
		}
	];

	// --- Преобразование старых / прямых id страниц ---
	function resolveInitialNav(): { folderId: string | null; pageId: string | null } {
		const targetPage = page;
		const targetSection = section;

		if (targetSection === 'appearance' || targetPage === 'themes' || targetPage === 'theme') {
			const sub = targetPage === 'theme' ? 'appearance-general' : 'theme-select';
			return { folderId: 'appearance', pageId: targetPage ? sub : null };
		}
		if (targetSection === 'behavior' || targetPage === 'reactions' || targetPage === 'comments') {
			const sub = targetPage === 'reactions' ? 'behavior-reactions' : (targetPage === 'comments' ? 'behavior-comments' : 'behavior-feed');
			return { folderId: 'behavior', pageId: targetPage ? sub : null };
		}
		if (targetPage === 'dtf') {
			return { folderId: null, pageId: 'notifications' };
		}
		if (targetPage) {
			return { folderId: null, pageId: targetPage };
		}
		// По умолчанию открываем источники
		return { folderId: null, pageId: 'sources' };
	}

	const initial = resolveInitialNav();

	// Текущая открытая папка в сайдбаре (null = главное меню, 'appearance', 'behavior')
	let activeFolderId = $state<string | null>(initial.folderId);
	// Текущая выбранная страница контента справа (null = empty state)
	let selectedPageId = $state<string | null>(initial.pageId);

	// Solo-режим (скрытый сайдбар)
	let soloByUser = $state<boolean>();
	let isSolo = $derived(soloByUser ?? solo);
	let soloBackTarget = $state<{ pageId: string; folderId: string | null; title: string } | null>(null);

	// На узком экране: false — список разделов, true — открытая страница
	let openedByUser = $state<boolean>();
	let opened = $derived(openedByUser ?? (selectedPageId !== null && (!!page || isSolo)));

	let scroller = $state<HTMLElement>();
	let windowEl = $state<HTMLElement>();
	let faded = $state(false);
	let peeking = $state(false);

	// Получение заголовка текущей папки Уровня 2
	let folderTitle = $derived(
		activeFolderId === 'appearance' ? 'Внешний вид' : (activeFolderId === 'behavior' ? 'Поведение' : 'Настройки')
	);

	// Заголовок текущей страницы
	let pageTitle = $derived.by(() => {
		if (!selectedPageId) return folderTitle;
		for (const s of ROOT_NAVIGATION) {
			const found = s.items.find((i) => i.id === selectedPageId);
			if (found) return found.title;
		}
		for (const g of APPEARANCE_SUBNAV) {
			const found = g.items.find((i) => i.id === selectedPageId);
			if (found) return found.title;
		}
		for (const g of BEHAVIOR_SUBNAV) {
			const found = g.items.find((i) => i.id === selectedPageId);
			if (found) return found.title;
		}
		return 'Настройки';
	});

	function resetSolo() {
		soloByUser = false;
		soloBackTarget = null;
	}

	function handleMobileBack() {
		resetSolo();
		openedByUser = false;
	}

	// Клик по элементу Уровня 1
	function handleRootItemClick(item: RootNavItem) {
		resetSolo();
		if (item.type === 'folder') {
			activeFolderId = item.id;
			selectedPageId = null;
			openedByUser = false;
		} else {
			selectedPageId = item.id;
			activeFolderId = null;
			openedByUser = true;
			scroller?.scrollTo({ top: 0 });
		}
	}

	// Клик по сабпункту Уровня 2
	function handleSubItemClick(item: SubNavItem) {
		resetSolo();
		selectedPageId = item.id;
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
	}

	// Возврат из подменю в главное меню сайдбара
	function handleBackToRoot() {
		resetSolo();
		activeFolderId = null;
		selectedPageId = null;
		openedByUser = false;
	}

	// Переход в Чёрный список из Ленты (с активацией Solo)
	function openIgnoredFromFeed() {
		soloBackTarget = {
			folderId: 'behavior',
			pageId: 'behavior-feed',
			title: 'Лента'
		};
		soloByUser = true;
		selectedPageId = 'ignored';
		activeFolderId = null;
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
	}

	// Возврат из Solo-режима
	function handleReturnFromSolo() {
		if (soloBackTarget) {
			activeFolderId = soloBackTarget.folderId;
			selectedPageId = soloBackTarget.pageId;
			soloBackTarget = null;
		}
		soloByUser = false;
		scroller?.scrollTo({ top: 0 });
	}

	function toggleFade() {
		faded = !faded;
		peeking = false;
	}

	function handleEyeEnter(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		if (!faded) peeking = true;
	}

	function handleEyeLeave(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		peeking = false;
	}
</script>

<div
	class="window"
	bind:this={windowEl}
	data-view={opened ? 'page' : 'list'}
	data-solo={isSolo ? 'true' : 'false'}
	data-fade={faded ? 'active' : (peeking ? 'peek' : undefined)}
>
	<div class="panes">
		<!-- Левая колонка (Сайдбар) -->
		<nav class="sidebar" aria-label="Разделы настроек">
			<header class="side-bar">
				{#if activeFolderId}
					<button
						class="icon-button folder-back"
						type="button"
						aria-label="Назад к разделам"
						onclick={handleBackToRoot}
					>
						<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M10 3L5 8l5 5" />
						</svg>
					</button>
				{/if}
				<h2 class="side-title">{folderTitle}</h2>
			</header>

			<div class="nav-container">
				<!-- Уровень 1: Главное меню -->
				<div class={['nav-layer', { 'nav-layer--hidden': activeFolderId !== null }]}>
					<div class="nav">
						{#each ROOT_NAVIGATION as group (group.title)}
							<section class="nav__section">
								<h3 class="nav__group">{group.title}</h3>
								<div class="nav__list">
									{#each group.items as item (item.id)}
										<button
											class={['nav__item', { 'nav__item--active': item.id === selectedPageId && activeFolderId === null }]}
											type="button"
											aria-current={item.id === selectedPageId && activeFolderId === null ? 'page' : undefined}
											onclick={() => handleRootItemClick(item)}
										>
											<SettingsIcon name={item.icon} />
											<span class="nav__title">{item.title}</span>
											{#if item.type === 'folder'}
												<svg class="nav__arrow nav__arrow--folder" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
													<path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
												</svg>
											{/if}
										</button>
									{/each}
								</div>
							</section>
						{/each}
					</div>
				</div>

				<!-- Уровень 2: Подменю выбранной папки -->
				<div class={['nav-layer', { 'nav-layer--hidden': activeFolderId === null }]}>
					<div class="nav">
						{#if activeFolderId === 'appearance'}
							{#each APPEARANCE_SUBNAV as group (group.title)}
								<section class="nav__section">
									<h3 class="nav__group">{group.title}</h3>
									<div class="nav__list">
										{#each group.items as item (item.id)}
											<button
												class={['nav__item', { 'nav__item--active': item.id === selectedPageId }]}
												type="button"
												aria-current={item.id === selectedPageId ? 'page' : undefined}
												onclick={() => handleSubItemClick(item)}
											>
												<SettingsIcon name={item.icon} />
												<span class="nav__title">{item.title}</span>
											</button>
										{/each}
									</div>
								</section>
							{/each}
						{:else if activeFolderId === 'behavior'}
							{#each BEHAVIOR_SUBNAV as group (group.title)}
								<section class="nav__section">
									<h3 class="nav__group">{group.title}</h3>
									<div class="nav__list">
										{#each group.items as item (item.id)}
											<button
												class={['nav__item', { 'nav__item--active': item.id === selectedPageId }]}
												type="button"
												aria-current={item.id === selectedPageId ? 'page' : undefined}
												onclick={() => handleSubItemClick(item)}
											>
												<SettingsIcon name={item.icon} />
												<span class="nav__title">{item.title}</span>
											</button>
										{/each}
									</div>
								</section>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</nav>

		<!-- Правая колонка (Контент) -->
		<main class="content">
			<header class="bar">
				{#if isSolo && soloBackTarget}
					<!-- В соло-режиме с возвратом отображается только одна кнопка и на мобиле, и на десктопе -->
					<button class="solo-back-button" type="button" onclick={handleReturnFromSolo}>
						<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M10 3L5 8l5 5" />
						</svg>
						<span>Назад к: {soloBackTarget.title}</span>
					</button>
				{:else}
					<!-- Кнопка «Назад» для мобильного режима -->
					<button
						class="icon-button back"
						type="button"
						aria-label="Назад к разделам"
						onclick={handleMobileBack}
					>
						<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
							<path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>

					<!-- Кнопка возврата из Solo-режима на десктопе (когда открыли solo снаружи без цели возврата) -->
					{#if isSolo}
						<button class="solo-back-button solo-back-button--menu" type="button" onclick={handleReturnFromSolo}>
							<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M10 3L5 8l5 5" />
							</svg>
							<span>Показать меню</span>
						</button>
					{/if}
				{/if}
			</header>

			<div class="scroller" bind:this={scroller}>
				<div class="page">
					{#if selectedPageId}
						<h2 class="page__title">{pageTitle}</h2>

						{#if selectedPageId === 'account'}
							<AccountSettings />
						{:else if selectedPageId === 'notifications'}
							<NotificationSettings />
						{:else if selectedPageId === 'ignored'}
							<IgnoredSettings />
						{:else if selectedPageId === 'sources'}
							<SourcesSettings />
							<ProxySettings />
						{:else if selectedPageId === 'stats'}
							<StatsSettings />
						{:else if selectedPageId === 'help'}
							<HelpSettings />
						{:else if selectedPageId === 'about'}
							<AboutSettings />

						<!-- Подстраницы «Внешний вид» -->
						{:else if selectedPageId === 'theme-select'}
							<FieldControl
								field={colorSchemeField}
								value={settings.value.colorScheme ?? 'auto'}
								onchange={(value) => settings.patch({ colorScheme: value as ColorScheme })}
							/>
							<FieldControl field={themeField} value={activeTheme.id} onchange={(value) => activeTheme.set(String(value))} />
						{:else if selectedPageId === 'appearance-general'}
							<FieldControl
								field={hapticsField}
								value={settings.value.haptics}
								onchange={(value) => {
									const enabled = Boolean(value);
									settings.patch({ haptics: enabled });
									if (enabled) haptics.click();
								}}
							/>
							<FieldControl
								field={disableMobileTopBarField}
								value={settings.value.disableMobileTopBar}
								onchange={(value) => settings.patch({ disableMobileTopBar: Boolean(value) })}
							/>
							{#each generalThemeFields as field (field.key)}
								{#if isFieldVisible(field, themeValues.value, themeFields)}
									<FieldControl
										{field}
										value={themeValues.value[field.key] ?? field.default}
										onchange={(value) => themeValues.patch({ [field.key]: value })}
									/>
								{/if}
							{/each}
						{:else if selectedPageId === 'appearance-votes'}
							{#if votesThemeFields.length > 0}
								{#each votesThemeFields as field (field.key)}
									{#if isFieldVisible(field, themeValues.value, themeFields)}
										<FieldControl
											{field}
											value={themeValues.value[field.key] ?? field.default}
											onchange={(value) => themeValues.patch({ [field.key]: value })}
										/>
									{/if}
								{/each}
							{:else}
								<p class="section-hint">У выбранной темы нет дополнительных настроек оценок.</p>
							{/if}
						{:else if selectedPageId === 'appearance-editor'}
							{#if editorThemeFields.length > 0}
								{#each editorThemeFields as field (field.key)}
									{#if isFieldVisible(field, themeValues.value, themeFields)}
										<FieldControl
											{field}
											value={themeValues.value[field.key] ?? field.default}
											onchange={(value) => themeValues.patch({ [field.key]: value })}
										/>
									{/if}
								{/each}
							{:else}
								<p class="section-hint">У выбранной темы нет отдельных настроек редактора.</p>
							{/if}

						<!-- Подстраницы «Поведение» -->
						{:else if selectedPageId === 'behavior-feed'}
							<FeedSettings onopenignored={openIgnoredFromFeed} />
						{:else if selectedPageId === 'behavior-reactions'}
							<ReactionsSettings />
						{:else if selectedPageId === 'behavior-comments'}
							<FieldControl
								field={nestingField}
								value={settings.value.commentNesting}
								onchange={(value) => settings.patch({ commentNesting: value as NestingMode })}
							/>
							<FieldControl
								field={virtualizationField}
								value={settings.value.commentVirtualization}
								onchange={(value) => settings.patch({ commentVirtualization: value as CommentVirtualization })}
							/>
						{/if}
					{:else}
						<!-- Ни один подпункт не выбран — минималистичный плейсхолдер -->
						<SettingsEmptyState text="Выберите подраздел в меню слева" />
					{/if}
				</div>
			</div>
		</main>
	</div>

	<!-- Кнопка скрытия окна (fade/peek) -->
	<button
		class={['icon-button', 'peek', { 'peek--active': faded }]}
		type="button"
		aria-label={faded ? 'Показать настройки' : 'Скрыть настройки'}
		aria-pressed={faded}
		onclick={toggleFade}
		onpointerenter={handleEyeEnter}
		onpointerleave={handleEyeLeave}
	>
		<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M1.5 8C3.5 2 12.5 2 14.5 8C12.5 14 3.5 14 1.5 8z" />
			<circle cx="8" cy="8" r="2" />
		</svg>
	</button>

	<!-- Кнопка закрытия окна -->
	<button class="icon-button close" type="button" aria-label="Закрыть настройки" onclick={onclose}>
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
		</svg>
	</button>
</div>

<style>
	/* Окно в духе libadwaita: светлое, карточки приподняты мягкими тенями, отступы широкие */
	.window {
		--st-bg: #fafafb;
		--st-side: #f3f3f5;
		--st-side-border: rgba(0, 0, 6, 0.07);
		--st-header: 48px;
		--st-card: #fff;
		--st-card-shadow-soft: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.05);
		--st-card-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px 1px rgba(0, 0, 0, 0.07), 0 2px 6px 2px rgba(0, 0, 0, 0.03);
		--st-separator: rgba(0, 0, 0, 0.06);
		--st-hover: rgba(0, 0, 0, 0.035);
		--st-button: rgba(0, 0, 0, 0.05);
		--st-button-hover: rgba(0, 0, 0, 0.09);
		--st-field: rgba(0, 0, 0, 0.045);
		--st-track: #d6d6d6;
		--st-text: var(--text-primary, #1e1e1e);
		--st-muted: var(--text-muted, #66646b);
		--st-accent: var(--color-blue, #3584e4);
		--st-danger: #c01c28;
		--st-ok: #1f8a3b;

		position: relative;
		container-type: inline-size;
		width: min(1040px, 100%);
		height: min(720px, calc(100dvh - 72px));
		overflow: hidden;
		border-radius: 18px;
		background: var(--st-bg);
		box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.07), 0 12px 48px rgba(0, 0, 0, 0.2);
		color: var(--st-text);
		font-family: var(--font-family, system-ui, sans-serif);
		font-size: 15px;
		line-height: 22px;
	}

	/* Тёмная тема окна настроек (Libadwaita Dark) */
	:global(html[data-theme-mode='dark']) .window {
		--st-bg: #242424;
		--st-side: #303030;
		--st-side-border: rgba(255, 255, 255, 0.08);
		--st-card: #303030;
		--st-card-shadow-soft: 0 0 0 1px rgba(255, 255, 255, 0.07), 0 1px 2px rgba(0, 0, 0, 0.2);
		--st-card-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07), 0 1px 3px 1px rgba(0, 0, 0, 0.3);
		--st-separator: rgba(255, 255, 255, 0.08);
		--st-hover: rgba(255, 255, 255, 0.06);
		--st-button: rgba(255, 255, 255, 0.08);
		--st-button-hover: rgba(255, 255, 255, 0.12);
		--st-field: rgba(255, 255, 255, 0.06);
		--st-track: #4a4a4d;
		--st-muted: #9a9996;
		--st-text: #ffffff;
		--st-accent: var(--color-blue, #78aeed);
		--st-danger: #e01b24;
		--st-ok: #2ec27e;
		box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.4), 0 12px 48px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--st-text);
	}

	@media (prefers-color-scheme: dark) {
		:global(html:not([data-theme-mode='light'])) .window {
			--st-bg: #242424;
			--st-side: #303030;
			--st-side-border: rgba(255, 255, 255, 0.08);
			--st-card: #303030;
			--st-card-shadow-soft: 0 0 0 1px rgba(255, 255, 255, 0.07), 0 1px 2px rgba(0, 0, 0, 0.2);
			--st-card-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07), 0 1px 3px 1px rgba(0, 0, 0, 0.3);
			--st-separator: rgba(255, 255, 255, 0.08);
			--st-hover: rgba(255, 255, 255, 0.06);
			--st-button: rgba(255, 255, 255, 0.08);
			--st-button-hover: rgba(255, 255, 255, 0.12);
			--st-field: rgba(255, 255, 255, 0.06);
			--st-track: #4a4a4d;
			--st-muted: #9a9996;
		--st-text: #ffffff;
			--st-accent: var(--color-blue, #78aeed);
			--st-danger: #e01b24;
			--st-ok: #2ec27e;
			box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.4), 0 12px 48px rgba(0, 0, 0, 0.6);
			border: 1px solid rgba(255, 255, 255, 0.1);
			color: var(--st-text);
		}
	}

	.panes {
		display: flex;
		height: 100%;
		overflow: hidden;
	}

	/* Боковая панель libadwaita: аккуратная, 260px, спокойный тон */
	.sidebar {
		display: flex;
		flex: none;
		flex-direction: column;
		width: 260px;
		background: var(--st-side);
		box-shadow: inset -1px 0 var(--st-side-border);
		transition:
			margin-left 280ms var(--ease-smooth, cubic-bezier(0.2, 0, 0, 1)),
			opacity 220ms ease,
			transform 280ms var(--ease-smooth, cubic-bezier(0.2, 0, 0, 1));
	}

	/* В режиме Solo сайдбар плавно убирается влево */
	.window[data-solo='true'] .sidebar {
		margin-left: -260px;
		transform: translateX(-100%);
		opacity: 0;
		pointer-events: none;
	}

	/* Шапка сайдбара */
	.side-bar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		height: var(--st-header);
		padding: 0 48px;
	}

	.side-title {
		overflow: hidden;
		font-size: 15px;
		font-weight: 700;
		line-height: 22px;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition: opacity 180ms ease, transform 180ms ease;
	}

	/* Круглая кнопка возврата из подменю в шапке сайдбара */
	.folder-back {
		position: absolute;
		left: 12px;
		width: 32px;
		height: 32px;
		animation: buttonPop 200ms var(--ease-smooth, cubic-bezier(0.2, 0, 0, 1));
	}

	@keyframes buttonPop {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Контейнер слоев навигации */
	.nav-container {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.nav-layer {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		transition:
			opacity 220ms var(--ease-smooth, cubic-bezier(0.2, 0, 0, 1)),
			transform 240ms var(--ease-smooth, cubic-bezier(0.2, 0, 0, 1));
	}

	.nav-layer--hidden {
		opacity: 0;
		transform: translateX(-24px);
		pointer-events: none;
	}

	.nav-layer:nth-child(2).nav-layer--hidden {
		transform: translateX(24px);
	}

	.nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0 6px 14px;
	}

	/* Подписи категорий: спокойные, приглушенные, без капса */
	.nav__group {
		margin: 0;
		padding: 16px 14px 4px;
		color: var(--st-muted);
		font-size: 13px;
		font-weight: 400;
		line-height: 18px;
	}

	.nav__section:first-child .nav__group {
		padding-top: 2px;
	}

	.nav__list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	/* Строка пункта меню: компактная, без тяжелых подложек */
	.nav__item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 38px;
		padding: 0 12px;
		border-radius: 10px;
		color: inherit;
		font-size: 14px;
		text-align: left;
		cursor: pointer;
		transition:
			background-color var(--duration-base),
			box-shadow var(--duration-base);
	}

	.nav__title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nav__item:hover {
		background: color-mix(in srgb, currentColor 6%, transparent);
	}

	.nav__item:active {
		background: color-mix(in srgb, currentColor 14%, transparent);
	}

	/* Активный пункт меню — спокойная Adwaita карточка */
	.nav__item--active,
	.nav__item--active:hover {
		background: var(--st-card);
		box-shadow: var(--st-card-shadow-soft);
		font-weight: 500;
	}

	.nav__item:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: -2px;
	}

	/* Стрелочка папки: деликатная, приглушённая */
	.nav__arrow--folder {
		flex: none;
		color: var(--st-muted);
		opacity: 0.45;
		transition: transform var(--duration-base), opacity var(--duration-base);
	}

	.nav__item:hover .nav__arrow--folder {
		opacity: 0.85;
		transform: translateX(2px);
	}

	/* Контентная панель справа */
	.content {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		background: var(--st-bg);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: none;
		height: var(--st-header);
		padding: 0 20px;
	}

	.solo-back-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 32px;
		padding: 0 12px;
		border-radius: 16px;
		background: var(--st-button);
		color: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.solo-back-button:hover {
		background: var(--st-button-hover);
	}

	.solo-back-button:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}

	.scroller {
		flex: 1;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.page {
		max-width: 680px;
		margin: 0 auto;
		padding: 0 40px 48px;
		animation: pageFadeIn 180ms var(--ease-smooth, cubic-bezier(0.2, 0, 0, 1));
	}

	@keyframes pageFadeIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.page__title {
		margin-bottom: 28px;
		font-size: 34px;
		font-weight: 300;
		line-height: 42px;
	}

	.section-hint {
		margin: 8px 4px 16px;
		color: var(--st-muted);
		font-size: 14px;
	}

	.icon-button {
		display: grid;
		flex: none;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		color: inherit;
		cursor: pointer;
		transition: background-color var(--duration-base), transform var(--duration-base);
	}

	.icon-button:hover {
		background: var(--st-button);
	}

	.icon-button:active {
		transform: scale(0.95);
	}

	.icon-button:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}

	.icon-button.back {
		display: none;
	}

	.close {
		position: absolute;
		top: calc((var(--st-header) - 36px) / 2);
		right: 12px;
	}

	.peek {
		position: absolute;
		top: calc((var(--st-header) - 36px) / 2);
		right: 54px;
		z-index: 2;
		transition:
			background-color var(--duration-base),
			box-shadow var(--duration-base),
			color var(--duration-base);
	}

	.peek--active {
		background: var(--st-card);
		color: var(--st-text);
		box-shadow:
			var(--st-card-shadow);

		pointer-events: auto;
	}

	.peek--active:hover {
		background: var(--st-button-hover);
	}

	.peek--active:active {
		background: var(--st-button);
	}

	/* Широкое окно */
	@container (min-width: 720px) {
		.side-bar {
			justify-content: flex-start;
			padding: 22px 18px 10px;
			height: auto;
		}

		.folder-back {
			position: static;
			margin-right: 8px;
		}

		.side-title {
			font-size: 22px;
			font-weight: 300;
			line-height: 30px;
		}
	}

	/* Узкое окно: двухшаговый режим drill-down */
	@container (max-width: 719px) {
		.panes {
			flex-direction: column;
		}

		.sidebar {
			flex: 1;
			width: auto;
			min-height: 0;
			background: none;
			box-shadow: none;
		}

		.window[data-solo='true'] .sidebar {
			margin-left: 0;
			transform: none;
			opacity: 1;
			pointer-events: auto;
		}

		.nav {
			flex: 1;
			gap: 20px;
			padding: 12px 16px 24px;
		}

		.nav__group,
		.nav__section:first-child .nav__group {
			padding: 0 4px 8px;
		}

		.nav__list {
			display: block;
			overflow: hidden;
			border-radius: 12px;
			background: var(--st-card);
			box-shadow: var(--st-card-shadow-soft);
		}

		.nav__item {
			min-height: 48px;
			padding: 0 16px;
			border-radius: 0;
		}

		.nav__item:not(:first-child) {
			border-top: 1px solid var(--st-separator);
		}

		.nav__arrow--folder {
			display: block;
			opacity: 0.7;
		}

		.nav__item--active,
		.nav__item--active:hover {
			background: none;
			box-shadow: none;
		}

		.icon-button.back {
			display: grid;
			margin-left: -8px;
		}

		.solo-back-button--menu {
			display: none;
		}

		.solo-back-button {
			margin-left: -4px;
		}

		.bar {
			padding: 0 16px;
		}

		.page {
			padding: 0 20px 32px;
		}

		.page__title {
			margin-bottom: 20px;
			font-size: 30px;
			line-height: 38px;
		}

		.window[data-view='list'] .content,
		.window[data-view='page'] .sidebar {
			display: none;
		}
	}

	/* Мобильный экран телефона: на весь экран */
	@media (max-width: 719px) {
		.window {
			position: fixed;
			inset: 0;
			width: auto;
			height: auto;
			padding-top: env(safe-area-inset-top);
			padding-bottom: env(safe-area-inset-bottom);
			border-radius: 0;
			box-shadow: none;
		}

		.close,
		.peek {
			top: calc(env(safe-area-inset-top, 0px) + (var(--st-header) - 36px) / 2);
		}
	}

	/* Ползунок ползунка и эффекты полупрозрачности */
	.panes,
	.close {
		transition: opacity var(--fade);
	}

	.window {
		--fade: 0.45s cubic-bezier(0.2, 0, 0, 1);
		transition:
			background-color var(--fade),
			box-shadow var(--fade);
	}

	.window[data-fade='peek'] {
		background-color: color-mix(in srgb, var(--st-bg) 35%, transparent);
		box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.02), 0 6px 24px rgba(0, 0, 0, 0.06);
	}

	.window[data-fade='peek'] .panes,
	.window[data-fade='peek'] .close {
		opacity: 0.35;
	}

	.window[data-fade='active'] {
		background-color: transparent;
		box-shadow: none;
		pointer-events: none;
	}

	.window[data-fade='active'] .panes,
	.window[data-fade='active'] .close {
		opacity: 0;
		pointer-events: none;
	}

	:global(:is(.window, .window *):has(.slider):not(.group, .group *) > :not(:has(.slider), .slider)) {
		transition: opacity var(--fade);
	}

	.window:global([data-slider-drag]) {
		background-color: transparent;
		box-shadow: none;
	}

	:global(.window[data-slider-drag] .scroller) {
		scrollbar-color: transparent transparent;
	}

	:global(.window[data-slider-drag]:has(.slider) > :not(:has(.slider), .slider), .window[data-slider-drag] :has(.slider):not(.group, .group *) > :not(:has(.slider), .slider)) {
		opacity: 0;
		pointer-events: none;
	}
</style>
