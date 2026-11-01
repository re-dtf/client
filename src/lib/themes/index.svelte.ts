import { settings } from '$lib/storage/settings.svelte';

export type ThemeName = 'classic' | 'modern' | 'dtf2022';

// Временный адаптер: активная тема хранится в общих настройках. Заменяется реестром тем.
export const themeState = {
	get value() {
		return settings.value.theme as ThemeName;
	},
	set value(theme: ThemeName) {
		settings.patch({ theme });
	}
};
