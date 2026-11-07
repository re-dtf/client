import { settings, DEFAULT_THEME } from '$lib/storage/settings.svelte';
import { getTheme, themeChain, themeColors } from './registry';
import type { ThemeColors, ThemeManifest } from './types';

export { themes, themeColors } from './registry';

/** Выбранная пользователем тема */
export const activeTheme = {
	/** id темы. Если выбранной темы больше нет, берётся тема по умолчанию */
	/** Название темы */
	get name(): string {
		return getTheme(activeTheme.id)?.name ?? '';
	},
	/** Поддерживает ли выбранная тема тёмный режим */
	get supportsDarkMode(): boolean {
		return getTheme(activeTheme.id)?.supportsDarkMode === true;
	},
	/** Включены ли у выбранной темы жесты (свайп лент, «назад», по комментарию) */
	get gestures(): boolean {
		return getTheme(activeTheme.id)?.gestures === true;
	},
	get id(): string {
		return getTheme(settings.value.theme) ? settings.value.theme : DEFAULT_THEME;
	},
	/** Тема и её основы: ['my-fork', 'dtf2022'] */
	get chain(): string[] {
		return themeChain(activeTheme.id);
	},
	/** Фирменные цвета выбранной темы (светлый и тёмный) */
	get colors(): ThemeColors {
		return themeColors(activeTheme.id) ?? { light: '#D9F5FF', dark: '#202022' };
	},
	/** Анимации самой темы (не основы): форк dtf2022 сам решает, анимировать ли */
	get motion(): ThemeManifest['motion'] {
		return getTheme(activeTheme.id)?.motion;
	},
	set(id: string) {
		settings.patch({ theme: id });
	}
};
