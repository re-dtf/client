import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
	const data: Record<string, string> = {};
	Object.defineProperty(globalThis, 'localStorage', {
		value: {
			getItem: (k: string) => data[k] ?? null,
			setItem: (k: string, v: string) => (data[k] = String(v)),
			removeItem: (k: string) => delete data[k],
			clear: () => Object.keys(data).forEach((k) => delete data[k])
		},
		writable: true
	});
});

import { getThemeSettings, activeThemeSettings } from './settings.svelte';
import { activeTheme } from './index.svelte';
import { themeSettings as redtfThemeSettings } from './redtf/themeSettings.svelte';

describe('настройки темы', () => {
	beforeEach(() => localStorage.clear());

	it('значения по умолчанию берутся из схемы темы', () => {
		expect(getThemeSettings('dtf2022').value).toEqual({ votes: 'likes', arrowsSide: 'right', arrowsOrder: 'down-up' });
	});

	it('у каждой темы свой ключ, настройки не смешиваются', () => {
		getThemeSettings('dtf2022').patch({ votes: 'rating' });

		expect(JSON.parse(localStorage.getItem('redtf:theme:dtf2022')!).d).toEqual({ votes: 'rating', arrowsSide: 'right', arrowsOrder: 'down-up' });
	});

	it('один и тот же стор отдаётся для одной темы', () => {
		expect(getThemeSettings('dtf2022')).toBe(getThemeSettings('dtf2022'));
	});

	it('activeThemeSettings следует за выбранной темой', () => {
		activeTheme.set('dtf2022');
		expect(activeThemeSettings()).toBe(getThemeSettings('dtf2022'));
	});

	it('настройка headerBlur, mobileBarBlur, mobileBarFloating и avatarOpensMenu есть только у темы redtf', () => {
		const redtfSettings = getThemeSettings('redtf').value;
		expect(redtfSettings.headerBlur).toBe(false);
		expect(redtfSettings.mobileBarBlur).toBe(false);
		expect(redtfSettings.mobileBarFloating).toBe(false);
		expect(redtfSettings.avatarOpensMenu).toBe(true);

		const dtfSettings = getThemeSettings('dtf2022').value;
		expect(dtfSettings.headerBlur).toBeUndefined();
		expect(dtfSettings.mobileBarBlur).toBeUndefined();
		expect(dtfSettings.mobileBarFloating).toBeUndefined();
		expect(dtfSettings.avatarOpensMenu).toBeUndefined();
	});

	it('геттеры themeSettings корректно отражают mobileBarBlur и mobileBarFloating', () => {
		activeTheme.set('redtf');
		expect(redtfThemeSettings.mobileBarBlur).toBe(false);
		expect(redtfThemeSettings.mobileBarFloating).toBe(false);

		getThemeSettings('redtf').patch({ mobileBarBlur: true, mobileBarFloating: true });
		expect(redtfThemeSettings.mobileBarBlur).toBe(true);
		expect(redtfThemeSettings.mobileBarFloating).toBe(true);
	});
});
