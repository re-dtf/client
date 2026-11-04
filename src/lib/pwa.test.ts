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
});
