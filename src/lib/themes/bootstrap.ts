import { DEFAULT_THEME, SETTINGS_VERSION, THEME_SETTINGS_VERSION } from '$lib/storage/defaults';
import { readPersisted } from '$lib/storage/readPersisted';
import { getTheme, themePalettes } from './registry';
import { applyPalette, resolvePalette } from './palette';

const settings = readPersisted('redtf:settings', { theme: DEFAULT_THEME }, SETTINGS_VERSION);
const theme = getTheme(settings.theme) ? settings.theme : DEFAULT_THEME;
const values = readPersisted(`redtf:theme:${theme}`, { palette: 'auto' }, THEME_SETTINGS_VERSION);
applyPalette(resolvePalette(themePalettes(theme), values.palette, window.matchMedia('(prefers-color-scheme: dark)').matches));
