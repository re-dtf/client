import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { settings } from '$lib/storage/settings.svelte';
import redtfTheme from './theme';
import dtf2022Theme from '../dtf2022/theme';
import { activeTheme } from '../index.svelte';
import { themeSettings } from './themeSettings.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('redtf dark mode configuration', () => {
	it('declares supportsDarkMode in theme manifests', () => {
		expect(redtfTheme.supportsDarkMode).toBe(true);
		expect(dtf2022Theme.supportsDarkMode).toBeUndefined();
	});

	it('defines colorScheme setting in global settings and SettingsScreen', () => {
		expect(settings.value.colorScheme).toBeDefined();
		expect(['auto', 'light', 'dark']).toContain(settings.value.colorScheme);

		const settingsScreenPath = path.resolve(__dirname, '../../components/settings/SettingsScreen.svelte');
		const screenContent = fs.readFileSync(settingsScreenPath, 'utf-8');
		expect(screenContent).toContain("key: 'colorScheme'");
		expect(screenContent).toContain("data-theme-mode='dark'");
		expect(screenContent).toContain('--st-bg: #242424;');
		expect(screenContent).toContain('--st-card: #303030;');
		expect(screenContent).toContain('--st-text: #ffffff;');
	});

	it('provides colorScheme getter in themeSettings', () => {
		expect(typeof themeSettings.colorScheme).toBe('string');
		expect(['auto', 'light', 'dark']).toContain(themeSettings.colorScheme);
	});

	it('contains all essential dark theme tokens in theme.css', () => {
		const cssPath = path.join(__dirname, 'theme.css');
		const cssContent = fs.readFileSync(cssPath, 'utf-8');

		expect(cssContent).toContain('color-scheme: light dark;');
		expect(cssContent).toContain(':root[data-theme~="redtf"][data-color-scheme="dark"]');
		expect(cssContent).toContain('@media (prefers-color-scheme: dark)');

		const requiredTokens = [
			'--bg-main',
			'--bg-card',
			'--bg-card-hover',
			'--bg-secondary',
			'--bg-tertiary',
			'--bg-header',
			'--text-primary',
			'--text-secondary',
			'--text-muted',
			'--text-link',
			'--border-color',
			'--border-subtle',
			'--color-accent',
			'--color-blue',
			'--color-positive',
			'--color-negative',
			'--shadow-card'
		];

		for (const token of requiredTokens) {
			expect(cssContent).toContain(token);
		}
	});

	it('ensures icons in header, sidebar and account menu use .icon or fill currentColor', () => {
		const headerPath = path.resolve(__dirname, '../dtf2022/Header.svelte');
		const headerContent = fs.readFileSync(headerPath, 'utf-8');
		expect(headerContent).toMatch(/class="header-menu"[\s\S]*?<svg\s+class="icon"/);

		const sidebarPath = path.resolve(__dirname, './SidebarLeft.svelte');
		const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
		expect(sidebarContent).toMatch(/class="panel-burger"[\s\S]*?<svg\s+class="icon"/);

		const accountMenuPath = path.resolve(__dirname, '../dtf2022/AccountMenu.svelte');
		const accountMenuContent = fs.readFileSync(accountMenuPath, 'utf-8');
		expect(accountMenuContent).toContain('class="icon account-menu__item-icon"');
	});
});
