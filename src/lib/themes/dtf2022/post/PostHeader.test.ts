import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('PostHeader menu items', () => {
	it('содержит пункт меню "Открыть на DTF" со ссылкой формата https://dtf.ru/{id}', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'PostHeader.svelte'), 'utf8');

		expect(svelteContent).toContain("label: 'Открыть на DTF'");
		expect(svelteContent).toContain("icon: 'v_external'");
		expect(svelteContent).toContain('https://dtf.ru/${post.id}');
	});

	it('содержит пункт меню "Копировать ссылку"', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'PostHeader.svelte'), 'utf8');

		expect(svelteContent).toContain("label: 'Копировать ссылку'");
		expect(svelteContent).toContain("icon: 'v_link'");
		expect(svelteContent).toContain('navigator.clipboard.writeText');
		expect(svelteContent).toContain("notify.success('Ссылка скопирована')");
		expect(svelteContent).toContain("notify.error('Не удалось скопировать ссылку')");
	});
});
