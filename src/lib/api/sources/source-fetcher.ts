import { resolveSourceUrl } from './types';
import type { SourceState } from './types';
import { sourceStorage } from '$lib/storage/sources.svelte';
import { applyResponseMapping, MAX_RESPONSE_BYTES } from './response-mapping';

/**
 * Выполняет запрос к эндпоинту источника.
 * - Подставляет auth заголовок (если есть)
 * - Резолвит шаблоны в path: {postId} → 12345
 * - Добавляет defaultHeaders из манифеста
 * - НЕ проверяет пермиссии (это делает фасад/registry для write-операций)
 * - Если у эндпоинта есть `mapping`, приводит ответ к формату reDTF (response-mapping.ts)
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

	// 4. Setup timeout (default 3 seconds, configurable up to 15 seconds)
	const timeoutMs = endpoint.timeoutMs && endpoint.timeoutMs > 0 ? endpoint.timeoutMs : 3000;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	init.signal = controller.signal;

	try {
		const response = await fetch(urlObj.toString(), init);

		if (response.status === 401) {
			console.warn(`[reDTF] Source '${source.manifest.id}' returned 401 Unauthorized. Clearing auth token.`);
			sourceStorage.setToken(source.manifest.id, undefined);
			throw new Error('Unauthorized');
		}

		const endpointMapping = endpoint.mapping;

		if (!response.ok) {
			if (endpointMapping?.emptyStatuses?.includes(response.status)) {
				return (endpointMapping.items !== undefined ? { items: [] } : {}) as T;
			}
			throw new Error(`Source '${source.manifest.id}' returned ${response.status} ${response.statusText}`);
		}

		// Check response size via Content-Length header if present
		const contentLengthHeader = response.headers?.get?.('content-length');
		if (contentLengthHeader) {
			const contentLength = parseInt(contentLengthHeader, 10);
			if (contentLength > MAX_RESPONSE_BYTES) {
				throw new Error(`Source '${source.manifest.id}' response exceeded size limit (${contentLength} bytes)`);
			}
		}

		const text = await response.text();
		if (!text) {
			return (endpointMapping?.items !== undefined ? { items: [] } : {}) as T;
		}

		if (text.length > MAX_RESPONSE_BYTES) {
			throw new Error(`Source '${source.manifest.id}' response exceeded size limit (${text.length} characters)`);
		}

		const parsed = JSON.parse(text);

		if (endpointMapping) {
			const expectedPostId = pathParams?.postId !== undefined ? Number(pathParams.postId) : undefined;
			return applyResponseMapping<T>(parsed, endpointMapping, expectedPostId);
		}

		return parsed as T;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			console.warn(`[reDTF] Request to source '${source.manifest.id}' timed out.`);
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}
