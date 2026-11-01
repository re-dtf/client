import type { SettingField, ThemeManifest } from './types';

// Манифесты маленькие, поэтому грузятся сразу. Компоненты и стили тем грузятся лениво.
const modules = import.meta.glob<{ default: ThemeManifest }>('./*/theme.ts', { eager: true });

const byId = new Map<string, ThemeManifest>(Object.values(modules).map((m) => [m.default.id, m.default]));

/** Все темы приложения */
export const themes: ThemeManifest[] = [...byId.values()];

export function getTheme(id: string): ThemeManifest | undefined {
	return byId.get(id);
}

/**
 * Тема и все её основы, от самой темы к основе: ['my-fork', 'dtf2022'].
 * `all` нужен только тестам.
 */
export function themeChain(id: string, all: Map<string, ThemeManifest> = byId): string[] {
	const chain: string[] = [];
	let current: string | undefined = id;

	while (current !== undefined) {
		if (chain.includes(current)) {
			console.error(`[themes] Тема "${current}" наследуется сама от себя: ${[...chain, current].join(' → ')}`);
			break;
		}
		chain.push(current);
		const parent: string | undefined = all.get(current)?.extends;
		if (parent !== undefined && !all.has(parent)) {
			console.error(`[themes] Тема "${current}" наследуется от несуществующей "${parent}"`);
			break;
		}
		current = parent;
	}

	return chain;
}

/** Настройки темы вместе с настройками её основ. Поле форка с тем же key заменяет поле основы. */
export function themeSettingsSchema(id: string, all: Map<string, ThemeManifest> = byId): SettingField[] {
	const fields = new Map<string, SettingField>();
	for (const themeId of themeChain(id, all).reverse()) {
		for (const field of all.get(themeId)?.settings ?? []) {
			fields.set(field.key, field);
		}
	}
	return [...fields.values()];
}

// Стили темы лежат в <тема>/theme.css и тоже грузятся лениво
const styles = import.meta.glob('./*/theme.css');

/** Подключает стили темы и её основ. Основа идёт первой, чтобы форк мог переопределять её стили. */
export async function loadThemeStyles(chain: string[]): Promise<void> {
	for (const id of [...chain].reverse()) {
		await styles[`./${id}/theme.css`]?.();
	}
}
