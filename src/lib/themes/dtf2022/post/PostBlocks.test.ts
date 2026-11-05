import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('PostBlocks DTF link handling', () => {
	it('содержит обработчик кликов по ссылкам DTF и разметку блоков ссылок', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'PostBlocks.svelte'), 'utf8');

		expect(svelteContent).toContain('openDtfLink');
		expect(svelteContent).toContain('handleContainerClick');
		expect(svelteContent).toContain('onclick={handleContainerClick}');
		expect(svelteContent).toContain('onauxclick={handleContainerClick}');
		expect(svelteContent).toContain('dtfTargetToPath');
		expect(svelteContent).toContain('parseDtfUrl(link.url)');
	});
});
