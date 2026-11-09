import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import redtfTheme from './theme';
import dtf2022Theme from '../dtf2022/theme';
import { activeTheme } from '../index.svelte';
import { activeThemeSettings } from '../settings.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('redtf dark mode configuration', () => {
	it('тема определяет доступные палитры и системный выбор', () => {
		expect(redtfTheme.palettes?.options.map(p => p.id)).toEqual(['light', 'dark', 'amoled']);
		expect(dtf2022Theme.palettes?.options.map(p => p.id)).toEqual(['light']);
		activeTheme.set('redtf');
		expect(activeThemeSettings().value.palette).toBe('auto');
	});

	it('contains all essential dark theme tokens in theme.css', () => {
		const cssPath = path.join(__dirname, 'theme.css');
		const cssContent = fs.readFileSync(cssPath, 'utf-8');

		expect(cssContent).toContain(':root[data-theme~="redtf"][data-theme-mode="dark"]');
		expect(cssContent).not.toContain('@media (prefers-color-scheme: dark)');

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
		expect(appHtmlContent).toContain('<!-- redtf:appearance -->');

		const layoutPath = path.resolve(__dirname, '../../../routes/+layout.svelte');
		const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
		expect(layoutContent).toContain('applyPalette(palette)');
	});

	it('prevents dark theme white flash before load in app.html and app.css', () => {
		const appHtmlPath = path.resolve(__dirname, '../../../app.html');
		const appHtmlContent = fs.readFileSync(appHtmlPath, 'utf-8');
		const headIndex = appHtmlContent.indexOf('%sveltekit.head%');
		const scriptIndex = appHtmlContent.indexOf('<script>');
		const styleIndex = appHtmlContent.indexOf('<style>');

		expect(scriptIndex).toBeGreaterThan(-1);
		expect(styleIndex).toBeGreaterThan(-1);
		expect(scriptIndex).toBeLessThan(headIndex);
		expect(styleIndex).toBeLessThan(headIndex);

		expect(appHtmlContent).toContain("html[data-theme-mode='dark']");
		expect(appHtmlContent).toContain('#141414');

		const appCssPath = path.resolve(__dirname, '../../../app.css');
		const appCssContent = fs.readFileSync(appCssPath, 'utf-8');
		expect(appCssContent).toContain('color-scheme: light dark');
		expect(appCssContent).toContain('html[data-theme-mode="dark"]');
		expect(appCssContent).toContain('#141414');
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

	it('adapts comment link navigation highlight to dark theme without bright white flash', () => {
		const cssPath = path.join(__dirname, 'theme.css');
		const cssContent = fs.readFileSync(cssPath, 'utf-8');
		expect(cssContent).toContain('--color-blue-tint: rgba(70, 131, 217, 0.25);');

		const redtfCommentsPath = path.resolve(__dirname, 'Comments.svelte');
		const redtfCommentsContent = fs.readFileSync(redtfCommentsPath, 'utf-8');
		expect(redtfCommentsContent).toContain("node.style.backgroundColor = 'var(--color-blue-tint, var(--bg-highlight, #e8f3ff))';");
		expect(redtfCommentsContent).toContain("{ backgroundColor: 'var(--color-blue-tint, var(--bg-highlight, #e8f3ff))' }");

		const dtfCommentsPath = path.resolve(__dirname, '../dtf2022/Comments.svelte');
		const dtfCommentsContent = fs.readFileSync(dtfCommentsPath, 'utf-8');
		expect(dtfCommentsContent).toContain("node.style.backgroundColor = 'var(--color-blue-tint, var(--bg-highlight, #e8f3ff))';");
		expect(dtfCommentsContent).toContain("{ backgroundColor: 'var(--color-blue-tint, var(--bg-highlight, #e8f3ff))' }");

		const appCssPath = path.resolve(__dirname, '../../../app.css');
		const appCssContent = fs.readFileSync(appCssPath, 'utf-8');
		expect(appCssContent).toContain('--color-blue-tint: rgba(70, 131, 217, 0.25);');
	});
});
