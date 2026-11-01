import { persistedState } from './persisted.svelte';
import type { Session } from '$lib/api/types';

const sessionState = persistedState<Session | null>('redtf:secrets:dtf-session', null);

/** Сессия DTF. Слой secrets: не попадает в экспорт настроек. */
export const authStorage = {
	get session() { return sessionState.value; },
	set session(v) { sessionState.value = v; },
	get dtfToken() { return sessionState.value?.accessToken || ''; },
	get isAuthenticated() { return !!sessionState.value?.accessToken; },
	logout() { sessionState.value = null; }
};
