import { persistedState } from '$lib/storage/persisted.svelte';

export type ThemeName = 'classic' | 'modern' | 'dtf2022';

export const themeState = persistedState<ThemeName>('redtf:theme', 'classic');
