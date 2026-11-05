import { describe, it, expect, vi } from 'vitest';
import { freeze, pageTransition, shouldTransition } from './pageTransition.svelte';
import { fluent } from './motion';
import { activeTheme } from './themes/index.svelte';

describe('pageTransition', () => {
	it('shouldTransition возвращает false в среде без window (SSR / node)', () => {
		expect(shouldTransition()).toBe(false);
	});

	it('shouldTransition возвращает false для темы dtf2022 без motion', () => {
		vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
		activeTheme.set('dtf2022');
		expect(activeTheme.motion).toBeUndefined();
		expect(shouldTransition()).toBe(false);
		vi.unstubAllGlobals();
	});

	it('shouldTransition возвращает true для темы redtf с motion', () => {
		vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
		activeTheme.set('redtf');
		expect(activeTheme.motion).toBeDefined();
		expect(shouldTransition()).toBe(true);
		vi.unstubAllGlobals();
	});

	it('fluent содержит определения fastDepart и fastApproach', () => {
		expect(fluent.fastDepart).toBeDefined();
		expect(fluent.fastDepart?.duration).toBe(300);
		expect(fluent.fastApproach).toBeDefined();
		expect(fluent.fastApproach?.duration).toBe(400);
	});

	it('isOutgoing и isIncoming возвращают false по умолчанию', () => {
		expect(pageTransition.active).toBe(false);
		expect(pageTransition.slow).toBe(false);
		expect(pageTransition.isOutgoing('layer-1')).toBe(false);
		expect(pageTransition.isIncoming('layer-2')).toBe(false);
	});

	it('freeze корректно фиксирует элемент и восстанавливает стили при unfreeze', () => {
		const mockScreen = {
			style: {} as Record<string, string>,
			scrollTop: 0
		} as unknown as HTMLElement;

		const rect = { top: -2944, left: 100, width: 600 } as DOMRect;
		const unfreeze = freeze(mockScreen, rect);

		expect(mockScreen.style.position).toBe('fixed');
		expect(mockScreen.style.top).toBe('0px');
		expect(mockScreen.scrollTop).toBe(2944);

		unfreeze();
		expect(mockScreen.style.position).toBeUndefined();
	});
});
