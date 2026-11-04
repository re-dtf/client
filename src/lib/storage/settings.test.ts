import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
	const data: Record<string, string> = {};
	Object.defineProperty(globalThis, 'localStorage', {
		value: {
			getItem: (key: string) => data[key] ?? null,
			setItem: (key: string, value: string) => {
				data[key] = String(value);
			},
			removeItem: (key: string) => {
				delete data[key];
			},
			clear: () => {
				for (const key in data) delete data[key];
			}
		},
		writable: true
	});
});

import { settings, shouldVirtualizeComments } from './settings.svelte';

describe('settings & shouldVirtualizeComments', () => {
	beforeEach(() => {
		localStorage.clear();
		settings.value = {
			theme: 'dtf2022',
			colorScheme: 'auto',
			proxyUrl: '',
			commentNesting: 'flatten',
			collectStats: true,
			haptics: true,
			disableMobileTopBar: false,
			commentVirtualization: 'auto',
		};
	});

	it('colorScheme по умолчанию "auto"', () => {
		expect(settings.value.colorScheme).toBe('auto');
	});

	it('patch обновляет значение colorScheme и сохраняет в localStorage', () => {
		settings.patch({ colorScheme: 'dark' });
		expect(settings.value.colorScheme).toBe('dark');

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.colorScheme).toBe('dark');
	});

	it('disableMobileTopBar по умолчанию выключен (false)', () => {
		expect(settings.value.disableMobileTopBar).toBe(false);
	});

	it('patch обновляет значение disableMobileTopBar и сохраняет в localStorage', () => {
		settings.patch({ disableMobileTopBar: true });
		expect(settings.value.disableMobileTopBar).toBe(true);

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.disableMobileTopBar).toBe(true);
	});

	it('по умолчанию commentVirtualization равен "auto"', () => {
		expect(settings.value.commentVirtualization).toBe('auto');
	});

	it('принудительно enabled всегда возвращает true', () => {
		expect(shouldVirtualizeComments('enabled')).toBe(true);
	});

	it('принудительно disabled всегда возвращает false', () => {
		expect(shouldVirtualizeComments('disabled')).toBe(false);
	});

	it('в режиме auto отключает виртуализацию для Firefox', () => {
		const originalNavigator = globalThis.navigator;
		try {
			Object.defineProperty(globalThis, 'navigator', {
				value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0' },
				writable: true,
				configurable: true
			});
			expect(shouldVirtualizeComments('auto')).toBe(false);
		} finally {
			Object.defineProperty(globalThis, 'navigator', {
				value: originalNavigator,
				writable: true,
				configurable: true
			});
		}
	});

	it('в режиме auto включает виртуализацию при поддержке contentVisibility в Chrome', () => {
		const originalNavigator = globalThis.navigator;
		const originalDoc = globalThis.document;
		const originalWin = globalThis.window;
		try {
			Object.defineProperty(globalThis, 'window', {
				value: {},
				writable: true,
				configurable: true
			});
			Object.defineProperty(globalThis, 'navigator', {
				value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
				writable: true,
				configurable: true
			});
			Object.defineProperty(globalThis, 'document', {
				value: {
					documentElement: {
						style: { contentVisibility: '' }
					}
				},
				writable: true,
				configurable: true
			});
			expect(shouldVirtualizeComments('auto')).toBe(true);
		} finally {
			Object.defineProperty(globalThis, 'window', {
				value: originalWin,
				writable: true,
				configurable: true
			});
			Object.defineProperty(globalThis, 'navigator', {
				value: originalNavigator,
				writable: true,
				configurable: true
			});
			Object.defineProperty(globalThis, 'document', {
				value: originalDoc,
				writable: true,
				configurable: true
			});
		}
	});
});
