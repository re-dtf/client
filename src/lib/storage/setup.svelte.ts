import { persistedState } from './persisted.svelte';

/** Пользователь прошёл приветствие (Welcome.svelte). Пока значения нет, при запуске показывается приветствие */
export const setupCompleted = persistedState('redtf:setup:completed', false);
