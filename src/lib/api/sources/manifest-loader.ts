import { isSourceManifest, type SourceManifest } from './types';

/**
 * Валидирует структуру манифеста источника данных.
 * Использует строгий Type Guard из types.ts.
 */
export function validateManifest(data: unknown, isBuiltin = false): data is SourceManifest {
	return isSourceManifest(data, isBuiltin);
}

/**
 * Преобразует сокращенную запись GitHub-ссылки (github:user/repo) в прямой raw-URL.
 * Поддерживаемые форматы:
 * - github:user/repo -> https://raw.githubusercontent.com/user/repo/main/redtf-source.json
 * - github:user/repo/branch -> https://raw.githubusercontent.com/user/repo/branch/redtf-source.json
 * - github:user/repo/branch/path/to/file.json -> https://raw.githubusercontent.com/user/repo/branch/path/to/file.json
 */
export function resolveGitHubUrl(shortUrl: string): string {
	const trimmed = shortUrl.trim();
	if (!trimmed.toLowerCase().startsWith('github:')) {
		throw new Error('Invalid GitHub shorthand URL format');
	}

	const path = trimmed.slice(7); // Убираем 'github:'
	const segments = path.split('/').filter(Boolean);
	if (segments.length < 2) {
		throw new Error('GitHub shorthand must contain at least user and repository');
	}

	const [user, repo] = segments;
	const branch = segments[2] || 'main';
	const filePath = segments.slice(3).join('/') || 'redtf-source.json';

	return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
}

/**
 * Вспомогательная функция для проверки безопасности URL.
 * Допускает https:// протокол, а также http://localhost для локальной разработки.
 */
function isSecureUrl(urlStr: string): boolean {
	try {
		const parsed = new URL(urlStr);
		return parsed.protocol === 'https:' ||
			(parsed.protocol === 'http:' &&
			(parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]'));
	} catch {
		return false;
	}
}

/**
 * Загружает и валидирует манифест по указанному URL (или shorthand).
 */
export async function loadManifest(url: string, isBuiltin = false): Promise<SourceManifest> {
	const trimmedUrl = url.trim();
	const resolvedUrl = trimmedUrl.toLowerCase().startsWith('github:')
		? resolveGitHubUrl(trimmedUrl)
		: trimmedUrl;

	if (!isSecureUrl(resolvedUrl)) {
		throw new Error('Insecure protocol: manifest URL must use HTTPS (except for localhost)');
	}

	const response = await fetch(resolvedUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
	}

	let data;
	try {
		data = await response.json();
	} catch (e) {
		throw new Error(`Failed to parse manifest JSON: ${e instanceof Error ? e.message : String(e)}`);
	}

	if (!validateManifest(data, isBuiltin)) {
		throw new Error('Invalid manifest structure or validation failed');
	}

	return data;
}

/**
 * Загружает CHANGELOG.md из того же репозитория/папки, где находится манифест.
 * Возвращает null в случае отсутствия файла или ошибки загрузки.
 */
export async function loadChangelog(manifestUrl: string): Promise<string | null> {
	try {
		const trimmedUrl = manifestUrl.trim();
		const resolvedUrl = trimmedUrl.toLowerCase().startsWith('github:')
			? resolveGitHubUrl(trimmedUrl)
			: trimmedUrl;

		if (!isSecureUrl(resolvedUrl)) {
			return null;
		}

		const parsedUrl = new URL(resolvedUrl);
		const pathParts = parsedUrl.pathname.split('/');
		pathParts[pathParts.length - 1] = 'CHANGELOG.md';
		parsedUrl.pathname = pathParts.join('/');
		const changelogUrl = parsedUrl.href;

		const response = await fetch(changelogUrl);
		if (!response.ok) {
			return null;
		}

		return await response.text();
	} catch {
		return null;
	}
}
