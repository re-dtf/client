import { activeTheme, themes } from '$lib/themes/index.svelte';
import { activeThemeSettings } from '$lib/themes/settings.svelte';
import { paletteSelection } from '$lib/themes/palette';
import { EXPERIMENTAL, isFieldVisible, pickVisibility } from '$lib/themes/types';
import type { ChoiceField, SettingField, SettingValue, SettingVisibility, ToggleField, VisibilityContext } from '$lib/themes/types';
import {
	DEFAULT_THEME,
	settings,
	type AnimatedAvatarsMode,
	type RemarkView,
	type ClientBadgesMode,
	type CommentVirtualization,
	type MobileBadgesPosition,
	type NestingMode,
	type PlusBadgesMode,
	type RecommendationsMode
} from '$lib/storage/settings.svelte';
import type { DeclarativeFieldGroup, SettingsNavPageMeta } from './settingsSearch';

export interface RootNavItem extends SettingVisibility {
	id: string;
	type: 'page' | 'folder';
	title: string;
	icon: string;
}

export interface RootNavSection {
	title: string;
	items: RootNavItem[];
}

export interface SubNavItem extends SettingVisibility {
	id: string;
	title: string;
	icon: string;
}

export interface SubNavGroup {
	title: string;
	items: SubNavItem[];
}

export interface SoloBackTarget {
	pageId: string;
	folderId: string | null;
	title: string;
}

export interface DeclarativeFieldEntry {
	field: SettingField;
	getValue: () => SettingValue;
	setValue: (value: SettingValue) => void;
}

export interface DeclarativeSoloLink {
	groupTitle: string;
	title: string;
	subtitle: string;
	buttonLabel: string;
	targetPageId: string;
	targetFolderId?: string | null;
	backTarget: SoloBackTarget;
}

export interface DeclarativePageConfig {
	pageId: string;
	folderId?: string;
	icon: string;
	searchPath: string;
	cardsLayout: boolean;
	emptyHint?: string;
	entries: DeclarativeFieldEntry[];
	soloLink?: DeclarativeSoloLink;
}

// --- Навигация и алиасы ---

