import { CATALOG_URL } from './builtins';
import type { SourceState } from './types';

export interface CatalogSource {
	id: string;
	name: string;
	description: string;
	author: string;
	manifestUrl: string;
	/** Только https: каталог чужой, картинки по другим схемам не грузим */
	icon?: string;
	tags: string[];
	verified: boolean;
}

export interface Catalog {
	updatedAt: Date | null;
	sources: CatalogSource[];
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** Каталог приходит из сети: берём только то, что можно показать, остальное молча отбрасываем */
export function parseCatalog(data: unknown): Catalog {
	const raw = (data ?? {}) as { lastUpdated?: unknown; sources?: unknown };
	if (!Array.isArray(raw.sources)) throw new Error('Каталог имеет неверный формат');

	const sources: CatalogSource[] = [];
	for (const item of raw.sources) {
		if (!item || !isText(item.id) || !isText(item.name) || !isText(item.manifestUrl)) continue;
		sources.push({
			id: item.id,
			name: item.name,
			description: isText(item.description) ? item.description : '',
			author: isText(item.author) ? item.author : '',
			manifestUrl: item.manifestUrl,
			icon: isText(item.icon) && item.icon.startsWith('https://') ? item.icon : undefined,
			tags: Array.isArray(item.tags) ? item.tags.filter(isText) : [],
			verified: item.verified === true
		});
	}
	// Проверенные выше, дальше порядок каталога (sort стабилен)
	sources.sort((a, b) => Number(b.verified) - Number(a.verified));

	const updatedAt = isText(raw.lastUpdated) ? new Date(raw.lastUpdated) : null;
	return { updatedAt: updatedAt && !isNaN(updatedAt.getTime()) ? updatedAt : null, sources };
}

export async function fetchCatalog(): Promise<Catalog> {
	let response: Response;
	try {
		response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(5000) });
	} catch (e) {
		throw new Error(
			e instanceof DOMException && e.name === 'TimeoutError'
				? 'Каталог не ответил за 5 секунд'
				: 'Нет соединения с каталогом'
		);
	}
	if (!response.ok) throw new Error(`Не удалось загрузить каталог (статус ${response.status})`);
	return parseCatalog(await response.json().catch(() => null));
}

/** Все теги каталога без повторов, самые частые первыми */
export function catalogTags(sources: CatalogSource[]): string[] {
	const count = new Map<string, number>();
	for (const s of sources) for (const t of s.tags) count.set(t, (count.get(t) ?? 0) + 1);
	return [...count].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
}

/** Поиск по названию, описанию, автору и тегам плюс необязательный тег */
export function filterCatalog(sources: CatalogSource[], query: string, tag: string | null): CatalogSource[] {
	const q = query.trim().toLowerCase();
	return sources.filter((s) => {
		if (tag && !s.tags.includes(tag)) return false;
		if (!q) return true;
		return [s.name, s.description, s.author, ...s.tags].some((field) => field.toLowerCase().includes(q));
	});
}

export const isInstalled = (source: CatalogSource, installed: SourceState[]): boolean =>
	installed.some((s) => s.manifestUrl === source.manifestUrl || s.manifest.id === source.id);
