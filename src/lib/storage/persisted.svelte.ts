/**
 * Реактивное значение, которое хранится в localStorage.
 *
 * Ключ называется `redtf:<слой>:<имя>`, слои: settings, theme, secrets, data, cache
 * (см. docs/architecture/storage.md).
 *
 * Значение заменяется целиком, а не меняется "изнутри":
 *   store.value = новое;            // заменить
 *   store.patch({ поле: значение }); // заменить часть полей объекта
 */
import { untrack } from 'svelte';
import { readPersisted } from './readPersisted';

export function persistedState<T>(key: string, defaults: T, version = 1) {
	// localStorage может быть недоступен (приватный режим, запрет cookies)
	const storage = (): Storage | null => {
		try {
			return globalThis.localStorage ?? null;
		} catch {
			return null;
		}
	};

	const read = () => readPersisted(key, defaults, version);

	function write(next: T) {
		try {
			storage()?.setItem(key, JSON.stringify({ v: version, d: next }));
		} catch (e) {
			console.error(`[storage] Не удалось сохранить "${key}":`, e);
		}
	}

	let value = $state.raw<T>(read());

	// Значение изменили в другой вкладке — подхватываем
	globalThis.addEventListener?.('storage', (e: StorageEvent) => {
		if (e.storageArea === storage() && (e.key === key || e.key === null)) {
			value = read();
		}
	});

	return {
		get value() {
			return value;
		},
		set value(next: T) {
			value = next;
			write(next);
		},
		/** Только для объектов: заменить часть полей. Можно вызывать из $effect: текущее значение читается без подписки */
		patch(part: Partial<T>) {
			this.value = { ...untrack(() => value), ...part };
		}
	};
}
