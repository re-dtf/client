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

	it('не отображает блок заголовка для пустых заголовков', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'PostBlocks.svelte'), 'utf8');

		expect(svelteContent).toContain('{#if title?.trim()}');
		expect(svelteContent).toContain('post-block post-block--title');
	});

	it('поддерживает якоря блоков и отступ прокрутки под шапку', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'PostBlocks.svelte'), 'utf8');

		expect(svelteContent).toContain('anchorId');
		expect(svelteContent).toContain('scroll-margin-top: calc(var(--header-height, 60px) + 8px)');
	});

	it('ограничивает подписи полноширинных медиа на странице поста шириной контента', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'PostBlocks.svelte'), 'utf8');

		expect(svelteContent).toContain('.post-blocks--page > .media-figure:not(.media-figure--column) > .media-caption');
		expect(svelteContent).toContain('max-width: min(var(--inner-content-width), calc(100% - 2 * var(--text-gap, 0px)))');
		expect(svelteContent).toContain('margin-inline: auto');
		expect(svelteContent).toContain('padding-inline: 16px');
	});

	it('не применяет стили ссылок блоков к встроенному посту (osnovaEmbed)', () => {
		const svelteContent = fs.readFileSync(path.join(__dirname, 'PostBlocks.svelte'), 'utf8');

		expect(svelteContent).toContain('.post-block:not(.post-block--embed) :global(a)');
		expect(svelteContent).not.toMatch(/^\s*\.post-block\s+:global\(a\)/m);
	});
});
