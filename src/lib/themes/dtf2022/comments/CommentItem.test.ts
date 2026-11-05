import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('CommentItem thread lines hitbox', () => {
	it('содержит стили хитбокса триггера веток с расширением влево и вправо', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'CommentItem.svelte'), 'utf8');

		// Проверяем наличие стилей расширенного хитбокса
		expect(svelteContent).toContain('.comment-item__thread-line::after');
		expect(svelteContent).toContain('left: calc(var(--gap-branch) * -0.5)');
		expect(svelteContent).toContain('right: calc(var(--gap-branch) * 0.5)');

		// no-border не должен обнулять высоту, иначе сабветки остаются без триггера
		expect(svelteContent).not.toMatch(/\.comment-item__thread-line--no-border\s*\{[^}]*height:\s*0/);

		// Пустые линии (без границы и без дуги) игнорируют события указателя
		expect(svelteContent).toContain('.comment-item__thread-line--empty');
	});

	it('не обрезает меню реакций и поповер из-за content-visibility', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'CommentItem.svelte'), 'utf8');

		expect(svelteContent).toContain('.comment-item:has(:global(.post-reactions__picker))');
		expect(svelteContent).toContain('content-visibility: visible');
		expect(svelteContent).toContain('z-index: 20');
	});
});
