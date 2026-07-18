import { resolveSourceUrl } from './types';
import type { SourceState } from './types';
import { sourceStorage } from '$lib/storage/sources.svelte';

/**
 * Выполняет запрос к эндпоинту источника.
 * - Подставляет auth заголовок (если есть)
 * - Резолвит шаблоны в path: {postId} → 12345
 * - Добавляет defaultHeaders из манифеста
 * - НЕ проверяет пермиссии (это делает фасад/registry для write-операций)
 *
 * Подготовлен для будущего responseMapping:
 * если manifest.responseMapping !== null, здесь будет вызываться
 * трансформация ответа. Сейчас просто возвращает response.json().
 */
export async function fetchFromSource<T>(
	source: SourceState,
	endpointKey: string,
	pathParams?: Record<string, string | number>,
	queryOverrides?: Record<string, string>,
	body?: unknown
): Promise<T> {
	const endpoint = source.manifest.endpoints[endpointKey];
	if (!endpoint) {
		throw new Error(`Endpoint '${endpointKey}' not found in source '${source.manifest.id}'`);
	}

	// 1. Resolve path params
	let path = endpoint.path;
	if (pathParams) {
		for (const [key, value] of Object.entries(pathParams)) {
			path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
		}
	}

	const urlObj = new URL(resolveSourceUrl(source.manifest.api.baseUrl, path));

	// 2. Add query params from endpoint definition
	const usedOverrides = new Set<string>();

	if (endpoint.params) {
		for (const [key, valueTemplate] of Object.entries(endpoint.params)) {
			let finalValue = valueTemplate;
			
			// Check if valueTemplate is a template, e.g., "{cursor}"
			if (valueTemplate.startsWith('{') && valueTemplate.endsWith('}')) {
				const paramName = valueTemplate.slice(1, -1);
				if (queryOverrides && queryOverrides[paramName] !== undefined) {
					finalValue = queryOverrides[paramName];
					usedOverrides.add(paramName);
				} else {
					// if no override provided for this template, skip this param
					continue;
				}
			}
			
			urlObj.searchParams.append(key, finalValue);
		}
	}

	// Append any remaining query overrides
	if (queryOverrides) {
		for (const [key, value] of Object.entries(queryOverrides)) {
			if (!usedOverrides.has(key)) {
				urlObj.searchParams.append(key, value);
			}
		}
	}

	// 3. Setup headers
	const headers = new Headers(source.manifest.api.defaultHeaders || {});

	// Add auth header if token exists
	const token = sourceStorage.getToken(source.manifest.id);
	if (token) {
		const auth = source.manifest.auth;
		if (auth.type === 'bio_verification' && auth.bioVerification) {
			const prefix = auth.bioVerification.tokenPrefix ?? '';
			headers.set(auth.bioVerification.tokenHeader, `${prefix}${token}`);
		} else if (auth.type === 'token_header' && auth.tokenHeader) {
			headers.set(auth.tokenHeader.headerName, token);
		} else if (auth.type === 'oauth2_pkce' && auth.oauth2) {
			const prefix = auth.oauth2.tokenPrefix ?? '';
			headers.set(auth.oauth2.tokenHeader, `${prefix}${token}`);
		}
	}

	const init: RequestInit = {
		method: endpoint.method,
		headers
	};

	// Add body for POST/PUT/PATCH
	if (body !== undefined && endpoint.method !== 'GET') {
		init.body = JSON.stringify(body);
		if (!headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json');
		}
	}

	// 4. Setup timeout (3 seconds)
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 3000);
	init.signal = controller.signal;

	try {
		const response = await fetch(urlObj.toString(), init);

		if (response.status === 401) {
			console.warn(`[reDTF] Source '${source.manifest.id}' returned 401 Unauthorized. Clearing auth token.`);
			sourceStorage.setToken(source.manifest.id, undefined);
			throw new Error('Unauthorized');
		}

		if (!response.ok) {
			throw new Error(`Source '${source.manifest.id}' returned ${response.status} ${response.statusText}`);
		}

		// Placeholder for future responseMapping
		if (source.manifest.responseMapping !== null) {
			// v2 mapping logic would go here
		}

		const text = await response.text();
		if (!text) {
			return {} as T;
		}
		return JSON.parse(text) as T;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			console.warn(`[reDTF] Request to source '${source.manifest.id}' timed out.`);
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}
