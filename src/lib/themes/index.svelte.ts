import { persistedState } from '$lib/storage/persisted.svelte';

export type ThemeName = 'classic' | 'modern';

export const themeState = persistedState<ThemeName>('redtf:theme', 'classic');
