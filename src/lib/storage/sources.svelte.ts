import { persistedState } from './persisted.svelte';
import type { SourceState, PendingBioCleanup } from '$lib/api/sources/types';

interface StoredToken {
	token: string;
	/** timestamp, мс */
	expiresAt?: number;
}

const isExpired = (t: StoredToken) => t.expiresAt !== undefined && Date.now() > t.expiresAt;

// Манифесты и разрешения (data) отдельно от токенов (secrets)
const sourcesState = persistedState<SourceState[]>('redtf:data:sources', []);
const pendingBioCleanupState = persistedState<PendingBioCleanup | null>('redtf:data:bio-cleanup', null);
const tokensState = persistedState<Record<string, StoredToken>>('redtf:secrets:source-tokens', {});

// Просроченные токены убираем при запуске: геттеры ничего не пишут
tokensState.value = Object.fromEntries(Object.entries(tokensState.value).filter(([, t]) => !isExpired(t)));

export const sourceStorage = {
	get sources() {
		return sourcesState.value;
	},
	set sources(v: SourceState[]) {
		sourcesState.value = v;
	},

	getToken(sourceId: string): string | undefined {
		const stored = tokensState.value[sourceId];
		return stored && !isExpired(stored) ? stored.token : undefined;
	},

	setToken(sourceId: string, token: string | undefined, expiresAt?: number): void {
		const { [sourceId]: _removed, ...rest } = tokensState.value;
		tokensState.value = token ? { ...rest, [sourceId]: { token, expiresAt } } : rest;
	},

	get pendingBioCleanup() {
		return pendingBioCleanupState.value;
	},
	set pendingBioCleanup(v: PendingBioCleanup | null) {
		pendingBioCleanupState.value = v;
	}
};
