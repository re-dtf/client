import { describe, expect, it } from 'vitest';
import { paletteSelection, resolvePalette } from './palette';
import { getTheme } from './registry';
import type { ThemePalettes } from './types';

const palettes: ThemePalettes = {
	default: 'paper',
	system: { light: 'paper', dark: 'night' },
	options: [
		{ id: 'paper', title: 'Бумага', mode: 'light', background: '#eee', themeColor: '#ddd' },
		{ id: 'night', title: 'Ночь', mode: 'dark', background: '#111', themeColor: '#222' },
		{ id: 'black', title: 'Чёрная', mode: 'dark', background: '#000', themeColor: '#000' }
	]
};

describe('выбор палитры темы', () => {
	it.each([
		['auto', false, 'paper'], ['auto', true, 'night'],
		['black', false, 'black'], ['paper', true, 'paper'],
		['removed', true, 'paper'], [null, true, 'paper']
	])('выбор %s при системном dark=%s даёт %s', (choice, dark, id) => {
		expect(resolvePalette(palettes, choice, dark as boolean).id).toBe(id);
	});

	it('неизвестное значение нормализуется без записи в настройки', () => {
		expect(paletteSelection(palettes, 'removed')).toBe('paper');
	});

	it('тема с одной палитрой остаётся светлой при тёмной системе', () => {
		expect(resolvePalette(getTheme('dtf2022')!.palettes!, 'auto', true).mode).toBe('light');
	});
});
