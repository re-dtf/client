import { settings, DEFAULT_THEME } from '$lib/storage/settings.svelte';
import { getTheme, themeChain, themePalettes } from './registry';
import type { ThemePalettes, ThemeManifest } from './types';

export { themes, themePalettes } from './registry';

/** Выбранная пользователем тема */
export const activeTheme = {
	/** id темы. Если выбранной темы больше нет, берётся тема по умолчанию */
	/** Название темы */
	get name(): string {
		return getTheme(activeTheme.id)?.name ?? '';
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
	/** Палитры выбранной темы с учётом основы. */
	get palettes(): ThemePalettes {
		return themePalettes(activeTheme.id);
	},
	/** Анимации самой темы (не основы): форк dtf2022 сам решает, анимировать ли */
	get motion(): ThemeManifest['motion'] {
		return getTheme(activeTheme.id)?.motion;
	},
	set(id: string) {
		settings.patch({ theme: id });
	}
};