const BASE_ROOT_NAVIGATION: RootNavSection[] = [
	{
		title: 'Аккаунт',
		items: [
			{ id: 'account', type: 'page', title: 'Мой профиль', icon: 'profile' },
			{ id: 'notifications', type: 'page', title: 'Уведомления', icon: 'notifications' }
		]
	},
	{
		title: 'Контент',
		items: [
			{ id: 'feed', type: 'page', title: 'Моя лента', icon: 'feed' },
			{ id: 'filters', type: 'page', title: 'Фильтрация', icon: 'filters' },
			{ id: 'ignored', type: 'page', title: 'Чёрный список', icon: 'ignored' },
			{ id: 'sources', type: 'page', title: 'Источники данных', icon: 'sources' }
		]
	},
	{
		title: 'Персонализация',
		items: [
			{ id: 'theme-select', type: 'page', title: 'Выбор темы', icon: 'theme-select' },
			{ id: 'interface', type: 'folder', title: 'Интерфейс', icon: 'interface' },
			{ id: 'pinned', type: 'page', title: 'Закреплённые', icon: 'pinned' },
			{ id: 'reactions', type: 'page', title: 'Реестр реакций', icon: 'reactions' },
			{ id: 'app', type: 'page', title: 'Приложение', icon: 'app' }
		]
	},
	{
		title: 'Данные',
		items: [
			{ id: 'network', type: 'page', title: 'Сеть и прокси', icon: 'network' },
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

export const INTERFACE_SUBNAV: SubNavGroup[] = [
	{
		title: 'Интерфейс',
		items: [
			{ id: 'interface-top-bar', title: 'Верхняя панель', icon: 'top-bar' },
			{ id: 'interface-mobile-bar', title: 'Мобильная панель', icon: 'mobile-bar', device: 'mobile' },
			{ id: 'interface-content', title: 'Лента и контент', icon: 'content' },
			{ id: 'interface-users', title: 'Пользователи', icon: 'profile' },
			{ id: 'interface-votes', title: 'Оценки', icon: 'votes' },
			{ id: 'interface-comments', title: 'Комментарии', icon: 'comments' },
			{ id: 'interface-editor', title: 'Редактор', icon: 'editor' },
			{ id: 'animations', title: 'Анимации', icon: 'animations' }
		]
	}
];

const PAGE_KEYWORDS: Record<string, string> = {
	filters: 'теги ключевые слова стоп-слова пресеты скрытие мягкий жёсткий фильтр посты новости комментарии',
	ignored: 'чс бан мут игнор скрытые пользователи авторы подсайты темы',
	notifications: 'оповещения ответы комментарии лайки почта push',
	pinned: 'подсайты показывать боковое меню панель сообщества блоги избранные',
	'theme-select': 'оформление внешний вид скин палитра светлая тёмная amoled',
	supporters: 'спонсоры донатеры благодарности',
	network: 'прокси proxy cors failover вход',
	stats: 'статистика время посты графики',
	animations: 'анимация движение переход слайд material скорость темп',
	app: 'вибрация отклик тактильный жест назад предиктивный иконка значок водяной знак',
	debug: 'отладка дебаг safe area hud'
};

const PAGE_ALIASES: Record<string, { folderId: string | null; pageId: string; section?: string }> = {
	themes: { folderId: null, pageId: 'theme-select' },
	'theme-select': { folderId: null, pageId: 'theme-select' },
	theme: { folderId: null, pageId: 'theme-select' },
	'interface-top-bar': { folderId: 'interface', pageId: 'interface-top-bar' },
	'top-bar': { folderId: 'interface', pageId: 'interface-top-bar' },
	'interface-mobile-bar': { folderId: 'interface', pageId: 'interface-mobile-bar' },
	'mobile-bar': { folderId: 'interface', pageId: 'interface-mobile-bar' },
	'interface-content': { folderId: 'interface', pageId: 'interface-content' },
	content: { folderId: 'interface', pageId: 'interface-content' },
	'interface-users': { folderId: 'interface', pageId: 'interface-users' },
	users: { folderId: 'interface', pageId: 'interface-users' },
	'appearance-general': { folderId: 'interface', pageId: 'interface-content' },
	'interface-votes': { folderId: 'interface', pageId: 'interface-votes' },
	votes: { folderId: 'interface', pageId: 'interface-votes' },
	'appearance-votes': { folderId: 'interface', pageId: 'interface-votes' },
	'interface-comments': { folderId: 'interface', pageId: 'interface-comments' },
	comments: { folderId: 'interface', pageId: 'interface-comments' },
	'behavior-comments': { folderId: 'interface', pageId: 'interface-comments' },
	'interface-editor': { folderId: 'interface', pageId: 'interface-editor' },
	editor: { folderId: 'interface', pageId: 'interface-editor' },
	'appearance-editor': { folderId: 'interface', pageId: 'interface-editor' },
	reactions: { folderId: null, pageId: 'reactions' },
	'behavior-reactions': { folderId: null, pageId: 'reactions' },
	app: { folderId: null, pageId: 'app' },
	animations: { folderId: 'interface', pageId: 'animations' },
	motion: { folderId: 'interface', pageId: 'animations' },
	'app-icon': { folderId: null, pageId: 'app-icon' },
	icons: { folderId: null, pageId: 'app-icon' },
	'appearance-icons': { folderId: null, pageId: 'app-icon' },
	feed: { folderId: null, pageId: 'feed' },
	'my-feed': { folderId: null, pageId: 'feed' },
	'behavior-feed': { folderId: null, pageId: 'feed' },
	filter: { folderId: null, pageId: 'filters' },
	filtering: { folderId: null, pageId: 'filters' },
	blacklist: { folderId: null, pageId: 'ignored' },
	dtf: { folderId: null, pageId: 'notifications' },
	legal: { folderId: null, pageId: 'about', section: 'documents' },
	documents: { folderId: null, pageId: 'about', section: 'documents' },
	proxy: { folderId: null, pageId: 'network' },
	supporters: { folderId: null, pageId: 'supporters' },
	donations: { folderId: null, pageId: 'supporters' },
	backers: { folderId: null, pageId: 'supporters' }
};

const INTERFACE_SECTION_ALIASES = new Set(['interface', 'appearance', 'behavior']);

export function getRootNavigation(isDevVisible: boolean): RootNavSection[] {
	if (!isDevVisible) return BASE_ROOT_NAVIGATION;
	return [
		...BASE_ROOT_NAVIGATION,
		{
			title: 'Разработка',
			items: [{ id: 'debug', type: 'page', title: 'Дебаг', icon: 'debug' }]
		}
	];
}

/** Преобразует старые/прямые id страниц и секций в начальное состояние навигации */
export function resolveInitialNav(
	page: string | undefined,
	section: string | undefined,
	isDevVisible: boolean
): { folderId: string | null; pageId: string | null; section: string | undefined } {
	if (page) {
		if (page === 'debug' && !isDevVisible) {
			return { folderId: null, pageId: null, section };
		}
		const alias = PAGE_ALIASES[page];
		if (alias) {
			return {
				folderId: alias.folderId,
				pageId: alias.pageId,
				section: alias.section ?? section
			};
		}
		return { folderId: null, pageId: page, section };
	}

	if (section && INTERFACE_SECTION_ALIASES.has(section)) {
		return { folderId: 'interface', pageId: null, section };
	}

	return { folderId: null, pageId: null, section };
}

export function getPageTitle(
	selectedPageId: string | null,
	folderTitle: string,
	rootNavigation: RootNavSection[]
): string {
	if (!selectedPageId) return folderTitle;
	for (const group of rootNavigation) {
		const found = group.items.find((item) => item.id === selectedPageId);
		if (found) return found.title;
	}
	for (const group of INTERFACE_SUBNAV) {
		const found = group.items.find((item) => item.id === selectedPageId);
		if (found) return found.title;
	}
	if (selectedPageId === 'app-icon') return 'Иконка приложения';
	return 'Настройки';
}

export function buildNavSearchPages(rootNavigation: RootNavSection[]): SettingsNavPageMeta[] {
	return [
		...rootNavigation.flatMap((group) =>
			group.items
				.filter((item) => item.type === 'page')
				.map((item) => ({
					pageId: item.id,
					icon: item.icon,
					path: group.title,
					title: item.title,
					keywords: PAGE_KEYWORDS[item.id],
					...pickVisibility(item),
					devOnly: item.id === 'debug'
				}))
		),
		...INTERFACE_SUBNAV.flatMap((group) =>
			group.items.map((item) => ({
				pageId: item.id,
				folderId: 'interface',
				icon: item.icon,
				path: `Персонализация › ${group.title}`,
				title: item.title,
				keywords: PAGE_KEYWORDS[item.id],
				...pickVisibility(item)
			}))
		)
	];
}

// --- Описания общих полей настроек ---

const themeField: ChoiceField = {
	key: 'theme',
	type: 'radio',
	title: 'Выбор темы',
	default: DEFAULT_THEME,
	options: themes
		.filter((theme) => !theme.hidden)
		.map((theme) => ({ value: theme.id, title: theme.name, description: theme.description }))
};

const hapticsField: ToggleField = {
	key: 'haptics',
	type: 'toggle',
	title: 'Тактильный отклик (вибрация)',
	description: 'Вибрация при лайках, реакциях и переключении вкладок',
	platform: 'android',
	default: true
};

const predictiveBackField: ToggleField = {
	key: 'predictiveBack',
	type: 'toggle',
	title: 'Поддержка Predictive Gesture',
	description: 'Анимация возврата при системном жесте от края экрана',
	note: EXPERIMENTAL,
	platform: 'android',
	native: true,
	default: false
};

const useSharePreviewField: ToggleField = {
	key: 'useSharePreview',
	type: 'toggle',
	title: 'Превью ссылок в соцсетях',
	description: 'Копировать ссылки на посты через сервис предпросмотра, чтобы Telegram и другие соцсети показывали карточку статьи с обложкой.',
	default: true
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
		{ value: 'autopan', title: 'Авто-панорама', note: EXPERIMENTAL, description: 'Без лимита вложенности, камера следит за глубиной' }
	]
};

const virtualizationField: ChoiceField = {
	key: 'commentVirtualization',
	type: 'radio',
	title: 'Виртуализация комментариев',
	description: 'На странице держатся только комментарии около экрана: длинные ветки прокручиваются быстрее. Поиск по странице и экранный чтец видят только их.',
	default: 'auto',
	options: [
		{ value: 'auto', title: 'Авто (рекомендуется)', description: 'Включено' },
		{ value: 'enabled', title: 'Всегда включено', description: 'Включено' },
		{ value: 'disabled', title: 'Отключено', description: 'Все комментарии сразу: работает поиск по странице, но длинные ветки тормозят' }
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
	default: 'date',
	options: [
		{ value: 'date', title: 'Возле времени отправления (по умолчанию)', description: 'Компактная мини-иконка рядом со временем комментария' },
		{ value: 'author', title: 'Возле ника', description: 'В строке автора рядом с именем' }
	]
};

const plusBadgesField: ChoiceField = {
	key: 'plusBadges',
	type: 'radio',
	title: 'Бейджи Плюса',
	description: 'Какой значок показывать у подписчиков DTF Plus.',
	default: 'classic',
	options: [
		{ value: 'classic', title: 'Классическая иконка (по умолчанию)', description: 'Алмаз у всех подписчиков Плюса' },
		{ value: 'custom', title: 'Разрешить кастомные бейджи', description: 'Тот значок, который автор выбрал в настройках профиля' }
	]
};

const animatedAvatarsField: ChoiceField = {
	key: 'animatedAvatars',
	type: 'radio',
	title: 'Анимированные аватарки',
	description: 'Когда воспроизводить видео-аватарки подписчиков Плюса. Обложки профилей анимируются всегда.',
	default: 'all',
	options: [
		{ value: 'all', title: 'Везде (по умолчанию)', description: 'В ленте, постах, комментариях и профилях (только на экране)' },
		{ value: 'hover', title: 'Только профиль и при наведении', description: 'В шапке профиля и при наведении курсора в ленте и комментариях' },
		{ value: 'off', title: 'Выключено', description: 'Всегда показывать статичный кадр' }
	]
};

const remarkViewField: ChoiceField = {
	key: 'remarkView',
	type: 'radio',
	title: 'Заметки о пользователях',
	description: 'Личные пометки рядом с именем. Видите их только вы, они хранятся на этом устройстве. Добавить заметку можно в меню пользователя.',
	default: 'text',
	options: [
		{ value: 'text', title: 'Точка и текст (по умолчанию)', description: 'Короткая заметка рядом с именем' },
		{ value: 'plain', title: 'Только текст', description: 'Короткая заметка без точки, цвет остаётся в оттенке плашки' },
		{ value: 'dot', title: 'Только точка', description: 'Текст плавно выезжает при наведении, на телефоне — по нажатию. Изменить заметку: нажатие мышью или долгое нажатие' },
		{ value: 'off', title: 'Не показывать', description: 'Заметки хранятся, но нигде не видны' }
	]
};

const smartTypographyField: ToggleField = {
	key: 'smartTypography',
	type: 'toggle',
	title: 'Типографика при вводе',
	description: 'Заменять в редакторе постов и комментариев два дефиса (--) на длинное тире (—), а двойные кавычки ("") — на кавычки-ёлочки («»)',
	default: true
};

// --- Группировка полей активной темы ---

const THEME_GROUP_KEYS = {
	topBar: new Set(['headerBlur', 'avatarOpensMenu', 'createButtonPos', 'searchBarMode', 'mobileTopBar', 'postTitleInBar', 'hideTopBarOnScroll']),
	mobileBar: new Set(['mobileBarBlur', 'mobileBarFloating']),
	content: new Set(['contentWidth', 'postMediaWidth', 'repostsView']),
	votes: new Set(['votes', 'arrowsSide', 'arrowsOrder']),
	editor: new Set(['editorFullscreen']),
	comment: new Set(['swipeColumn']),
	app: new Set(['transparencyEffects']),
	motion: new Set(['mobileTransition', 'transitionSpeed'])
} as const;

const KNOWN_THEME_KEYS = new Set(
	Object.values(THEME_GROUP_KEYS).flatMap((keys) => [...keys])
);

function themeEntries(
	fields: SettingField[],
	themeValues: ReturnType<typeof activeThemeSettings>
): DeclarativeFieldEntry[] {
	return fields.map((field) => ({
		field,
		getValue: () => themeValues.value[field.key] ?? field.default,
		setValue: (value) => themeValues.patch({ [field.key]: value })
	}));
}

/** Собирает декларативные страницы настроек — общий источник для рендера и поиска */
export function buildDeclarativePages(
	themeFields: SettingField[],
	themeValues: ReturnType<typeof activeThemeSettings>,
	clientBadges: ClientBadgesMode,
	visibility: VisibilityContext = {}
): DeclarativePageConfig[] {
	const group = (keys: Set<string>) => themeFields.filter((f) => keys.has(f.key));
	const otherFields = themeFields.filter((f) => !KNOWN_THEME_KEYS.has(f.key));
	const themeFieldSet = new Set(themeFields);
	const transparencyField = themeFields.find((f) => f.key === 'transparencyEffects') ?? defaultTransparencyField;

	const paletteField: ChoiceField = {
		key: 'palette',
		type: 'radio',
		title: 'Цветовая палитра',
		default: 'auto',
		options: [
			{ value: 'auto', title: 'Системная', description: 'Следовать настройкам системы' },
			...activeTheme.palettes.options.map((palette) => ({ value: palette.id, title: palette.title }))
		]
	};

	const pages: DeclarativePageConfig[] = [
		{
			pageId: 'theme-select',
			icon: 'theme-select',
			searchPath: 'Персонализация › Выбор темы',
			cardsLayout: false,
			entries: [
				{
					field: themeField,
					getValue: () => activeTheme.id,
					setValue: (value) => activeTheme.set(String(value))
				},
				{
					field: paletteField,
					getValue: () => paletteSelection(activeTheme.palettes, activeThemeSettings().value.palette),
					setValue: (value) => activeThemeSettings().patch({ palette: String(value) })
				}
			]
		},
		{
			pageId: 'app',
			icon: 'app',
			searchPath: 'Персонализация › Приложение',
			cardsLayout: true,
			entries: [
				{
					field: hapticsField,
					getValue: () => settings.value.haptics,
					setValue: (value) => settings.patch({ haptics: Boolean(value) })
				},
				{
					field: predictiveBackField,
					getValue: () => settings.value.predictiveBack ?? false,
					setValue: (value) => settings.patch({ predictiveBack: Boolean(value) })
				},
				{
					field: transparencyField,
					getValue: () => themeValues.value.transparencyEffects ?? transparencyField.default,
					setValue: (value) => themeValues.patch({ transparencyEffects: Boolean(value) })
				},
				{
					field: watermarkField,
					getValue: () => settings.value.watermark,
					setValue: (value) => settings.patch({ watermark: Boolean(value) })
				},
				{
					field: useSharePreviewField,
					getValue: () => settings.value.useSharePreview,
					setValue: (value) => settings.patch({ useSharePreview: Boolean(value) })
				}
			],
			soloLink: {
				groupTitle: 'Внешний вид приложения',
				title: 'Иконка приложения',
				subtitle: 'Выбор значка приложения и вкладки браузера, или загрузка своей иконки',
				buttonLabel: 'Выбрать',
				targetPageId: 'app-icon',
				targetFolderId: null,
				backTarget: { folderId: null, pageId: 'app', title: 'Приложение' }
			}
		},
		{
			pageId: 'animations',
			folderId: 'interface',
			icon: 'animations',
			searchPath: 'Интерфейс › Анимации',
			cardsLayout: true,
			entries: themeEntries(group(THEME_GROUP_KEYS.motion), themeValues)
		},
		{
			pageId: 'interface-top-bar',
			folderId: 'interface',
			icon: 'top-bar',
			searchPath: 'Интерфейс › Верхняя панель',
			cardsLayout: true,
			emptyHint: 'У выбранной темы нет отдельных настроек верхней панели.',
			entries: themeEntries(group(THEME_GROUP_KEYS.topBar), themeValues)
		},
		{
			pageId: 'interface-mobile-bar',
			folderId: 'interface',
			icon: 'mobile-bar',
			searchPath: 'Интерфейс › Мобильная панель',
			cardsLayout: true,
			entries: themeEntries(group(THEME_GROUP_KEYS.mobileBar), themeValues)
		},
		{
			pageId: 'interface-content',
			folderId: 'interface',
			icon: 'content',
			searchPath: 'Интерфейс › Лента и контент',
			cardsLayout: true,
			entries: [
				...themeEntries(group(THEME_GROUP_KEYS.content), themeValues),
				{
					field: recommendationsField,
					getValue: () => settings.value.recommendations,
					setValue: (value) => settings.patch({ recommendations: value as RecommendationsMode })
				},
				...themeEntries(otherFields, themeValues)
			],
			soloLink: {
				groupTitle: 'Фильтрация контента',
				title: 'Фильтрация и стоп-слова',
				subtitle: 'Скрытие постов, новостей и комментариев по тегам (#политика, #аниме) и ключевым словам',
				buttonLabel: 'Настроить',
				targetPageId: 'filters',
				targetFolderId: null,
				backTarget: { folderId: 'interface', pageId: 'interface-content', title: 'Лента и контент' }
			}
		},
		{
			pageId: 'interface-users',
			folderId: 'interface',
			icon: 'profile',
			searchPath: 'Интерфейс › Пользователи',
			cardsLayout: true,
			entries: [
				{
					field: plusBadgesField,
					getValue: () => settings.value.plusBadges,
					setValue: (value) => settings.patch({ plusBadges: value as PlusBadgesMode })
				},
				{
					field: animatedAvatarsField,
					getValue: () => settings.value.animatedAvatars,
					setValue: (value) => settings.patch({ animatedAvatars: value as AnimatedAvatarsMode })
				},
				{
					field: remarkViewField,
					getValue: () => settings.value.remarkView,
					setValue: (value) => settings.patch({ remarkView: value as RemarkView })
				}
			]
		},
		{
			pageId: 'interface-votes',
			folderId: 'interface',
			icon: 'votes',
			searchPath: 'Интерфейс › Оценки',
			cardsLayout: false,
			emptyHint: 'У выбранной темы нет дополнительных настроек оценок.',
			entries: themeEntries(group(THEME_GROUP_KEYS.votes), themeValues),
			soloLink: {
				groupTitle: 'Реестр реакций',
				title: 'Настройка реакций',
				subtitle: 'Вес и вид реакций, подсчёт рейтинга',
				buttonLabel: 'Настроить',
				targetPageId: 'reactions',
				targetFolderId: null,
				backTarget: { folderId: 'interface', pageId: 'interface-votes', title: 'Оценки' }
			}
		},
		{
			pageId: 'interface-comments',
			folderId: 'interface',
			icon: 'comments',
			searchPath: 'Интерфейс › Комментарии',
			cardsLayout: true,
			entries: [
				{
					field: autoUpvoteCommentsField,
					getValue: () => settings.value.autoUpvoteComments,
					setValue: (value) => settings.patch({ autoUpvoteComments: Boolean(value) })
				},
				{
					field: nestingField,
					getValue: () => settings.value.commentNesting,
					setValue: (value) => settings.patch({ commentNesting: value as NestingMode })
				},
				{
					field: virtualizationField,
					getValue: () => settings.value.commentVirtualization,
					setValue: (value) => settings.patch({ commentVirtualization: value as CommentVirtualization })
				},
				...themeEntries(group(THEME_GROUP_KEYS.comment), themeValues),
				{
					field: clientBadgesField,
					getValue: () => settings.value.clientBadges,
					setValue: (value) => settings.patch({ clientBadges: value as ClientBadgesMode })
				},
				...(clientBadges === 'all'
					? [
							{
								field: mobileBadgesPositionField,
								getValue: () => settings.value.mobileBadgesPosition,
								setValue: (value: SettingValue) =>
									settings.patch({ mobileBadgesPosition: value as MobileBadgesPosition })
							}
						]
					: [])
			],
			soloLink: {
				groupTitle: 'Подпись reDTF',
				title: 'Невидимая подпись reDTF',
				subtitle: 'Скрытая метка клиента в комментариях настраивается в параметрах приложения',
				buttonLabel: 'Настроить',
				targetPageId: 'app',
				targetFolderId: null,
				backTarget: { folderId: 'interface', pageId: 'interface-comments', title: 'Комментарии' }
			}
		},
		{
			pageId: 'interface-editor',
			folderId: 'interface',
			icon: 'editor',
			searchPath: 'Интерфейс › Редактор',
			cardsLayout: true,
			entries: [
				{
					field: smartTypographyField,
					getValue: () => settings.value.smartTypography,
					setValue: (value) => settings.patch({ smartTypography: Boolean(value) })
				},
				...themeEntries(group(THEME_GROUP_KEYS.editor), themeValues)
			]
		}
	];

	return pages.map((page) => ({
		...page,
		entries: page.entries.filter((entry) =>
			themeFieldSet.has(entry.field) || entry.field === transparencyField
				? isFieldVisible(entry.field, themeValues.value, themeFields, visibility)
				: isFieldVisible(entry.field, settings.value, undefined, visibility)
		)
	}));
}

export function toSearchFieldGroups(pages: DeclarativePageConfig[]): DeclarativeFieldGroup[] {
	return pages.map((page) => ({
		pageId: page.pageId,
		folderId: page.folderId,
		icon: page.icon,
		path: page.searchPath,
		fields: page.entries.map((entry) => entry.field)
	}));
}
