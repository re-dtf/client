import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Comments sorting options', () => {
	it('содержит динамический список сортировок с опцией «Худшие» при включенном rank', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'Comments.svelte'), 'utf8');

		expect(svelteContent).toContain('reactionSettings.value.rank');
		expect(svelteContent).toContain("{ value: 'worst', label: 'Худшие' }");
		expect(svelteContent).toContain("{ value: 'hotness', label: 'Лучшие' }");
		expect(svelteContent).toContain("{ value: 'date', label: 'Последние' }");
		expect(svelteContent).toContain("if (!reactionSettings.value.rank && logic.sorting === 'worst')");
		expect(svelteContent).toContain("setSorting('hotness')");
	});

	it('не пересоздаёт IntersectionObserver чанков при изменении renderedCount', () => {
		for (const file of ['Comments.svelte', '../redtf/Comments.svelte']) {
			const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
			expect(content).toContain('if (!chunkSentinel) return;');
			expect(content).not.toContain('if (!chunkSentinel || renderedCount >= rows.length)');
		}
	});
});
