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

	it('не обрезает меню реакций, поповер и редактор ответа из-за content-visibility', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'CommentItem.svelte'), 'utf8');

		expect(svelteContent).toContain('.comment-item:has(:global(.post-reactions__picker))');
		expect(svelteContent).toContain('.comment-item:has(:global(.comment-editor-container))');
		expect(svelteContent).toContain('content-visibility: visible');
		expect(svelteContent).toContain('z-index: 20');
	});

	it('содержит кликабельные кнопки бейджей и модальное окно BadgeInfoModal', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'CommentItem.svelte'), 'utf8');

		expect(svelteContent).toContain('BadgeInfoModal');
		expect(svelteContent).toContain('showBadgeModal');
		expect(svelteContent).toContain('class="comment-item__badge comment-item__badge--{clientBadge.type}"');
		expect(svelteContent).toContain('class="comment-item__time-badge"');
		expect(svelteContent).toContain('cursor: pointer');
	});

	it('обрабатывает ссылки DTF внутри приложения через openDtfLink', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'CommentItem.svelte'), 'utf8');

		expect(svelteContent).toContain('openDtfLink');
		expect(svelteContent).toContain('dtfTargetToPath');
		expect(svelteContent).toContain('parseDtfUrl(part.url)');
	});

	it('содержит пункт меню "Открыть на DTF" со ссылкой на комментарий DTF', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'CommentItem.svelte'), 'utf8');

		expect(svelteContent).toContain("label: 'Открыть на DTF'");
		expect(svelteContent).toContain("icon: 'v_external'");
		expect(svelteContent).toContain('https://dtf.ru/${comment.postId}?comment=${comment.id}');
	});

	it('поддерживает переход со стрелки к родителю ветки с подсветкой', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'CommentItem.svelte'), 'utf8');
		const dtfCommentsContent = fs.readFileSync(path.resolve(__dirname, '../Comments.svelte'), 'utf8');
		const redtfCommentsContent = fs.readFileSync(path.resolve(__dirname, '../../redtf/Comments.svelte'), 'utf8');

		expect(svelteContent).toContain('onparent');
		expect(svelteContent).toContain('onparent(key)');
		expect(dtfCommentsContent).toContain('onparent={scrollToTarget}');
		expect(redtfCommentsContent).toContain('onparent={scrollToTarget}');
	});

	it('поддерживает отображение восстановленных комментариев из архива', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'CommentItem.svelte'), 'utf8');

		expect(svelteContent).toContain('comment.restored');
		expect(svelteContent).toContain('Показать из архива');
		expect(svelteContent).toContain('comment-item__author-mark--restored');
		expect(svelteContent).toContain('comment-item__collapse-restored');
		expect(svelteContent).toContain('!isStubComment(comment)');
	});
});
