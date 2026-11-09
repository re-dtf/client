import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { SETTINGS_VERSION, THEME_SETTINGS_VERSION } from '$lib/storage/defaults';

// Проверяем исполняемый скрипт из HTML, а не наличие строк в исходнике.
const template = readFileSync('.svelte-kit/app-template.html', 'utf8');
const script = template.match(/<script>([\s\S]*?)<\/script>/)![1];

function boot(theme: string, palette: unknown, dark: boolean, version = SETTINGS_VERSION) {
	const data: Record<string, string> = {
		'redtf:settings': JSON.stringify({ v: version, d: { theme } }),
		[`redtf:theme:${theme}`]: JSON.stringify({ v: THEME_SETTINGS_VERSION, d: { palette } })
	};
	const dataset: Record<string, string> = {};
	const styles: Record<string, string> = {};
	const colors: string[] = [];
	const scheme = { setAttribute: (_: string, value: string) => colors.push(value) };
	runInNewContext(script, {
		localStorage: { getItem: (key: string) => data[key] ?? null },
		window: { matchMedia: () => ({ matches: dark }) },
		document: {
			documentElement: { dataset, style: { setProperty: (key: string, value: string) => styles[key] = value } },
			querySelector: (selector: string) => selector.includes('color-scheme') ? scheme : null,
			querySelectorAll: (selector: string) => selector.includes('theme-color') ? [scheme] : [],
			createElement: () => ({}),
			head: { appendChild: () => {} }
		}
	});
	return { dataset, styles, colors };
}

describe('синхронное оформление до загрузки приложения', () => {
	it.each([
		['redtf', 'auto', true, 'dark', '#141414'],
		['redtf', 'dark', false, 'dark', '#141414'],
		['redtf', 'light', true, 'light', '#f2f2f2'],
		['dtf2022', 'auto', true, 'light', '#f2f2f2'],
		['redtf', 'removed', true, 'light', '#f2f2f2'],
		['missing', 'dark', false, 'light', '#f2f2f2']
	])('%s / %s при dark=%s', (theme, palette, dark, mode, background) => {
		const result = boot(theme as string, palette, dark as boolean);
		expect(result.dataset.themeMode).toBe(mode);
		expect(result.styles['--app-background']).toBe(background);
		expect(result.colors[0]).toBe(mode);
	});

	it('отбрасывает старую версию общих настроек', () => {
		expect(boot('dtf2022', 'light', true, SETTINGS_VERSION - 1).dataset.themeMode).toBe('dark');
	});
});
