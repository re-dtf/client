<script lang="ts">
	import AboutSettings from './AboutSettings.svelte';
	import AccountSettings from './AccountSettings.svelte';
	import AppIconSettings from './AppIconSettings.svelte';
	import DebugSettings from './DebugSettings.svelte';
	import FeedSettings from './FeedSettings.svelte';
	import FieldControl from './FieldControl.svelte';
	import HelpSettings from './HelpSettings.svelte';
	import IgnoredSettings from './IgnoredSettings.svelte';
	import NotificationSettings from './NotificationSettings.svelte';
	import ProxySettings from './ProxySettings.svelte';
	import ReactionsSettings from './ReactionsSettings.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsEmptyState from './SettingsEmptyState.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsIcon from './SettingsIcon.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import StatsSettings from './StatsSettings.svelte';
	import SupportersSettings from './SupportersSettings.svelte';
	import SourcesSettings from '$lib/components/sources/SourcesSettings.svelte';
	import { activeTheme, themes } from '$lib/themes/index.svelte';
	import { getTheme, themeSettingsSchema } from '$lib/themes/registry';
	import { activeThemeSettings } from '$lib/themes/settings.svelte';
	import { settings, DEFAULT_THEME } from '$lib/storage/settings.svelte';
	import { reactionSettings } from '$lib/storage/reactions.svelte';
	import type { NestingMode, CommentVirtualization, RecommendationsMode, ClientBadgesMode, MobileBadgesPosition } from '$lib/storage/settings.svelte';
	import { isFieldVisible, getCurrentDevice, MOBILE_BREAKPOINT } from '$lib/themes/types';
	import type { ChoiceField, SettingField, ToggleField, SettingDevice } from '$lib/themes/types';
	import { paletteSelection } from '$lib/themes/palette';
	import { haptics } from '$lib/haptics';
	import { pushSubstate, popSubstate } from '$lib/navigation';
	import { dev } from '$app/env';

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
		solo = false,
		device
	}: {
		onclose: () => void;
		page?: string;
		section?: string;
		solo?: boolean;
		device?: SettingDevice;
	} = $props();

	let detectedDevice = $state<SettingDevice>(getCurrentDevice());

	$effect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
		const update = () => {
			detectedDevice = mql.matches ? 'mobile' : 'desktop';
		};
		update();
		mql.addEventListener('change', update);
		return () => mql.removeEventListener('change', update);
	});

	let currentDevice = $derived(device ?? detectedDevice);

	// --- Описания общих полей настроек ---
	let paletteField = $derived<ChoiceField>({
		key: 'palette',
		type: 'radio',
		title: 'Цветовая палитра',
		default: 'auto',
		options: [
			{ value: 'auto', title: 'Системная', description: 'Следовать настройкам системы' },
			...activeTheme.palettes.options.map(palette => ({ value: palette.id, title: palette.title }))
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
		default: false,
		device: 'mobile'
	};

	const watermarkField: ToggleField = {
		key: 'watermark',
		type: 'toggle',
		title: 'Невидимая подпись reDTF',
		description: 'Добавляет скрытую метку к отправляемым комментариям, чтобы другие пользователи reDTF видели, что комментарий написан через этот клиент.',
		default: true
	};

	function defaultTransparency(): boolean {
		if (typeof window === 'undefined') return true;
		return !window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
	}

	const defaultTransparencyField: ToggleField = {
		key: 'transparencyEffects',
		type: 'toggle',
		title: 'Продвинутые эффекты прозрачности и размытия',
		description: 'Размытие при переходах и предпросмотр медиа. Без них анимации быстрее и легче.',
		default: defaultTransparency()
	};

	const rankField: ToggleField = {
		key: 'rank',
		type: 'toggle',
		title: 'Сортировать по моему рейтингу',
		description:
			'«Популярное» и «Лучшие» упорядочиваются по очкам из настроек реакций, а не по очкам DTF. Прежние посты и комментарии на месте не прыгают.',
		default: true
	};

	const recommendationsField: ChoiceField = {
		key: 'recommendations',
		type: 'radio',
		title: 'Рекомендации под постом',
		description: 'Как загружать ленту рекомендаций после комментариев.',
		default: 'auto',
		options: [
			{ value: 'auto', title: 'Сразу', description: 'Подгружаются, когда долистали до конца комментариев' },
			{ value: 'button', title: 'По кнопке', description: 'Под комментариями кнопка «Показать рекомендации»' }
		]
	};

	const autoUpvoteCommentsField: ToggleField = {
		key: 'autoUpvoteComments',
		type: 'toggle',
		title: 'Голос за себя при публикации',
		description: 'Автоматически ставить плюс своему комментарию сразу после публикации, как на Reddit.',
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

	const clientBadgesField: ChoiceField = {
		key: 'clientBadges',
		type: 'radio',
		title: 'Бейджи клиентов',
		description: 'Отображение меток приложений и клиентов у комментариев.',
		default: 'redtf_only',
		options: [
			{ value: 'redtf_only', title: 'Только re: (по умолчанию)', description: 'Показывать только метку reDTF' },
			{ value: 'all', title: 'Все бейджи', description: 'Показывать re: и метки официальных приложений (Android / iOS)' },
			{ value: 'none', title: 'Отключено', description: 'Скрыть все бейджи клиентов' }
		]
	};

	const mobileBadgesPositionField: ChoiceField = {
		key: 'mobileBadgesPosition',
		type: 'radio',
		title: 'Расположение бейджей ОС',
		description: 'Где показывать значки официальных приложений Android и iOS. Метка re: всегда остаётся у имени автора.',
		default: 'author',
		options: [
			{ value: 'author', title: 'Возле ника (по умолчанию)', description: 'В строке автора рядом с именем' },
			{ value: 'date', title: 'Возле времени отправления', description: 'Компактная мини-иконка рядом со временем комментария' }
		]
	};

	// --- Настройки темы ---
	let themeFields = $derived(themeSettingsSchema(activeTheme.id));
	let themeValues = $derived(activeThemeSettings());

	// Группировка динамических полей темы по разделам интерфейса и приложения
	const TOP_BAR_KEYS = new Set(['headerBlur', 'avatarOpensMenu', 'createButtonPos', 'searchBarMode']);
	const MOBILE_BAR_KEYS = new Set(['mobileBarBlur', 'mobileBarFloating']);
	const CONTENT_KEYS = new Set(['contentWidth']);
	const VOTE_KEYS = new Set(['votes', 'arrowsSide', 'arrowsOrder']);
	const EDITOR_KEYS = new Set(['editorFullscreen']);
	const APP_KEYS = new Set(['transparencyEffects']);

	let topBarThemeFields = $derived(themeFields.filter((f) => TOP_BAR_KEYS.has(f.key)));
	let mobileBarThemeFields = $derived(themeFields.filter((f) => MOBILE_BAR_KEYS.has(f.key)));
	let contentThemeFields = $derived(themeFields.filter((f) => CONTENT_KEYS.has(f.key)));
	let votesThemeFields = $derived(themeFields.filter((f) => VOTE_KEYS.has(f.key)));
	let editorThemeFields = $derived(themeFields.filter((f) => EDITOR_KEYS.has(f.key)));
	let otherThemeFields = $derived(
		themeFields.filter(
			(f) =>
				!TOP_BAR_KEYS.has(f.key) &&
				!MOBILE_BAR_KEYS.has(f.key) &&
				!CONTENT_KEYS.has(f.key) &&
				!VOTE_KEYS.has(f.key) &&
				!EDITOR_KEYS.has(f.key) &&
				!APP_KEYS.has(f.key)
		)
	);

	let transparencyField = $derived(
		themeFields.find((f) => f.key === 'transparencyEffects') ?? defaultTransparencyField
	);

	let visibleTopBarFields = $derived(topBarThemeFields.filter((f) => isFieldVisible(f, themeValues.value, themeFields, currentDevice)));
	let visibleMobileBarFields = $derived(mobileBarThemeFields.filter((f) => isFieldVisible(f, themeValues.value, themeFields, currentDevice)));
	let visibleContentFields = $derived(contentThemeFields.filter((f) => isFieldVisible(f, themeValues.value, themeFields, currentDevice)));
	let visibleVotesFields = $derived(votesThemeFields.filter((f) => isFieldVisible(f, themeValues.value, themeFields, currentDevice)));
	let visibleEditorFields = $derived(editorThemeFields.filter((f) => isFieldVisible(f, themeValues.value, themeFields, currentDevice)));
	let visibleOtherFields = $derived(otherThemeFields.filter((f) => isFieldVisible(f, themeValues.value, themeFields, currentDevice)));

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

	const BASE_ROOT_NAVIGATION: RootNavSection[] = [
		{
			title: 'Аккаунт',
			items: [
				{ id: 'account', type: 'page', title: 'Профиль', icon: 'profile' },
				{ id: 'notifications', type: 'page', title: 'Уведомления', icon: 'notifications' },
				{ id: 'ignored', type: 'page', title: 'Чёрный список', icon: 'ignored' },
				{ id: 'feed', type: 'page', title: 'Моя лента', icon: 'feed' }
			]
		},
		{
			title: 'Персонализация',
			items: [
				{ id: 'theme-select', type: 'page', title: 'Выбор темы', icon: 'theme-select' },
				{ id: 'interface', type: 'folder', title: 'Интерфейс', icon: 'interface' },
				{ id: 'reactions', type: 'page', title: 'Реестр реакций', icon: 'reactions' },
				{ id: 'app', type: 'page', title: 'Приложение', icon: 'app' }
			]
		},
		{
			title: 'Сеть',
			items: [
				{ id: 'sources', type: 'page', title: 'Источники данных', icon: 'sources' },
				{ id: 'network', type: 'page', title: 'Сеть и прокси', icon: 'network' }
			]
		},
		{
			title: 'Данные',
			items: [
				{ id: 'stats', type: 'page', title: 'Моя статистика', icon: 'stats' }
			]
		},
		{
			title: 'О проекте',
			items: [
				{ id: 'help', type: 'page', title: 'Хочу помочь', icon: 'help' },
				{ id: 'supporters', type: 'page', title: 'Поддержавшие проект', icon: 'supporters' },
				{ id: 'about', type: 'page', title: 'О приложении', icon: 'about' }
			]
		}
	];

	const isDevVisible = $derived(dev || Boolean(settings.value.devMode));

	const rootNavigation = $derived<RootNavSection[]>(
		isDevVisible
			? [
					...BASE_ROOT_NAVIGATION,
					{
						title: 'Разработка',
						items: [
							{ id: 'debug', type: 'page', title: 'Дебаг', icon: 'debug' }
						]
					}
			  ]
			: BASE_ROOT_NAVIGATION
	);

	// --- Структура навигации Уровня 2 ---
	interface SubNavItem {
		id: string;
		title: string;
		icon: string;
		device?: SettingDevice;
	}

	interface SubNavGroup {
		title: string;
		items: SubNavItem[];
	}

	const INTERFACE_SUBNAV: SubNavGroup[] = [
		{
			title: 'Интерфейс',
			items: [
				{ id: 'interface-top-bar', title: 'Верхняя панель', icon: 'top-bar', device: 'desktop' },
				{ id: 'interface-mobile-bar', title: 'Мобильная панель', icon: 'mobile-bar', device: 'mobile' },
				{ id: 'interface-content', title: 'Лента и контент', icon: 'content' },
				{ id: 'interface-votes', title: 'Оценки', icon: 'votes' },
				{ id: 'interface-comments', title: 'Комментарии', icon: 'comments' },
				{ id: 'interface-editor', title: 'Редактор', icon: 'editor' }
			]
		}
	];

	// --- Преобразование старых / прямых id страниц ---
	function resolveInitialNav(): { folderId: string | null; pageId: string | null; section: string | undefined } {
		const targetPage = page;
		const targetSection = section;

		if (targetPage === 'themes' || targetPage === 'theme-select' || targetPage === 'theme') {
			return { folderId: null, pageId: 'theme-select', section: targetSection };
		}
		if (targetPage === 'interface-top-bar' || targetPage === 'top-bar') {
			return { folderId: 'interface', pageId: 'interface-top-bar', section: targetSection };
		}
		if (targetPage === 'interface-mobile-bar' || targetPage === 'mobile-bar') {
			return { folderId: 'interface', pageId: 'interface-mobile-bar', section: targetSection };
		}
		if (targetPage === 'interface-content' || targetPage === 'content' || targetPage === 'appearance-general') {
			return { folderId: 'interface', pageId: 'interface-content', section: targetSection };
		}
		if (targetPage === 'interface-votes' || targetPage === 'votes' || targetPage === 'appearance-votes') {
			return { folderId: 'interface', pageId: 'interface-votes', section: targetSection };
		}
		if (targetPage === 'interface-comments' || targetPage === 'comments' || targetPage === 'behavior-comments') {
			return { folderId: 'interface', pageId: 'interface-comments', section: targetSection };
		}
		if (targetPage === 'interface-editor' || targetPage === 'editor' || targetPage === 'appearance-editor') {
			return { folderId: 'interface', pageId: 'interface-editor', section: targetSection };
		}
		if (targetPage === 'reactions' || targetPage === 'behavior-reactions') {
			return { folderId: null, pageId: 'reactions', section: targetSection };
		}
		if (targetPage === 'app') {
			return { folderId: null, pageId: 'app', section: targetSection };
		}
		if (targetPage === 'app-icon' || targetPage === 'icons' || targetPage === 'appearance-icons') {
			return { folderId: null, pageId: 'app-icon', section: targetSection };
		}
		if (targetPage === 'feed' || targetPage === 'my-feed' || targetPage === 'behavior-feed') {
			return { folderId: null, pageId: 'feed', section: targetSection };
		}
		if (targetPage === 'dtf') {
			return { folderId: null, pageId: 'notifications', section: targetSection };
		}
		if (targetPage === 'legal' || targetPage === 'documents') {
			return { folderId: null, pageId: 'about', section: 'documents' };
		}
		if (targetPage === 'proxy') {
			return { folderId: null, pageId: 'network', section: targetSection };
		}
		if (targetPage === 'supporters' || targetPage === 'donations' || targetPage === 'backers') {
			return { folderId: null, pageId: 'supporters', section: targetSection };
		}
		if (targetPage === 'debug' && !isDevVisible) {
			return { folderId: null, pageId: null, section: targetSection };
		}
		if (targetPage) {
			return { folderId: null, pageId: targetPage, section: targetSection };
		}
		if (targetSection === 'interface' || targetSection === 'appearance' || targetSection === 'behavior') {
			return { folderId: 'interface', pageId: null, section: targetSection };
		}
		// По умолчанию ничего не выбрано (открываем пустыми)
		return { folderId: null, pageId: null, section: targetSection };
	}

	const initial = resolveInitialNav();

	// Текущая открытая папка в сайдбаре (null = главное меню, 'interface')
	let activeFolderId = $state<string | null>(initial.folderId);
	// Текущая выбранная страница контента справа (null = empty state)
	let selectedPageId = $state<string | null>(initial.pageId);
	let activeSection = $state<string | undefined>(initial.section);

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
		activeFolderId === 'interface' ? 'Интерфейс' : 'Настройки'
	);

	// Заголовок текущей страницы
	let pageTitle = $derived.by(() => {
		if (!selectedPageId) return folderTitle;
		for (const s of rootNavigation) {
			const found = s.items.find((i) => i.id === selectedPageId);
			if (found) return found.title;
		}
		for (const g of INTERFACE_SUBNAV) {
			const found = g.items.find((i) => i.id === selectedPageId);
			if (found) return found.title;
		}
		if (selectedPageId === 'app-icon') return 'Иконка приложения';
		return 'Настройки';
	});

	function resetSolo() {
		soloByUser = false;
		soloBackTarget = null;
	}

	function performMobileBack() {
		resetSolo();
		openedByUser = false;
	}

	function handleMobileBack() {
		if (!popSubstate()) {
			performMobileBack();
		}
	}

	// Клик по элементу Уровня 1
	function handleRootItemClick(item: RootNavItem) {
		activeSection = undefined;
		resetSolo();
		if (item.type === 'folder') {
			activeFolderId = item.id;
			selectedPageId = null;
			openedByUser = false;
			pushSubstate(performBackToRoot);
		} else {
			selectedPageId = item.id;
			activeFolderId = null;
			openedByUser = true;
			scroller?.scrollTo({ top: 0 });
			if (currentDevice === 'mobile') {
				pushSubstate(performMobileBack);
			}
		}
	}

	// Клик по сабпункту Уровня 2
	function handleSubItemClick(item: SubNavItem) {
		activeSection = undefined;
		resetSolo();
		selectedPageId = item.id;
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
		if (currentDevice === 'mobile') {
			pushSubstate(performMobileBack);
		}
	}

	function performBackToRoot() {
		resetSolo();
		activeFolderId = null;
		selectedPageId = null;
		openedByUser = false;
	}

	// Возврат из подменю в главное меню сайдбара
	function handleBackToRoot() {
		if (!popSubstate()) {
			performBackToRoot();
		}
	}

	// Переход в Чёрный список из Ленты и контента (с активацией Solo)
	function openIgnoredFromContent() {
		soloBackTarget = {
			folderId: 'interface',
			pageId: 'interface-content',
			title: 'Лента и контент'
		};
		soloByUser = true;
		selectedPageId = 'ignored';
		activeFolderId = null;
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
		pushSubstate(performReturnFromSolo);
	}

	// Переход в Реестр реакций из Оценок (с активацией Solo)
	function openReactionsFromVotes() {
		soloBackTarget = {
			folderId: 'interface',
			pageId: 'interface-votes',
			title: 'Оценки'
		};
		soloByUser = true;
		selectedPageId = 'reactions';
		activeFolderId = null;
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
		pushSubstate(performReturnFromSolo);
	}

	// Переход в Приложение из Комментариев для настройки подписи (с активацией Solo)
	function openAppFromComments() {
		soloBackTarget = {
			folderId: 'interface',
			pageId: 'interface-comments',
			title: 'Комментарии'
		};
		soloByUser = true;
		selectedPageId = 'app';
		activeFolderId = null;
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
		pushSubstate(performReturnFromSolo);
	}

	// Переход в Иконку приложения из раздела Приложение (с активацией Solo)
	function openAppIconSolo() {
		soloBackTarget = {
			folderId: null,
			pageId: 'app',
			title: 'Приложение'
		};
		soloByUser = true;
		selectedPageId = 'app-icon';
		activeFolderId = null;
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
		pushSubstate(performReturnFromSolo);
	}

	// Переход в Ленту и контент из раздела Моя лента (с активацией Solo)
	function openContentFromFeed() {
		soloBackTarget = {
			folderId: null,
			pageId: 'feed',
			title: 'Моя лента'
		};
		soloByUser = true;
		selectedPageId = 'interface-content';
		activeFolderId = 'interface';
		openedByUser = true;
		scroller?.scrollTo({ top: 0 });
		pushSubstate(performReturnFromSolo);
	}

	function performReturnFromSolo() {
		if (soloBackTarget) {
			activeFolderId = soloBackTarget.folderId;
			selectedPageId = soloBackTarget.pageId;
			openedByUser = true;
			soloBackTarget = null;
		}
		soloByUser = false;
		scroller?.scrollTo({ top: 0 });
	}

	// Возврат из Solo-режима
	function handleReturnFromSolo() {
		if (!popSubstate()) {
			performReturnFromSolo();
		}
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
				<h2 class="side-title">{folderTitle}</h2>
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
			</header>

			<div class="nav-container">
				<!-- Уровень 1: Главное меню -->
				<div class={['nav-layer', { 'nav-layer--hidden': activeFolderId !== null }]}>
					<div class="nav">
						{#each rootNavigation as group (group.title)}
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
						{#if activeFolderId === 'interface'}
							{#each INTERFACE_SUBNAV as group (group.title)}
								<section class="nav__section">
									<h3 class="nav__group">{group.title}</h3>
									<div class="nav__list">
										{#each group.items as item (item.id)}
											{#if !item.device || item.device === currentDevice}
												<button
													class={['nav__item', { 'nav__item--active': item.id === selectedPageId }]}
													type="button"
													aria-current={item.id === selectedPageId ? 'page' : undefined}
													onclick={() => handleSubItemClick(item)}
												>
													<SettingsIcon name={item.icon} />
													<span class="nav__title">{item.title}</span>
												</button>
											{/if}
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
				{#if selectedPageId}
					<div class="page">
						<h2 class="page__title">{pageTitle}</h2>

						{#if selectedPageId === 'account'}
							<AccountSettings />
						{:else if selectedPageId === 'notifications'}
							<NotificationSettings />
						{:else if selectedPageId === 'ignored'}
							<IgnoredSettings />
						{:else if selectedPageId === 'feed'}
							<FeedSettings onopencontent={openContentFromFeed} />
						{:else if selectedPageId === 'sources'}
							<SourcesSettings />
						{:else if selectedPageId === 'network'}
							<ProxySettings />
						{:else if selectedPageId === 'stats'}
							<StatsSettings />
						{:else if selectedPageId === 'help'}
							<HelpSettings onopensupporters={() => { selectedPageId = 'supporters'; scroller?.scrollTo({ top: 0 }); }} />
						{:else if selectedPageId === 'supporters'}
							<SupportersSettings />
						{:else if selectedPageId === 'about'}
							<AboutSettings section={activeSection} />
						{:else if selectedPageId === 'debug' && isDevVisible}
							<DebugSettings ondisable={() => { selectedPageId = null; handleMobileBack(); }} />

						<!-- Персонализация: Прямые страницы -->
						{:else if selectedPageId === 'theme-select'}
							<FieldControl field={themeField} value={activeTheme.id} onchange={(value) => activeTheme.set(String(value))} />
							<FieldControl
								field={paletteField}
								value={paletteSelection(activeTheme.palettes, activeThemeSettings().value.palette)}
								onchange={(value) => activeThemeSettings().patch({ palette: String(value) })}
							/>
						{:else if selectedPageId === 'reactions'}
							<ReactionsSettings />
						{:else if selectedPageId === 'app'}
							<div class="settings-cards">
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
									field={transparencyField}
									value={themeValues.value.transparencyEffects ?? transparencyField.default}
									onchange={(value) => themeValues.patch({ transparencyEffects: Boolean(value) })}
								/>
								<FieldControl
									field={watermarkField}
									value={settings.value.watermark}
									onchange={(value) => settings.patch({ watermark: Boolean(value) })}
								/>
							</div>
							<SettingsGroup title="Внешний вид приложения">
								<SettingsRow
									title="Иконка приложения"
									subtitle="Выбор значка приложения и вкладки браузера, или загрузка своей иконки"
								>
									<SettingsButton variant="suggested" onclick={openAppIconSolo}>
										<span class="btn-text">
											Выбрать
											<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d="M6 3l5 5-5 5" />
											</svg>
										</span>
									</SettingsButton>
								</SettingsRow>
							</SettingsGroup>
						{:else if selectedPageId === 'app-icon'}
							<AppIconSettings />

						<!-- Интерфейс: Подстраницы -->
						{:else if selectedPageId === 'interface-top-bar'}
							{#if visibleTopBarFields.length > 0}
								<div class="settings-cards">
									{#each visibleTopBarFields as field (field.key)}
										<FieldControl
											{field}
											value={themeValues.value[field.key] ?? field.default}
											onchange={(value) => themeValues.patch({ [field.key]: value })}
										/>
									{/each}
								</div>
							{:else}
								<p class="section-hint">У выбранной темы нет отдельных настроек верхней панели.</p>
							{/if}
						{:else if selectedPageId === 'interface-mobile-bar'}
							<div class="settings-cards">
								<FieldControl
									field={disableMobileTopBarField}
									value={settings.value.disableMobileTopBar}
									onchange={(value) => settings.patch({ disableMobileTopBar: Boolean(value) })}
								/>
								{#each visibleMobileBarFields as field (field.key)}
									<FieldControl
										{field}
										value={themeValues.value[field.key] ?? field.default}
										onchange={(value) => themeValues.patch({ [field.key]: value })}
									/>
								{/each}
							</div>
						{:else if selectedPageId === 'interface-content'}
							<div class="settings-cards">
								{#each visibleContentFields as field (field.key)}
									<FieldControl
										{field}
										value={themeValues.value[field.key] ?? field.default}
										onchange={(value) => themeValues.patch({ [field.key]: value })}
									/>
								{/each}
								<FieldControl
									field={rankField}
									value={reactionSettings.value.rank}
									onchange={(value) => reactionSettings.patch({ rank: value === true })}
								/>
								<FieldControl
									field={recommendationsField}
									value={settings.value.recommendations}
									onchange={(value) => settings.patch({ recommendations: value as RecommendationsMode })}
								/>
								{#each visibleOtherFields as field (field.key)}
									<FieldControl
										{field}
										value={themeValues.value[field.key] ?? field.default}
										onchange={(value) => themeValues.patch({ [field.key]: value })}
									/>
								{/each}
							</div>
							<SettingsGroup title="Фильтрация контента">
								<SettingsRow
									title="Чёрный список и стоп-слова"
									subtitle="Скрытие постов по тегам (#политика, #аниме), ключевым словам, а также авторов и сообществ DTF"
								>
									<SettingsButton variant="suggested" onclick={openIgnoredFromContent}>
										<span class="btn-text">
											Настроить
											<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d="M6 3l5 5-5 5" />
											</svg>
										</span>
									</SettingsButton>
								</SettingsRow>
							</SettingsGroup>
						{:else if selectedPageId === 'interface-votes'}
							{#if visibleVotesFields.length > 0}
								{#each visibleVotesFields as field (field.key)}
									<FieldControl
										{field}
										value={themeValues.value[field.key] ?? field.default}
										onchange={(value) => themeValues.patch({ [field.key]: value })}
									/>
								{/each}
							{:else}
								<p class="section-hint">У выбранной темы нет дополнительных настроек оценок.</p>
							{/if}
							<SettingsGroup title="Реестр реакций">
								<SettingsRow
									title="Настройка реакций"
									subtitle="Вес и вид реакций, подсчёт рейтинга"
								>
									<SettingsButton variant="suggested" onclick={openReactionsFromVotes}>
										<span class="btn-text">
											Настроить
											<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d="M6 3l5 5-5 5" />
											</svg>
										</span>
									</SettingsButton>
								</SettingsRow>
							</SettingsGroup>
						{:else if selectedPageId === 'interface-comments'}
							<div class="settings-cards">
								<FieldControl
									field={autoUpvoteCommentsField}
									value={settings.value.autoUpvoteComments}
									onchange={(value) => settings.patch({ autoUpvoteComments: Boolean(value) })}
								/>
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
								<FieldControl
									field={clientBadgesField}
									value={settings.value.clientBadges}
									onchange={(value) => settings.patch({ clientBadges: value as ClientBadgesMode })}
								/>
								{#if settings.value.clientBadges === 'all'}
									<FieldControl
										field={mobileBadgesPositionField}
										value={settings.value.mobileBadgesPosition}
										onchange={(value) => settings.patch({ mobileBadgesPosition: value as MobileBadgesPosition })}
									/>
								{/if}
							</div>
							<SettingsGroup title="Подпись reDTF">
								<SettingsRow
									title="Невидимая подпись reDTF"
									subtitle="Скрытая метка клиента в комментариях настраивается в параметрах приложения"
								>
									<SettingsButton variant="suggested" onclick={openAppFromComments}>
										<span class="btn-text">
											Настроить
											<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d="M6 3l5 5-5 5" />
											</svg>
										</span>
									</SettingsButton>
								</SettingsRow>
							</SettingsGroup>
						{:else if selectedPageId === 'interface-editor'}
							{#if visibleEditorFields.length > 0}
								{#each visibleEditorFields as field (field.key)}
									<FieldControl
										{field}
										value={themeValues.value[field.key] ?? field.default}
										onchange={(value) => themeValues.patch({ [field.key]: value })}
									/>
								{/each}
							{:else}
								<p class="section-hint">У выбранной темы нет отдельных настроек редактора.</p>
							{/if}
						{/if}
					</div>
				{:else}
					<!-- Ни один раздел не выбран — плейсхолдер по центру -->
					<SettingsEmptyState text={activeFolderId ? 'Выберите подраздел в меню слева' : 'Выберите раздел в меню слева'} />
				{/if}
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
		--st-bg: var(--theme-st-bg, #fafafb);
		--st-side: var(--theme-st-side, #f3f3f5);
		--st-side-border: var(--theme-st-side-border, rgba(0, 0, 6, 0.07));
		--st-header: var(--theme-st-header, 48px);
		--st-card: var(--theme-st-card, #fff);
		--st-card-shadow-soft: var(--theme-st-card-shadow-soft, 0 0 0 1px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.05));
		--st-card-shadow: var(--theme-st-card-shadow, 0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px 1px rgba(0, 0, 0, 0.07), 0 2px 6px 2px rgba(0, 0, 0, 0.03));
		--st-separator: var(--theme-st-separator, rgba(0, 0, 0, 0.06));
		--st-hover: var(--theme-st-hover, rgba(0, 0, 0, 0.035));
		--st-button: var(--theme-st-button, rgba(0, 0, 0, 0.05));
		--st-button-hover: var(--theme-st-button-hover, rgba(0, 0, 0, 0.09));
		--st-field: var(--theme-st-field, rgba(0, 0, 0, 0.045));
		--st-track: var(--theme-st-track, #d6d6d6);
		--st-text: var(--theme-st-text, var(--text-primary, #1e1e1e));
		--st-muted: var(--theme-st-muted, var(--text-muted, #66646b));
		--st-accent: var(--theme-st-accent, var(--color-blue, #3584e4));
		--st-danger: var(--theme-st-danger, #c01c28);
		--st-ok: var(--theme-st-ok, #1f8a3b);
		--st-nav-active-bg: var(--theme-st-nav-active-bg, var(--st-card));
		--st-nav-active-shadow: var(--theme-st-nav-active-shadow, var(--st-card-shadow-soft));

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
		--st-bg: var(--theme-st-bg, #242424);
		--st-side: var(--theme-st-side, #2e2e2e);
		--st-side-border: var(--theme-st-side-border, rgba(255, 255, 255, 0.08));
		--st-card: var(--theme-st-card, #303030);
		--st-card-shadow-soft: var(--theme-st-card-shadow-soft, 0 0 0 1px rgba(255, 255, 255, 0.07), 0 1px 2px rgba(0, 0, 0, 0.2));
		--st-card-shadow: var(--theme-st-card-shadow, 0 0 0 1px rgba(255, 255, 255, 0.07), 0 1px 3px 1px rgba(0, 0, 0, 0.3));
		--st-separator: var(--theme-st-separator, rgba(255, 255, 255, 0.08));
		--st-hover: var(--theme-st-hover, rgba(255, 255, 255, 0.06));
		--st-button: var(--theme-st-button, rgba(255, 255, 255, 0.08));
		--st-button-hover: var(--theme-st-button-hover, rgba(255, 255, 255, 0.12));
		--st-field: var(--theme-st-field, rgba(255, 255, 255, 0.06));
		--st-track: var(--theme-st-track, #4a4a4d);
		--st-muted: var(--theme-st-muted, #9a9996);
		--st-text: var(--theme-st-text, #ffffff);
		--st-accent: var(--theme-st-accent, var(--color-blue, #78aeed));
		--st-danger: var(--theme-st-danger, #e01b24);
		--st-ok: var(--theme-st-ok, #2ec27e);
		--st-nav-active-bg: var(--theme-st-nav-active-bg, rgba(255, 255, 255, 0.12));
		--st-nav-active-shadow: var(--theme-st-nav-active-shadow, 0 0 0 1px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.25));
		box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.4), 0 12px 48px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--st-text);
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
		min-width: 0;
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
		top: calc((var(--st-header) - 32px) / 2);
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
		color: color-mix(in srgb, var(--st-text) 80%, transparent);
		font-size: 14px;
		text-align: left;
		cursor: pointer;
		transition:
			background-color var(--duration-base),
			box-shadow var(--duration-base),
			color var(--duration-base);
	}

	.nav__title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nav__item:hover {
		color: var(--st-text);
		background: color-mix(in srgb, currentColor 6%, transparent);
	}

	.nav__item:active {
		background: color-mix(in srgb, currentColor 14%, transparent);
	}

	/* Активный пункт меню — спокойная Adwaita карточка */
	.nav__item--active,
	.nav__item--active:hover {
		background: var(--st-nav-active-bg);
		box-shadow: var(--st-nav-active-shadow);
		color: var(--st-text);
		font-weight: 500;
	}

	.nav__item--active :global(.glyph) {
		color: var(--st-accent);
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
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.page {
		width: 100%;
		max-width: 680px;
		margin: 0 auto;
		padding: 0 40px 48px;
		box-sizing: border-box;
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

	.settings-cards {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 36px;
	}

	.settings-cards > :global(.group) {
		margin-bottom: 0;
	}

	.section-hint {
		margin: 8px 4px 16px;
		color: var(--st-muted);
		font-size: 14px;
	}

	.btn-text {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.icon-button {
		display: grid;
		flex: none;
		place-items: center;
		width: 32px;
		height: 32px;
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
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 20px 10px 10px 18px;
			height: auto;
			min-height: 62px;
			box-sizing: border-box;
		}

		.folder-back {
			position: static;
			margin-left: auto;
			margin-right: 0;
			flex: none;
		}

		.side-title {
			font-size: 22px;
			font-weight: 300;
			line-height: 32px;
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

		.nav__item--active :global(.glyph) {
			color: inherit;
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
			border-color var(--fade),
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
		border-color: transparent;
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
		border-color: transparent;
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
