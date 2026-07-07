import { persistedState } from './persisted.svelte';
import type { Session } from '$lib/api/types';

const sessionState = persistedState<Session | null>('redtf:auth:session', null);
const proxyUrlState = persistedState<string>('redtf:auth:proxy_url', '');

export const authStorage = {
	get session() { return sessionState.value; },
	set session(v) { sessionState.value = v; },
	get dtfToken() { return sessionState.value?.accessToken || ''; },
	get isAuthenticated() { return !!sessionState.value?.accessToken; },
	get proxyUrl() { return proxyUrlState.value; },
	set proxyUrl(v) { proxyUrlState.value = v; },
	logout() { sessionState.value = null; }
};
