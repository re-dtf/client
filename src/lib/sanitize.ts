import DOMPurify from 'dompurify';

const cache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

/** Санитизация HTML через DOMPurify с LRU-кэшированием результата */
export function sanitizeHtml(html: string): string {
	if (!html) return '';
	const cached = cache.get(html);
	if (cached !== undefined) return cached;

	const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
	if (cache.size >= MAX_CACHE_SIZE) {
		const firstKey = cache.keys().next().value;
		if (firstKey !== undefined) cache.delete(firstKey);
	}
	cache.set(html, sanitized);
	return sanitized;
}
