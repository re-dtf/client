import { persistedState } from './persisted.svelte';

export type NestingMode = 'flatten' | 'autopan';
export type CommentVirtualization = 'auto' | 'enabled' | 'disabled';
export type ColorScheme = 'auto' | 'light' | 'dark';

export interface AppSettings {
	/** id активной темы (см. $lib/themes) */
	theme: string;
	/** Цветовая схема: системная, светлая или тёмная */
	colorScheme: ColorScheme;
	/** CORS-прокси для входа и обновления токена DTF; пусто — прямые запросы */
	proxyUrl: string;
	/** Показ глубоко вложенных комментариев */
	commentNesting: NestingMode;
	/** Виртуализация отрисовки комментариев (content-visibility: auto) */
	commentVirtualization: CommentVirtualization;
	/** Вести локальную статистику (см. stats.svelte.ts) */
	collectStats: boolean;
	/** Тактильный виброотклик (для поддерживаемых устройств) */
	haptics: boolean;
	/** Отключать верхний бар в мобильной версии */
	disableMobileTopBar: boolean;
}

/**
 * Прокси, который предлагается в настройках и при входе. Задаётся при сборке
 * переменной VITE_AUTH_PROXY_URL (локально в .env, в CI — в переменных репозитория).
 * Если переменная не задана, строка пустая и кнопки "использовать прокси автора" нет.
 */
export const DEFAULT_PROXY_URL: string = import.meta.env.VITE_AUTH_PROXY_URL ?? '';

export const DEFAULT_THEME = 'redtf';

/** Общие настройки приложения, не зависящие от темы. Настройки темы лежат в themeSettings. */
export const settings = persistedState<AppSettings>('redtf:settings', {
	theme: DEFAULT_THEME,
	colorScheme: 'auto',
	proxyUrl: '',
	commentNesting: 'flatten',
	commentVirtualization: 'auto',
	collectStats: true,
	haptics: true,
	disableMobileTopBar: false
});

/**
 * Проверяет, включена ли виртуализация комментариев (content-visibility: auto).
 * В режиме 'auto' включена для Chromium и WebKit, но отключена для Firefox (Gecko),
 * где есть баг с пропуском отрисовки при скролле длинных grid-списков.
 */
export function shouldVirtualizeComments(mode: CommentVirtualization = settings.value.commentVirtualization): boolean {
	if (mode === 'enabled') return true;
	if (mode === 'disabled') return false;
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
	const isFirefox = /firefox|fxios/i.test(navigator.userAgent);
	if (isFirefox) return false;
	return 'contentVisibility' in document.documentElement.style;
}
