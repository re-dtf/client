import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	openDtfUrl: vi.fn(),
	openDtfLink: vi.fn(),
	closeOverlay: vi.fn()
}));

vi.mock('$lib/navigation', () => ({
	openDtfUrl: mocks.openDtfUrl,
	openDtfLink: mocks.openDtfLink,
	closeOverlay: mocks.closeOverlay
}));

import { isNative, openExternalUrl, updateStatusBar, hideSplashScreen, notifyAppReady, initCapacitor, handleAppUrl, handleNativeLinkClick } from './index';

describe('Capacitor bridge', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		mocks.openDtfUrl.mockReset();
		mocks.openDtfLink.mockReset();
		mocks.closeOverlay.mockReset();
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

	describe('handleAppUrl', () => {
		it.each(['https://dtf.ru/games/111111-test', 'https://dtf.ru/donatovnet'])('открывает %s через openDtfUrl', async (url) => {
			mocks.openDtfUrl.mockReturnValue(true);

			const result = await handleAppUrl(url);

			expect(mocks.openDtfUrl).toHaveBeenCalledWith(url);
			expect(result).toBe(true);
		});

		it('для неподдерживаемых страниц dtf.ru открывает системный браузер', async () => {
			mocks.openDtfUrl.mockReturnValue(false);
			const openMock = vi.fn();
			vi.stubGlobal('window', { open: openMock });

			const result = await handleAppUrl('https://dtf.ru/rules');

			expect(mocks.openDtfUrl).toHaveBeenCalledWith('https://dtf.ru/rules');
			expect(openMock).toHaveBeenCalledWith('https://dtf.ru/rules', '_blank', 'noopener,noreferrer');
			expect(result).toBe(true);
		});

		it('игнорирует посторонние URL не от dtf.ru', async () => {
			mocks.openDtfUrl.mockReturnValue(false);

			const result = await handleAppUrl('https://google.com/search');

			expect(mocks.openDtfUrl).not.toHaveBeenCalled();
			expect(result).toBe(false);
		});

		it('дедуплицирует повторные вызовы одного и того же URL при одновременных событиях', async () => {
			mocks.openDtfUrl.mockReturnValue(true);

			const first = await handleAppUrl('https://dtf.ru/games/222222-dedup');
			const second = await handleAppUrl('https://dtf.ru/games/222222-dedup');

			expect(first).toBe(true);
			expect(second).toBe(true);
			expect(mocks.openDtfUrl).toHaveBeenCalledTimes(1);
		});
	});

	describe('handleNativeLinkClick', () => {
		it.each(['https://dtf.ru/games/333333', 'https://dtf.ru/donatovnet'])('перехватывает клик по %s через openDtfLink', (url) => {
			mocks.openDtfLink.mockReturnValue(true);

			const anchor = {
				closest: (selector: string) => (selector === 'a' ? anchor : null),
				getAttribute: (attr: string) => (attr === 'href' ? url : null)
			};

			const event = {
				defaultPrevented: false,
				button: 0,
				target: anchor,
				preventDefault: vi.fn()
			} as unknown as MouseEvent;

			handleNativeLinkClick(event);

			expect(mocks.openDtfLink).toHaveBeenCalledWith(event, url);
			expect(event.preventDefault).not.toHaveBeenCalled();
		});

		it('перехватывает внешние ссылки и открывает через openExternalUrl', () => {
			mocks.openDtfLink.mockReturnValue(false);
			const openMock = vi.fn();
			vi.stubGlobal('window', { open: openMock, location: { origin: 'https://localhost' } });

			const anchor = {
				closest: (selector: string) => (selector === 'a' ? anchor : null),
				getAttribute: (attr: string) => (attr === 'href' ? 'https://github.com/re-dtf' : null)
			};

			const preventDefault = vi.fn();
			const event = {
				defaultPrevented: false,
				button: 0,
				target: anchor,
				preventDefault
			} as unknown as MouseEvent;

			handleNativeLinkClick(event);

			expect(preventDefault).toHaveBeenCalled();
			expect(openMock).toHaveBeenCalledWith('https://github.com/re-dtf', '_blank', 'noopener,noreferrer');
		});

		it('не перехватывает ссылки с атрибутом download', () => {
			mocks.openDtfLink.mockReturnValue(false);
			const openMock = vi.fn();
			vi.stubGlobal('window', { open: openMock });

			const anchor = {
				closest: (selector: string) => (selector === 'a' ? anchor : null),
				getAttribute: (attr: string) => (attr === 'href' ? 'https://leonardo.osnova.io/test.jpg' : null),
				hasAttribute: (attr: string) => attr === 'download'
			};

			const preventDefault = vi.fn();
			const event = {
				defaultPrevented: false,
				button: 0,
				target: anchor,
				preventDefault
			} as unknown as MouseEvent;

			handleNativeLinkClick(event);

			expect(preventDefault).not.toHaveBeenCalled();
			expect(openMock).not.toHaveBeenCalled();
		});
	});
});
