import { PersistedState } from './persisted.svelte';
import type { Session } from '$lib/api/types';

const sessionState = new PersistedState<Session | null>('redtf:auth:session', null);

export const authStorage = {
	get session() { return sessionState.value; },
	set session(v) { sessionState.value = v; },
	get dtfToken() { return sessionState.value?.accessToken || ''; },
	get isAuthenticated() { return !!sessionState.value?.accessToken; },
	logout() { sessionState.value = null; }
};
