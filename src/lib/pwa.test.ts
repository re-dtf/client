import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pwa } from './pwa.svelte';

describe('pwa manager', () => {
	beforeEach(() => {
		pwa.needRefresh = false;
		pwa.offlineReady = false;
		pwa.newVersion = null;
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

		expect(html).toContain('<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f2f2" />');
		expect(html).toContain('<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141414" />');
	});
});
