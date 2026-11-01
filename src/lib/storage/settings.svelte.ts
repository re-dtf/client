import { persistedState } from './persisted.svelte';

export type NestingMode = 'flatten' | 'autopan';

export interface AppSettings {
	/** id активной темы (см. $lib/themes) */
	theme: string;
	/** CORS-прокси для входа и обновления токена DTF; пусто — прямые запросы */
	proxyUrl: string;
	/** Показ глубоко вложенных комментариев */
	commentNesting: NestingMode;
}

/**
 * Прокси, который предлагается в настройках и при входе. Задаётся при сборке
 * переменной VITE_AUTH_PROXY_URL (локально в .env, в CI — в переменных репозитория).
 * Если переменная не задана, строка пустая и кнопки "использовать прокси автора" нет.
 */
export const DEFAULT_PROXY_URL: string = import.meta.env.VITE_AUTH_PROXY_URL ?? '';

export const DEFAULT_THEME = 'dtf2022';

/** Общие настройки приложения, не зависящие от темы. Настройки темы лежат в themeSettings. */
export const settings = persistedState<AppSettings>('redtf:settings', {
	theme: DEFAULT_THEME,
	proxyUrl: '',
	commentNesting: 'flatten'
});
