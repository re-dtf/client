<script lang="ts">
	import AccountSettings from './AccountSettings.svelte';
	import DtfSettings from './DtfSettings.svelte';
	import FieldControl from './FieldControl.svelte';
	import ProxySettings from './ProxySettings.svelte';
	import HelpSettings from './HelpSettings.svelte';
	import IgnoredSettings from './IgnoredSettings.svelte';
	import ReactionsSettings from './ReactionsSettings.svelte';
	import SettingsIcon from './SettingsIcon.svelte';
	import StatsSettings from './StatsSettings.svelte';
	import SourcesSettings from '$lib/components/sources/SourcesSettings.svelte';
	import { activeTheme, themes } from '$lib/themes/index.svelte';
	import { getTheme, themeSettingsSchema } from '$lib/themes/registry';
	import { activeThemeSettings } from '$lib/themes/settings.svelte';
	import { settings, DEFAULT_THEME } from '$lib/storage/settings.svelte';
	import type { NestingMode, CommentVirtualization } from '$lib/storage/settings.svelte';
	import type { ChoiceField, ToggleField } from '$lib/themes/types';
	import { haptics } from '$lib/haptics';

	/*
	 * Окно настроек в духе Adwaita: слева разделы, справа выбранная страница.
	 * На узком экране это два шага: список разделов, потом страница с кнопкой «Назад».
	 * Страница «Тема» — настройки выбранной темы (описаны в её theme.ts), у темы без настроек её нет.
	 */
	let { onclose, page }: { onclose: () => void; page?: string } = $props();

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

	let themeFields = $derived(themeSettingsSchema(activeTheme.id));
	let themeValues = $derived(activeThemeSettings());

	let navigation = $derived([
		{
			title: 'Профиль DTF',
			pages: [
				{ id: 'account', title: 'Аккаунт' },
				{ id: 'dtf', title: 'Настройки' },
				{ id: 'ignored', title: 'Чёрный список' }
			]
		},
		{ title: 'Инфраструктура', pages: [{ id: 'sources', title: 'Источники данных' }] },
		{
			title: 'Персонализация',
			pages: [
				{ id: 'themes', title: 'Темы' },
				...(themeFields.length > 0 ? [{ id: 'theme', title: getTheme(activeTheme.id)?.name ?? activeTheme.id }] : []),
				{ id: 'comments', title: 'Комментарии' },
				{ id: 'reactions', title: 'Реакции' }
			]
		},
		{ title: 'Данные', pages: [{ id: 'stats', title: 'Статистика' }] },
		{ title: 'Приложение', pages: [{ id: 'help', title: 'Хочу помочь' }] }
	]);

	// Пока ничего не выбрано, показывается страница `page` (её просит тот, кто открыл настройки), иначе источники
	let selected = $state<string>();
	// На узком экране: false — список разделов, true — открытая страница; без выбора страница открыта, если её запросили
	let openedByUser = $state<boolean>();
	let opened = $derived(openedByUser ?? !!page);
	let scroller = $state<HTMLElement>();

	// Страницы темы может не быть (тему сменили на ту, где настроек нет): тогда первая страница
	let current = $derived(
		navigation.flatMap((g) => g.pages).find((p) => p.id === (selected ?? page ?? 'sources')) ?? navigation[0].pages[0]
	);

	function open(id: string) {
		selected = id;
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
	}
</script>

