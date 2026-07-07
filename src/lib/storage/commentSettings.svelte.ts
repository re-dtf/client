import { persistedState } from '$lib/storage/persisted.svelte';

export type NestingMode = 'flatten' | 'autopan';

export const commentSettings = persistedState<{ nestingMode: NestingMode }>('redtf:comments', { nestingMode: 'flatten' });
