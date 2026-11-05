import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ProfileComment badge modal integration', () => {
	it('содержит кликабельные кнопки бейджей и модальное окно BadgeInfoModal', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'ProfileComment.svelte'), 'utf8');

		expect(svelteContent).toContain('BadgeInfoModal');
		expect(svelteContent).toContain('showBadgeModal');
		expect(svelteContent).toContain('class="profile-comment__badge profile-comment__badge--{clientBadge.type}"');
		expect(svelteContent).toContain('class="profile-comment__time-badge"');
		expect(svelteContent).toContain('cursor: pointer');
	});

	it('обрабатывает ссылки DTF внутри приложения через openDtfLink', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'ProfileComment.svelte'), 'utf8');

		expect(svelteContent).toContain('openDtfLink');
		expect(svelteContent).toContain('dtfTargetToPath');
		expect(svelteContent).toContain('parseDtfUrl(part.url)');
	});
});
