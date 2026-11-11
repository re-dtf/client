export interface Supporter {
	name: string;
	amount?: string | number;
	comment?: string;
	link?: string;
}

export interface SupportersPayload {
	updatedAt?: string;
	description?: string;
	supporters: Supporter[];
}

export const SUPPORTERS_URLS = [
	'https://raw.githubusercontent.com/re-dtf/data/main/supporters.json',
	'https://cdn.jsdelivr.net/gh/re-dtf/data@main/supporters.json'
];

let memoryCache: SupportersPayload | null = null;

export function formatAmount(value?: string | number): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'number') {
		return `${value.toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽`;
	}
	const trimmed = value.trim();
	if (/^\d+$/.test(trimmed)) {
		return `${Number(trimmed).toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽`;
	}
	return trimmed;
}

export function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		// Очистка однострочных комментариев и висячих запятых перед } или ]
		const relaxed = text
			.replace(/\/\/[^\n\r]*/g, '')
			.replace(/,\s*([\]}])/g, '$1');
		return JSON.parse(relaxed);
	}
}

export function normalizeSupportersData(raw: unknown): SupportersPayload {
	if (!raw || typeof raw !== 'object') {
		return { supporters: [] };
	}

	if (Array.isArray(raw)) {
		return { supporters: parseSupportersList(raw) };
	}

	const obj = raw as Record<string, unknown>;

	if (Array.isArray(obj.supporters)) {
		return {
			updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
			description: typeof obj.description === 'string' ? obj.description : undefined,
			supporters: parseSupportersList(obj.supporters)
		};
	}

	// Словарь "ник: сумма"
	const supporters: Supporter[] = [];
	for (const [key, val] of Object.entries(obj)) {
		if (key === 'updatedAt' || key === 'description') continue;
		if (typeof val === 'string' || typeof val === 'number') {
			supporters.push({ name: key, amount: formatAmount(val) });
		} else if (val && typeof val === 'object') {
			const itemObj = val as Record<string, unknown>;
			supporters.push({
				name: typeof itemObj.name === 'string' && itemObj.name ? itemObj.name : key,
				amount: formatAmount(itemObj.amount as string | number | undefined),
				comment: typeof itemObj.comment === 'string' ? itemObj.comment : undefined,
				link: typeof itemObj.link === 'string' ? itemObj.link : undefined
			});
		}
	}

	return {
		updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
		description: typeof obj.description === 'string' ? obj.description : undefined,
		supporters
	};
}

function parseSupportersList(list: unknown[]): Supporter[] {
	const result: Supporter[] = [];
	for (const item of list) {
		if (!item) continue;
		if (typeof item === 'string') {
			const name = item.trim();
			if (name) result.push({ name });
		} else if (typeof item === 'object') {
			const obj = item as Record<string, unknown>;
			const name = typeof obj.name === 'string' ? obj.name.trim() : '';
			if (!name) continue;
			result.push({
				name,
				amount: formatAmount(obj.amount as string | number | undefined),
				comment: typeof obj.comment === 'string' ? obj.comment.trim() : undefined,
				link: typeof obj.link === 'string' ? obj.link.trim() : undefined
			});
		}
	}
	return result;
}

export function resetSupportersMemoryCache(): void {
	memoryCache = null;
}

/**
 * Загрузка списка спонсоров с GitHub с перебором зеркал и сохранением в памяти сессии.
 */
export async function fetchSupportersFromNetwork(force = false): Promise<SupportersPayload> {
	if (!force && memoryCache) {
		return memoryCache;
	}

	let lastError: unknown = null;

	for (const baseUrl of SUPPORTERS_URLS) {
		try {
			const url = force ? `${baseUrl}?t=${Date.now()}` : baseUrl;
			const res = await fetch(url, {
				headers: { Accept: 'application/json' },
				signal: AbortSignal.timeout(8000)
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			}
			const text = await res.text();
			const json = safeJsonParse(text);
			const normalized = normalizeSupportersData(json);
			memoryCache = normalized;
			return normalized;
		} catch (err) {
			lastError = err;
		}
	}

	throw lastError ?? new Error('Не удалось загрузить список спонсоров');
}
