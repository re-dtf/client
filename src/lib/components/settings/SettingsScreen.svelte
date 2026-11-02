<script lang="ts">
	import FieldControl from './FieldControl.svelte';
	import ProxySettings from './ProxySettings.svelte';
	import HelpSettings from './HelpSettings.svelte';
	import StatsSettings from './StatsSettings.svelte';
	import SourcesSettings from '$lib/components/sources/SourcesSettings.svelte';
	import { activeTheme, themes } from '$lib/themes/index.svelte';
	import { getTheme, themeSettingsSchema } from '$lib/themes/registry';
	import { activeThemeSettings } from '$lib/themes/settings.svelte';
	import { settings, DEFAULT_THEME } from '$lib/storage/settings.svelte';
	import type { NestingMode } from '$lib/storage/settings.svelte';
	import type { ChoiceField } from '$lib/themes/types';

	/*
	 * Окно настроек в духе Adwaita: слева разделы, справа выбранная страница.
	 * На узком экране это два шага: список разделов, потом страница с кнопкой «Назад».
	 * Страница «Тема» — настройки выбранной темы (описаны в её theme.ts), у темы без настроек её нет.
	 */
	let { onclose }: { onclose?: () => void } = $props();

	const themeField: ChoiceField = {
		key: 'theme',
		type: 'radio',
		title: 'Выбор темы',
		default: DEFAULT_THEME,
		options: themes.map((theme) => ({ value: theme.id, title: theme.name, description: theme.description }))
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

	let themeFields = $derived(themeSettingsSchema(activeTheme.id));
	let themeValues = $derived(activeThemeSettings());

	let navigation = $derived([
		{ title: 'Инфраструктура', pages: [{ id: 'sources', title: 'Источники данных' }] },
		{
			title: 'Персонализация',
			pages: [
				{ id: 'themes', title: 'Темы' },
				...(themeFields.length > 0 ? [{ id: 'theme', title: getTheme(activeTheme.id)?.name ?? activeTheme.id }] : []),
				{ id: 'comments', title: 'Комментарии' }
			]
		},
		{ title: 'Данные', pages: [{ id: 'stats', title: 'Статистика' }] },
		{ title: 'Приложение', pages: [{ id: 'help', title: 'Хочу помочь' }] }
	]);

	let selected = $state('sources');
	// На узком экране: false — список разделов, true — открытая страница
	let opened = $state(false);
	let scroller = $state<HTMLElement>();

	// Страницы темы может не быть (тему сменили на ту, где настроек нет): тогда первая страница
	let current = $derived(navigation.flatMap((g) => g.pages).find((p) => p.id === selected) ?? navigation[0].pages[0]);

	function open(id: string) {
		selected = id;
		opened = true;
		scroller?.scrollTo({ top: 0 });
	}
</script>

<div class="window" data-view={opened ? 'page' : 'list'} data-modal={onclose ? '' : undefined}>
	<div class="panes">
	<nav class="sidebar" aria-label="Разделы настроек">
		<h2 class="side-title">Настройки</h2>
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
								{page.title}
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
			<button class="icon-button back" type="button" aria-label="Назад к разделам" onclick={() => (opened = false)}>
				<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
					<path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		</header>

		<div class="scroller" bind:this={scroller}>
			<div class="page">
				<h2 class="page__title">{current.title}</h2>
				{#if current.id === 'sources'}
					<SourcesSettings />
					<ProxySettings />
				{:else if current.id === 'themes'}
					<FieldControl field={themeField} value={activeTheme.id} onchange={(value) => activeTheme.set(String(value))} />
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
				{:else if current.id === 'stats'}
					<StatsSettings />
				{:else}
					<HelpSettings />
				{/if}
			</div>
		</div>
	</main>
	</div>

	{#if onclose}
		<button class="icon-button close" type="button" aria-label="Закрыть настройки" onclick={onclose}>
			<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
				<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			</svg>
		</button>
	{/if}
</div>

<style>
	/* Окно в духе libadwaita: светлое, карточки приподняты мягкими тенями, отступы широкие.
	   Акцент, шрифт и цвет текста берутся у темы, если она их задаёт */
	.window {
		--st-bg: #fafafa;
		--st-side: #f1f1f1;
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

	.sidebar {
		display: flex;
		flex: none;
		flex-direction: column;
		width: 300px;
		background: var(--st-side);
	}

	.side-title {
		padding: 28px 24px 20px;
		font-size: 26px;
		font-weight: 300;
		line-height: 34px;
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
		height: 56px;
		padding: 0 20px;
	}

	.nav {
		display: flex;
		flex-direction: column;
		gap: 24px;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 4px 20px 24px;
	}

	.nav__group {
		margin: 0 4px 8px;
		color: var(--st-muted);
		font-size: 13px;
		font-weight: 500;
		line-height: 18px;
	}

	.nav__list {
		overflow: hidden;
		border-radius: 14px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow-soft);
	}

	.nav__item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		min-height: 48px;
		padding: 0 18px;
		color: inherit;
		font-size: 15px;
		text-align: left;
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.nav__item:not(:first-child) {
		border-top: 1px solid var(--st-separator);
	}

	.nav__item:hover {
		background: var(--st-hover);
	}

	.nav__item--active,
	.nav__item--active:hover {
		background: color-mix(in srgb, var(--st-accent) 12%, transparent);
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
		top: 14px;
		right: 18px;
	}

	/* Ширина самого окна, а не экрана: на странице /settings оно живёт в колонке темы */
	@container (max-width: 719px) {
		.panes {
			flex-direction: column;
		}

		.sidebar {
			flex: 1;
			width: auto;
			min-height: 0;
		}

		.side-title {
			padding: 24px 24px 12px;
		}

		.nav {
			flex: 1;
			padding-top: 0;
		}

		.nav__arrow {
			display: block;
			color: var(--st-muted);
		}

		/* В списке разделов выбранного нет: страница открывается отдельно */
		.nav__item--active,
		.nav__item--active:hover {
			background: none;
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

	/* Телефон: окно поверх ленты занимает весь экран. Отдельная страница /settings остаётся в колонке темы */
	@media (max-width: 719px) {
		.window[data-modal] {
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
</style>
