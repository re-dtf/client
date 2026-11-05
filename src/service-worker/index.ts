/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';
import { resolve } from '$app/paths';

declare const self: ServiceWorkerGlobalScope;

const CACHE_SHELL = `redtf-shell-${version}`;
const CACHE_MEDIA = 'redtf-media-v1';
const MAX_MEDIA_ENTRIES = 120;

// Precache list: all immutable build chunks, static assets, prerendered routes, and the SPA index fallback
// Dynamic endpoints (/api/*, version.json) are excluded so update checks always go to the network
const precacheUrls = Array.from(
	new Set([
		resolve('/'),
		resolve('/index.html'),
		...immutable.map((f) => resolve(f.path)),
		...assets.map((f) => resolve(f.path)),
		...prerendered
			.filter((f) => !f.startsWith('/api/') && !f.endsWith('version.json'))
			.map((f) => resolve(f.path))
	])
);

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_SHELL);
			// Cache files individually so a single missing asset doesn't abort the whole install
			await Promise.allSettled(
				precacheUrls.map((url) =>
					cache.add(url).catch((err) => {
						console.warn(`[reDTF SW] Failed to precache ${url}:`, err);
					})
				)
			);
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys.map((key) => {
					if (key.startsWith('redtf-shell-') && key !== CACHE_SHELL) {
						return caches.delete(key);
					}
				})
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Ignore chrome extensions or non-http(s) schemes
	if (!url.protocol.startsWith('http')) return;

	// Bypass API routes completely — they must always hit network directly
	if (url.pathname.includes('/api/')) return;

	// 1. Navigation requests (loading SPA pages)
	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_SHELL);
				try {
					// Try network first for HTML navigations to get immediate updates if connected
					const preload = await event.preloadResponse;
					if (preload) return preload;

					const networkResponse = await fetch(request);
					if (networkResponse && networkResponse.status === 200) {
						return networkResponse;
					}
				} catch {
					// Network failed or offline - fall back to cached shell
				}

				// Fallback to exact path match, or /index.html fallback
				const cached =
					(await cache.match(url.pathname)) ||
					(await cache.match(resolve('/index.html'))) ||
					(await cache.match(resolve('/')));
				if (cached) return cached;

				return new Response('Offline: page unavailable', {
					status: 503,
					statusText: 'Service Unavailable',
					headers: { 'Content-Type': 'text/plain; charset=utf-8' }
				});
			})()
		);
		return;
	}

	// 2. Precached static shell & immutable assets
	const isShellAsset =
		url.origin === self.location.origin &&
		(url.pathname.includes('/_app/immutable/') || precacheUrls.includes(url.pathname));

	if (isShellAsset) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_SHELL);
				const cached = await cache.match(request);
				if (cached) return cached;

				const response = await fetch(request);
				if (response && response.status === 200 && request.cache !== 'no-store') {
					cache.put(request, response.clone()).catch(() => {});
				}
				return response;
			})()
		);
		return;
	}

	// 3. Media CDN caching (DTF / Osnova images and avatars)
	const isMediaCDN =
		url.hostname.includes('osnova.io') ||
		url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|mp4)$/i);

	if (isMediaCDN) {
		event.respondWith(
			(async () => {
				const mediaCache = await caches.open(CACHE_MEDIA);
				const cached = await mediaCache.match(request);
				if (cached) return cached;

				try {
					const response = await fetch(request);
					if (response && response.ok) {
						mediaCache.put(request, response.clone());
						trimCache(CACHE_MEDIA, MAX_MEDIA_ENTRIES);
					}
					return response;
				} catch (err) {
					if (cached) return cached;
					throw err;
				}
			})()
		);
		return;
	}
});

async function trimCache(cacheName: string, maxEntries: number) {
	try {
		const cache = await caches.open(cacheName);
		const keys = await cache.keys();
		if (keys.length > maxEntries) {
			const toDelete = keys.slice(0, keys.length - maxEntries);
			for (const key of toDelete) {
				await cache.delete(key);
			}
		}
	} catch {}
}
