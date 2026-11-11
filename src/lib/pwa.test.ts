import { describe, it, expect, vi, beforeEach } from 'vitest';
import { version } from '$app/env';
import { pwa } from './pwa.svelte';

describe('pwa manager', () => {
	beforeEach(() => {
		pwa.needRefresh = false;
		pwa.offlineReady = false;
		pwa.newVersion = null;
		pwa.currentVersion = version;
	});

	it('начальные значения и dismiss сбрасывают состояние обновления', () => {
		expect(pwa.needRefresh).toBe(false);
		pwa.needRefresh = true;
		pwa.newVersion = '0.0.2';
		expect(pwa.needRefresh).toBe(true);

		pwa.dismiss();
		expect(pwa.needRefresh).toBe(false);
	});

	it('содержит текущую версию приложения', () => {
		expect(typeof pwa.currentVersion).toBe('string');
		expect(pwa.currentVersion.length).toBeGreaterThan(0);
	});

	it('статические веб-манифесты содержат тёмные theme_color и background_color', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const manifests = ['manifest.webmanifest', 'manifest-bluer.webmanifest', 'manifest-white.webmanifest'];

		for (const filename of manifests) {
			const filePath = path.resolve(__dirname, '../../static', filename);
			const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
			expect(content.theme_color).toBe('#141414');
			expect(content.background_color).toBe('#141414');
		}
	});

	it('app.html содержит media-queries для theme-color', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const appHtmlPath = path.resolve(__dirname, '../app.html');
		const html = fs.readFileSync(appHtmlPath, 'utf-8');

		expect(html).toContain('<meta name="theme-color" media="(prefers-color-scheme: light)" content="#D9F5FF" />');
		expect(html).toContain('<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#202022" />');
	});

	it('service-worker не прекэширует /api/version.json и пропускает запросы к /api/', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const swPath = path.resolve(__dirname, '../service-worker/index.ts');
		const swCode = fs.readFileSync(swPath, 'utf-8');

		expect(swCode).toContain("!f.path.includes('api/')");
		expect(swCode).toContain("!f.path.includes('version.json')");
		expect(swCode).toContain("url.pathname.includes('/api/')");
	});

	it('корректно фильтрует prerendered объекты с полем path', () => {
		const prerendered = [
			{ path: '/api/version.json' },
			{ path: 'version.json' },
			{ path: 'index.html' },
			{ path: '/about' }
		];
		const filtered = prerendered.filter(
			(f) => !f.path.includes('api/') && !f.path.includes('version.json') && !f.path.endsWith('index.html')
		);
		expect(filtered).toEqual([{ path: '/about' }]);
	});

	it('service-worker использует cache-first для навигации для защиты от несанкционированного обновления', async () => {
		const fs = await import('fs');
		const path = await import('path');
		const swPath = path.resolve(__dirname, '../service-worker/index.ts');
		const swCode = fs.readFileSync(swPath, 'utf-8');

		expect(swCode).toContain("request.mode === 'navigate'");
		// Убеждаемся, что cached извлекается до fetch(request)
		const navigateIndex = swCode.indexOf("request.mode === 'navigate'");
		const cachedMatchIndex = swCode.indexOf('await cache.match', navigateIndex);
		const networkFetchIndex = swCode.indexOf('fetch(request)', cachedMatchIndex);
		expect(cachedMatchIndex).toBeGreaterThan(navigateIndex);
		expect(networkFetchIndex).toBeGreaterThan(cachedMatchIndex);
	});

	it('формирует правильную ссылку на изменения на GitHub', () => {
		pwa.newVersion = null;
		expect(pwa.changesUrl).toBe('https://github.com/re-dtf/client/commits/dev');

		pwa.currentVersion = '0.1.0-alpha.6';
		pwa.newVersion = '1.0.0-alpha.1';
		expect(pwa.changesUrl).toBe('https://github.com/re-dtf/client/compare/v0.1.0-alpha.6...v1.0.0-alpha.1');

		pwa.currentVersion = 'v0.1.0-alpha.6';
		pwa.newVersion = 'v1.0.0-alpha.1';
		expect(pwa.changesUrl).toBe('https://github.com/re-dtf/client/compare/v0.1.0-alpha.6...v1.0.0-alpha.1');

		pwa.currentVersion = '0.1.0';
		pwa.newVersion = '0.2.0';
		expect(pwa.changesUrl).toBe('https://github.com/re-dtf/client/compare/v0.1.0...v0.2.0');

		pwa.currentVersion = '0.0.1-abc1234';
		pwa.newVersion = '0.0.1-def5678';
		expect(pwa.changesUrl).toBe('https://github.com/re-dtf/client/compare/abc1234...def5678');

		pwa.currentVersion = '0.0.1-dev';
		pwa.newVersion = '0.0.1-abc1234';
		expect(pwa.changesUrl).toBe('https://github.com/re-dtf/client/compare/dev...abc1234');

		pwa.currentVersion = '1.0.0-alpha.1';
		pwa.newVersion = '1.0.0-alpha.1';
		expect(pwa.changesUrl).toBe('https://github.com/re-dtf/client/releases/tag/v1.0.0-alpha.1');
	});
});
