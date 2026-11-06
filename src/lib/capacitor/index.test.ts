import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isNative, openExternalUrl, updateStatusBar, hideSplashScreen, notifyAppReady, initCapacitor } from './index';

describe('Capacitor bridge', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('корректно определяет отсутствие нативной платформы в тестовом окружении', () => {
		expect(isNative()).toBe(false);
	});

	it('безопасно выполняется без ошибок вне нативного контейнера', async () => {
		await expect(updateStatusBar(true)).resolves.toBeUndefined();
		await expect(hideSplashScreen()).resolves.toBeUndefined();
		await expect(notifyAppReady()).resolves.toBeUndefined();
		expect(() => initCapacitor()).not.toThrow();
	});

	it('openExternalUrl вызывает window.open при вызове в браузере', async () => {
		const openMock = vi.fn();
		vi.stubGlobal('window', { open: openMock });
		await openExternalUrl('https://dtf.ru');
		expect(openMock).toHaveBeenCalledWith('https://dtf.ru', '_blank', 'noopener,noreferrer');
	});
});
