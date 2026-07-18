import { persistedState } from './persisted.svelte';
import type { SourceState, PendingBioCleanup } from '$lib/api/sources/types';

const sourcesState = persistedState<SourceState[]>('redtf:sources', []);
const pendingBioCleanupState = persistedState<PendingBioCleanup | null>('redtf:bio-cleanup', null);

export const sourceStorage = {
	get sources() {
		return sourcesState.value;
	},
	set sources(v: SourceState[]) {
		sourcesState.value = v;
	},

	getToken(sourceId: string): string | undefined {
		const source = sourcesState.value.find((s) => s.manifest.id === sourceId);
		if (!source || !source.authToken) {
			return undefined;
		}
		// Check token expiration if expiresAt is set
		if (source.authTokenExpiresAt && Date.now() > source.authTokenExpiresAt) {
			return undefined;
		}
		return source.authToken;
	},

	setToken(sourceId: string, token: string | undefined, expiresAt?: number): void {
		sourcesState.value = sourcesState.value.map((s) => {
			if (s.manifest.id === sourceId) {
				return {
					...s,
					authToken: token,
					authTokenExpiresAt: expiresAt
				};
			}
			return s;
		});
	},

	get pendingBioCleanup() {
		return pendingBioCleanupState.value;
	},
	set pendingBioCleanup(v: PendingBioCleanup | null) {
		pendingBioCleanupState.value = v;
	}
};
