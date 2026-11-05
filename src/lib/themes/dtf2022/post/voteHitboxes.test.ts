import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Mobile vote hitboxes', () => {
	it('Rating.svelte содержит стили расширенных хитбоксов для стрелок на мобильных', () => {
		const content = fs.readFileSync(path.join(__dirname, 'Rating.svelte'), 'utf8');

		expect(content).toContain('.vote__button::after');
		expect(content).toContain('width: 44px');
		expect(content).toContain('height: 44px');
		expect(content).toContain('@media (pointer: coarse), (max-width: 859px)');
	});

	it('PostButton.svelte содержит стили расширенных хитбоксов для лайков и дизлайков на мобильных', () => {
		const content = fs.readFileSync(path.join(__dirname, 'PostButton.svelte'), 'utf8');

		expect(content).toContain('.post-button--like::after');
		expect(content).toContain('.post-button--dislike::after');
		expect(content).toContain('min-height: 44px');
		expect(content).toContain('min-width: max(100%, 44px)');
		expect(content).toContain('@media (pointer: coarse), (max-width: 859px)');
	});

	it('Reactions.svelte содержит стили расширенных хитбоксов для реакций на мобильных', () => {
		const content = fs.readFileSync(path.join(__dirname, 'Reactions.svelte'), 'utf8');

		expect(content).toContain('.post-reaction::after');
		expect(content).toContain('min-height: 44px');
		expect(content).toContain('.post-reactions__scroll');
		expect(content).toContain('@media (pointer: coarse), (max-width: 859px)');
	});
});
