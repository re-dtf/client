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
export function persistedState<T>(key: string, defaults: T, version = 1) {
	// localStorage может быть недоступен (приватный режим, запрет cookies)
	const storage = (): Storage | null => {
		try {
			return globalThis.localStorage ?? null;
		} catch {
			return null;
		}
	};

	const isObject = (x: unknown): x is Record<string, unknown> =>
		typeof x === 'object' && x !== null && !Array.isArray(x);

	// Читает сохранённое значение. В localStorage лежит { v: версия, d: данные }.
	// Если версия не совпала (формат поменяли) или JSON битый, берём значение по умолчанию.
	function read(): T {
		const raw = storage()?.getItem(key);
		if (raw == null) return defaults;
		try {
			const saved = JSON.parse(raw);
			if (saved?.v !== version) return defaults;
			// Поля, которые добавили в defaults позже, не пропадают
			return isObject(defaults) && isObject(saved.d) ? ({ ...defaults, ...saved.d } as T) : saved.d;
		} catch (e) {
			console.error(`[storage] Не удалось прочитать "${key}":`, e);
			return defaults;
		}
	}

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
		/** Только для объектов: заменить часть полей */
		patch(part: Partial<T>) {
			this.value = { ...value, ...part };
		}
	};
}
