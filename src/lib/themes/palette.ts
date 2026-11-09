import type { ThemePalettes, ThemePalette } from './types';

export const DEFAULT_PALETTES: ThemePalettes = {
	default: 'light',
	system: { light: 'light', dark: 'light' },
	options: [{ id: 'light', title: 'Светлая', mode: 'light', background: '#f2f2f2', themeColor: '#D9F5FF' }]
};

/** Неизвестный выбор отображается как палитра по умолчанию, без перезаписи хранилища. */
export function paletteSelection(palettes: ThemePalettes, selected: unknown): string {
	return selected === 'auto' || palettes.options.some(p => p.id === selected) ? String(selected) : palettes.default;
}

export function resolvePalette(palettes: ThemePalettes, selected: unknown, dark: boolean): ThemePalette {
	const choice = paletteSelection(palettes, selected);
	const id = choice === 'auto' ? palettes.system[dark ? 'dark' : 'light'] : choice;
	return palettes.options.find(p => p.id === id) ?? palettes.options.find(p => p.id === palettes.default) ?? palettes.options[0];
}

/** Одинаковое применение при раннем запуске и при переключении в приложении. */
export function applyPalette(palette: ThemePalette): void {
	const root = document.documentElement;
	root.dataset.palette = palette.id;
	root.dataset.themeMode = palette.mode;
	root.style.colorScheme = palette.mode;
	root.style.setProperty('--app-background', palette.background);
	document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', palette.mode);
	document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', palette.themeColor));
	const lock = document.querySelector('meta[name="darkreader-lock"]');
	if (palette.mode === 'dark') {
		if (!lock) {
			const meta = document.createElement('meta');
			meta.name = 'darkreader-lock';
			document.head.appendChild(meta);
		}
		document.querySelectorAll('.darkreader').forEach(el => el.remove());
	} else lock?.remove();
}
