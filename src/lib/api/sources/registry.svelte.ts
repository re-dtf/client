import { sourceStorage } from '$lib/storage/sources.svelte';
import { loadManifest, loadChangelog } from './manifest-loader';
import { diffPermissions, hasPermission } from './permissions';
import type { SourceState, SourceManifest, SourcePermission, SourceEndpoint } from './types';

export interface ManifestUpdateResult {
	newVersion: string;
	oldVersion: string;
	addedPermissions: SourcePermission[];
	removedPermissions: SourcePermission[];
	addedEndpoints: Record<string, SourceEndpoint>;
	removedEndpoints: string[];
	modifiedEndpoints: Record<string, { old: SourceEndpoint; new: SourceEndpoint }>;
	changelog: string | null;
	requiresReapproval: boolean;
	newManifest: SourceManifest;
}

export const sourceRegistry = {
	get activeSources(): SourceState[] {
		return sourceStorage.sources.filter((s) => s.enabled);
	},

	getSourcesWithPermission(permissionId: string, target?: string): SourceState[] {
		return sourceRegistry.activeSources.filter((s) => hasPermission(s, permissionId, target));
	},

	/**
	 * Загружает манифест и добавляет источник в реестр (в отключенном состоянии).
	 * UI должен показать ревью пермиссий, затем вызвать updatePermissions и toggleSource(true).
	 * Если пользователь отменяет добавление, UI должен вызвать removeSource.
	 */
	async addSource(manifestUrl: string, isBuiltin = false): Promise<SourceManifest> {
		const existingByUrl = sourceStorage.sources.find((s) => s.manifestUrl === manifestUrl);
		if (existingByUrl) {
			throw new Error('Источник с таким URL уже добавлен');
		}

		const manifest = await loadManifest(manifestUrl, isBuiltin);

		const existingById = sourceStorage.sources.find((s) => s.manifest.id === manifest.id);
		if (existingById) {
			throw new Error(`Источник с ID '${manifest.id}' уже существует`);
		}

		const newState: SourceState = {
			manifestUrl,
			manifest,
			enabled: false,
			grantedPermissions: [],
			addedAt: Date.now(),
			lastUpdated: Date.now(),
			isBuiltin
		};

		sourceStorage.sources = [...sourceStorage.sources, newState];

		return manifest;
	},

	/**
	 * Удаляет источник из реестра. Встроенные источники (builtin) можно только отключить.
	 */
	removeSource(sourceId: string): void {
		const source = sourceStorage.sources.find((s) => s.manifest.id === sourceId);
		if (!source) return;

		if (source.isBuiltin) {
			sourceRegistry.toggleSource(sourceId, false);
			return;
		}

		sourceStorage.sources = sourceStorage.sources.filter((s) => s.manifest.id !== sourceId);
	},

	/**
	 * Загружает обновление манифеста и вычисляет разницу.
	 * Не применяет обновление автоматически. UI должен показать diff и вызвать applyUpdate.
	 */
	async refreshManifest(sourceId: string): Promise<ManifestUpdateResult> {
		const source = sourceStorage.sources.find((s) => s.manifest.id === sourceId);
		if (!source) {
			throw new Error(`Источник '${sourceId}' не найден`);
		}

		const newManifest = await loadManifest(source.manifestUrl, source.isBuiltin);

		if (newManifest.id !== sourceId) {
			throw new Error('ID манифеста изменился, что недопустимо при обновлении');
		}

		const oldManifest = source.manifest;
		const permDiff = diffPermissions(oldManifest, newManifest);

		const oldEndpoints = oldManifest.endpoints || {};
		const newEndpoints = newManifest.endpoints || {};

		const addedEndpoints: Record<string, SourceEndpoint> = {};
		const removedEndpoints: string[] = [];
		const modifiedEndpoints: Record<string, { old: SourceEndpoint; new: SourceEndpoint }> = {};

		for (const key of Object.keys(newEndpoints)) {
			if (!oldEndpoints[key]) {
				addedEndpoints[key] = newEndpoints[key];
			} else if (JSON.stringify(oldEndpoints[key]) !== JSON.stringify(newEndpoints[key])) {
				modifiedEndpoints[key] = { old: oldEndpoints[key], new: newEndpoints[key] };
			}
		}

		for (const key of Object.keys(oldEndpoints)) {
			if (!newEndpoints[key]) {
				removedEndpoints.push(key);
			}
		}

		const changelog = await loadChangelog(source.manifestUrl);

		return {
			newVersion: newManifest.version,
			oldVersion: oldManifest.version,
			addedPermissions: permDiff.added,
			removedPermissions: permDiff.removed,
			addedEndpoints,
			removedEndpoints,
			modifiedEndpoints,
			changelog,
			requiresReapproval: permDiff.requiresReapproval,
			newManifest
		};
	},

	/**
	 * Применяет обновление манифеста после ревью пользователя.
	 */
	applyUpdate(sourceId: string, updateResult: ManifestUpdateResult, grantedPermissions: string[]): void {
		sourceStorage.sources = sourceStorage.sources.map((s) => {
			if (s.manifest.id === sourceId) {
				return {
					...s,
					manifest: updateResult.newManifest,
					grantedPermissions,
					lastUpdated: Date.now()
				};
			}
			return s;
		});
	},

	toggleSource(sourceId: string, enabled: boolean): void {
		sourceStorage.sources = sourceStorage.sources.map((s) => {
			if (s.manifest.id === sourceId) {
				return { ...s, enabled };
			}
			return s;
		});
	},

	updatePermissions(sourceId: string, grantedPermissions: string[]): void {
		sourceStorage.sources = sourceStorage.sources.map((s) => {
			if (s.manifest.id === sourceId) {
				return { ...s, grantedPermissions };
			}
			return s;
		});
	},

	async authenticate(sourceId: string): Promise<void> {
		console.warn(`authenticate(${sourceId}) is not fully implemented yet`);
	},

	revokeAuth(sourceId: string): void {
		sourceStorage.setToken(sourceId, undefined);
	}
};
