import { settings, DEFAULT_THEME } from '$lib/storage/settings.svelte';
import { getTheme, themeChain } from './registry';

export { themes } from './registry';

/** Выбранная пользователем тема */
export const activeTheme = {
	/** id темы. Если выбранной темы больше нет, берётся тема по умолчанию */
	get id(): string {
		return getTheme(settings.value.theme) ? settings.value.theme : DEFAULT_THEME;
	},
	/** Тема и её основы: ['my-fork', 'dtf2022'] */
	get chain(): string[] {
		return themeChain(activeTheme.id);
	},
	set(id: string) {
		settings.patch({ theme: id });
	}
};
