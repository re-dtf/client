/** Чтение persistedState доступно и синхронному запуску до загрузки Svelte. */
export function readPersisted<T>(
	key: string,
	defaults: T,
	version = 1,
	migrate?: (saved: unknown, oldVersion: number) => T
): T {
	try {
		const raw = globalThis.localStorage?.getItem(key);
		if (!raw) return defaults;
		const saved = JSON.parse(raw);
		if (saved?.v !== version) {
			if (migrate && saved && typeof saved.v === 'number') {
				try {
					return migrate(saved.d, saved.v);
				} catch (e) {
					console.error(`[storage] Ошибка миграции "${key}" с v${saved.v} на v${version}:`, e);
					return defaults;
				}
			}
			return defaults;
		}
		const isObject = (value: unknown): value is Record<string, unknown> =>
			typeof value === 'object' && value !== null && !Array.isArray(value);
		if (isObject(defaults)) return isObject(saved.d) ? { ...defaults, ...saved.d } as T : defaults;
		return saved.d;
	} catch {
		return defaults;
	}
}
