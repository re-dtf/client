import { PersistedState } from '$lib/storage/persisted.svelte';

export type ThemeName = 'classic' | 'modern';

export const themeState = new PersistedState<ThemeName>('redtf:theme', 'classic');