<div class="window" data-view={opened ? 'page' : 'list'}>
	<div class="panes">
	<nav class="sidebar" aria-label="Разделы настроек">
		<header class="side-bar">
			<h2 class="side-title">Настройки</h2>
		</header>
		<div class="nav">
			{#each navigation as group (group.title)}
				<section class="nav__section">
					<h3 class="nav__group">{group.title}</h3>
					<div class="nav__list">
						{#each group.pages as page (page.id)}
							<button
								class={['nav__item', { 'nav__item--active': page.id === current.id }]}
								type="button"
								aria-current={page.id === current.id ? 'page' : undefined}
								onclick={() => open(page.id)}
							>
								<SettingsIcon name={page.id} />
								<span class="nav__title">{page.title}</span>
								<svg class="nav__arrow" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
									<path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</button>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</nav>

	<main class="content">
		<header class="bar">
			<button class="icon-button back" type="button" aria-label="Назад к разделам" onclick={() => (openedByUser = false)}>
				<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
					<path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		</header>

		<div class="scroller" bind:this={scroller}>
			<div class="page">
				<h2 class="page__title">{current.title}</h2>
				{#if current.id === 'account'}
					<AccountSettings />
				{:else if current.id === 'dtf'}
					<DtfSettings />
				{:else if current.id === 'ignored'}
					<IgnoredSettings />
				{:else if current.id === 'sources'}
					<SourcesSettings />
					<ProxySettings />
				{:else if current.id === 'themes'}
					<FieldControl field={themeField} value={activeTheme.id} onchange={(value) => activeTheme.set(String(value))} />
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
				{:else if current.id === 'theme'}
					{#each themeFields as field (field.key)}
						<FieldControl
							{field}
							value={themeValues.value[field.key] ?? field.default}
							onchange={(value) => themeValues.patch({ [field.key]: value })}
						/>
					{/each}
				{:else if current.id === 'comments'}
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
				{:else if current.id === 'reactions'}
					<ReactionsSettings />
				{:else if current.id === 'stats'}
					<StatsSettings />
				{:else}
					<HelpSettings />
				{/if}
			</div>
		</div>
	</main>
	</div>

	<button class="icon-button close" type="button" aria-label="Закрыть настройки" onclick={onclose}>
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
		</svg>
	</button>
</div>

<style>
	/* Окно в духе libadwaita: светлое, карточки приподняты мягкими тенями, отступы широкие.
	   Акцент, шрифт и цвет текста берутся у темы, если она их задаёт */
	.window {
		--st-bg: #fafafb;
		/* Цвета боковой панели libadwaita (вторая, более светлая панель) */
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
		color: var(--text-primary, #1e1e1e);
		font-family: var(--font-family, system-ui, sans-serif);
		font-size: 15px;
		line-height: 22px;
	}

	.panes {
		display: flex;
		height: 100%;
	}

	/* Боковая панель libadwaita (AdwNavigationSplitView): тонированный фон, линия справа, плоский список с плашкой у выбранного */
	.sidebar {
		display: flex;
		flex: none;
		flex-direction: column;
		width: 260px;
		background: var(--st-side);
		box-shadow: inset -1px 0 var(--st-side-border);
	}

	/* Шапка как у окна GNOME: название по центру жирным. Высота общая с .bar справа */
	.side-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		height: var(--st-header);
		padding: 0 52px;
	}

	.side-title {
		overflow: hidden;
		font-size: 15px;
		font-weight: 700;
		line-height: 22px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.content {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		/* В колонке без этого страница растёт по содержимому и внутренний скролл не включается */
		min-height: 0;
	}

	/* Над страницей только кнопки «Назад» и «Закрыть», заголовок живёт в самой странице */
	.bar {
		display: flex;
		align-items: center;
		flex: none;
		height: var(--st-header);
		padding: 0 20px;
	}

	.nav {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0 6px 12px;
	}

	/* Заголовок раздела: как подписи групп справа, приглушённый */
	.nav__group {
		margin: 0;
		padding: 18px 14px 6px;
		color: var(--st-muted);
		font-size: 13px;
		font-weight: 400;
		line-height: 18px;
	}

	.nav__section:first-child .nav__group {
		padding-top: 4px;
	}

	.nav__list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	/* Строка navigation-sidebar (значок и текст через 12px) со скруглением карточек правой части */
	.nav__item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 40px;
		padding: 0 14px;
		border-radius: 12px;
		color: inherit;
		font-size: 15px;
		text-align: left;
		cursor: pointer;
		transition:
			background-color var(--duration-base),
			box-shadow var(--duration-base);
	}

	.nav__title {
		flex: 1;
		min-width: 0;
	}

	.nav__item:hover {
		background: color-mix(in srgb, currentColor 7%, transparent);
	}

	.nav__item:active {
		background: color-mix(in srgb, currentColor 16%, transparent);
	}

	/* Выбранный раздел — белая карточка на мягкой тени, как карточки справа */
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

	/* Стрелка и кнопка «Назад» нужны только в узком режиме */
	.nav__arrow,
	.icon-button.back {
		display: none;
	}

	.scroller {
		flex: 1;
		overflow-y: auto;
		/* Дошли до края страницы — фон под окном не прокручивается */
		overscroll-behavior: contain;
	}

	.page {
		max-width: 680px;
		margin: 0 auto;
		padding: 0 40px 48px;
	}

	.page__title {
		margin-bottom: 28px;
		font-size: 34px;
		font-weight: 300;
		line-height: 42px;
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
		transition: background-color var(--duration-base);
	}

	.icon-button:hover {
		background: var(--st-button);
	}

	.icon-button:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}

	.close {
		position: absolute;
		top: calc((var(--st-header) - 36px) / 2);
		right: 12px;
	}

	/* Широкое окно: заголовок панели слева, как подписи групп справа, с запасом воздуха вокруг */
	@container (min-width: 720px) {
		.side-bar {
			justify-content: flex-start;
			padding: 22px 20px 10px;
			height: auto;
		}

		.side-title {
			font-size: 22px;
			font-weight: 300;
			line-height: 30px;
		}
	}

	/* Ширина самого окна, а не экрана: окно может быть уже экрана */
	@container (max-width: 719px) {
		.panes {
			flex-direction: column;
		}

		/* Узкий список — страница, как в AdwSidebar в режиме page: разделы в белых группах (boxed list) со стрелками */
		.sidebar {
			flex: 1;
			width: auto;
			min-height: 0;
			background: none;
			box-shadow: none;
		}

		.nav {
			flex: 1;
			gap: 24px;
			padding: 12px 20px 24px;
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
			min-height: 50px;
			padding: 0 16px;
			border-radius: 0;
		}

		.nav__item:not(:first-child) {
			border-top: 1px solid var(--st-separator);
		}

		.nav__arrow {
			display: block;
			flex: none;
			color: var(--st-muted);
		}

		/* В списке разделов выбранного нет: страница открывается отдельно */
		.nav__item--active,
		.nav__item--active:hover {
			background: none;
			box-shadow: none;
			font-weight: 400;
		}

		.icon-button.back {
			display: grid;
			margin-left: -8px;
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

	/* Телефон: окно поверх ленты занимает весь экран */
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
	}

	/* Пока зажат ползунок (SettingsSlider), окно растворяется: фон окна гаснет (затемнение подложки убирает ModalShell),
	   всё вокруг группы с ползунком скрывается, сама группа остаётся целой. Скрываются только соседи на пути к группе:
	   у вложенных элементов прозрачность иначе перемножалась бы */
	.window {
		--fade: 0.45s cubic-bezier(0.2, 0, 0, 1);
		transition:
			background-color var(--fade),
			box-shadow var(--fade);
	}

	:global(:is(.window, .window *):has(.slider):not(.group, .group *) > :not(:has(.slider), .slider)) {
		transition: opacity var(--fade);
	}

	.window:global([data-slider-drag]) {
		background-color: transparent;
		box-shadow: none;
	}

	/* Полоса прокрутки страницы лежит на пути к ползунку, поэтому не гаснет сама: прячем её цветом, ширина не меняется */
	:global(.window[data-slider-drag] .scroller) {
		scrollbar-color: transparent transparent;
	}

	:global(.window[data-slider-drag]:has(.slider) > :not(:has(.slider), .slider), .window[data-slider-drag] :has(.slider):not(.group, .group *) > :not(:has(.slider), .slider)) {
		opacity: 0;
		pointer-events: none;
	}
</style>
