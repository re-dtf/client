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

	it('locks darkreader when dark mode is enabled in app.html and +layout.svelte', () => {
		const appHtmlPath = path.resolve(__dirname, '../../../app.html');
		const appHtmlContent = fs.readFileSync(appHtmlPath, 'utf-8');
		expect(appHtmlContent).toContain('darkreader-lock');

		const layoutPath = path.resolve(__dirname, '../../../routes/+layout.svelte');
		const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
		expect(layoutContent).toContain('darkreader-lock');
	});

	it('ensures Dialog and ReloadPrompt use theme CSS variables for dark mode support', () => {
		const dialogPath = path.resolve(__dirname, '../../components/Dialog.svelte');
		const dialogContent = fs.readFileSync(dialogPath, 'utf-8');
		expect(dialogContent).toContain('var(--modal-backdrop');
		expect(dialogContent).toContain('var(--bg-modal');
		expect(dialogContent).toContain('var(--text-primary');
		expect(dialogContent).toContain('var(--color-blue');
		expect(dialogContent).toContain('var(--color-danger');
		expect(dialogContent).not.toMatch(/background:\s*#fff\b/);

		const reloadPromptPath = path.resolve(__dirname, '../dtf2022/ReloadPrompt.svelte');
		const reloadPromptContent = fs.readFileSync(reloadPromptPath, 'utf-8');
		expect(reloadPromptContent).toContain('var(--bg-card');
		expect(reloadPromptContent).toContain('var(--text-primary');
		expect(reloadPromptContent).toContain('var(--shadow-toast');
		expect(reloadPromptContent).toContain('var(--color-blue');
		expect(reloadPromptContent).not.toContain('--island-bg');
		expect(reloadPromptContent).not.toContain('--main-text');

		const filteredCardPath = path.resolve(__dirname, '../dtf2022/post/FilteredCard.svelte');
		const filteredCardContent = fs.readFileSync(filteredCardPath, 'utf-8');
		expect(filteredCardContent).toContain('var(--text-primary');
		expect(filteredCardContent).not.toContain('--text-main');
	});

	it('ensures source dialogs and error components use theme CSS variables', () => {
		const bioPath = path.resolve(__dirname, '../../components/sources/BioVerification.svelte');
		const bioContent = fs.readFileSync(bioPath, 'utf-8');
		expect(bioContent).toContain('var(--border-color');
		expect(bioContent).toContain('var(--text-primary');

		const permPath = path.resolve(__dirname, '../../components/sources/SourcePermissions.svelte');
		const permContent = fs.readFileSync(permPath, 'utf-8');
		expect(permContent).toContain('var(--bg-secondary');
		expect(permContent).toContain('var(--text-primary');

		const catalogPath = path.resolve(__dirname, '../../components/sources/SourceCatalog.svelte');
		const catalogContent = fs.readFileSync(catalogPath, 'utf-8');
		expect(catalogContent).toContain('var(--bg-secondary');
		expect(catalogContent).toContain('var(--text-primary');

		const updatePath = path.resolve(__dirname, '../../components/sources/SourceUpdate.svelte');
		const updateContent = fs.readFileSync(updatePath, 'utf-8');
		expect(updateContent).toContain('var(--bg-secondary');
		expect(updateContent).toContain('var(--text-primary');

		const errorStatePath = path.resolve(__dirname, '../../components/NetworkErrorState.svelte');
		const errorStateContent = fs.readFileSync(errorStatePath, 'utf-8');
		expect(errorStateContent).toContain('var(--bg-card');
		expect(errorStateContent).toContain('var(--border-subtle');
		expect(errorStateContent).toContain('var(--bg-button-hover');
	});
});
