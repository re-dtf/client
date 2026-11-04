import { describe, it, expect } from 'vitest';
import { getSettingsPath } from './navigation';
import fs from 'node:fs';
import path from 'node:path';

describe('navigation', () => {
	it('getSettingsPath строит правильные адреса для настроек', () => {
		expect(getSettingsPath()).toBe('/settings');
		expect(getSettingsPath('about')).toBe('/settings?page=about');
		expect(getSettingsPath('help')).toBe('/settings?page=help');
		expect(getSettingsPath('about', 'documents')).toBe('/settings?page=about&section=documents');
	});

	it('SidebarLeft в dtf2022 содержит рабочие ссылки на «О приложении» и «Хочу помочь»', () => {
		const filePath = path.resolve(__dirname, 'themes/dtf2022/SidebarLeft.svelte');
		const content = fs.readFileSync(filePath, 'utf-8');

		expect(content).toContain('?page=about');
		expect(content).toContain('?page=help');
		expect(content).toContain('?page=about&section=documents');
		expect(content).toContain("openSettings(e, 'about')");
		expect(content).toContain("openSettings(e, 'help')");
		expect(content).toContain("openSettings(e, 'about', 'documents')");
	});

	it('SidebarLeft в redtf содержит рабочие ссылки на «О приложении» и «Хочу помочь»', () => {
		const filePath = path.resolve(__dirname, 'themes/redtf/SidebarLeft.svelte');
		const content = fs.readFileSync(filePath, 'utf-8');

		expect(content).toContain('?page=about');
		expect(content).toContain('?page=help');
		expect(content).toContain('?page=about&section=documents');
		expect(content).toContain("openSettings(e, 'about')");
		expect(content).toContain("openSettings(e, 'help')");
		expect(content).toContain("openSettings(e, 'about', 'documents')");
	});
});
