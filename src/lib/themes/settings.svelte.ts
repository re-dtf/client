import { persistedState } from '$lib/storage/persisted.svelte';
import { activeTheme } from './index.svelte';
import { themeSettingsSchema } from './registry';
import type { SettingValue } from './types';

type Values = Record<string, SettingValue>;

// У каждой темы свои настройки (redtf:theme:<id>): при смене темы они не теряются и не смешиваются
const stores = new Map<string, ReturnType<typeof persistedState<Values>>>();

export function getThemeSettings(themeId: string) {
	let store = stores.get(themeId);
	if (!store) {
		const defaults: Values = Object.fromEntries(themeSettingsSchema(themeId).map((field) => [field.key, field.default]));
		store = persistedState<Values>(`redtf:theme:${themeId}`, defaults);
		stores.set(themeId, store);
	}
	return store;
}

/** Настройки выбранной сейчас темы. Значения форка лежат под его id, а не под id основы. */
export function activeThemeSettings() {
	return getThemeSettings(activeTheme.id);
}
