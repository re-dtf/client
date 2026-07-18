import type { SourceManifest, SourcePermission, SourceState } from './types';

/**
 * Возвращает полный список разрешений манифеста, включая неявные разрешения,
 * такие как 'auth:bio_write' для метода авторизации 'bio_verification'.
 */
export function getManifestPermissions(manifest: SourceManifest): SourcePermission[] {
	const perms = manifest.permissions ? [...manifest.permissions] : [];
	if (manifest.auth?.type === 'bio_verification') {
		const hasBioWrite = perms.some((p) => p.id === 'auth:bio_write');
		if (!hasBioWrite) {
			perms.push({
				id: 'auth:bio_write',
				description: 'Временная запись проверочного кода в описание профиля DTF',
				required: true
			});
		}
	}
	return perms;
}

/**
 * Проверяет, есть ли у источника подтвержденное разрешение.
 * Вызывается фасадом перед выполнением write/mutate операций.
 */
export function hasPermission(source: SourceState, permissionId: string, target?: string): boolean {
	if (!source.enabled) {
		return false;
	}

	if (!source.grantedPermissions.includes(permissionId)) {
		return false;
	}

	const permissions = getManifestPermissions(source.manifest);

	const found = permissions.find((p) => {
		if (p.id !== permissionId) return false;
		if (p.target !== undefined) {
			// Если разрешение ограничено конкретным таргетом, вызывающий обязан передать его
			return target === p.target;
		}
		// Если разрешение глобальное, оно подходит под любой target (или его отсутствие)
		return true;
	});

	return !!found;
}

export interface PermissionsDiff {
	added: SourcePermission[];
	removed: SourcePermission[];
	requiresReapproval: boolean;
}

/**
 * Сравнивает разрешения старого и нового манифестов.
 * Используется при обновлении для определения необходимости повторного подтверждения разрешений.
 */
export function diffPermissions(oldManifest: SourceManifest, newManifest: SourceManifest): PermissionsDiff {
	const oldList = getManifestPermissions(oldManifest);
	const newList = getManifestPermissions(newManifest);

	const added: SourcePermission[] = [];
	const removed: SourcePermission[] = [];

	// Находим добавленные разрешения
	for (const newPerm of newList) {
		const exists = oldList.some((oldPerm) => oldPerm.id === newPerm.id && oldPerm.target === newPerm.target);
		if (!exists) {
			added.push(newPerm);
		}
	}

	// Находим удаленные разрешения
	for (const oldPerm of oldList) {
		const exists = newList.some((newPerm) => newPerm.id === oldPerm.id && newPerm.target === oldPerm.target);
		if (!exists) {
			removed.push(oldPerm);
		}
	}

	return {
		added,
		removed,
		requiresReapproval: added.length > 0
	};
}
