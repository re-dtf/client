import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import UnknownBlock from './UnknownBlock.svelte';

describe('UnknownBlock', () => {
	it('рендерит тип содержимого без кнопки, если нет postId', () => {
		const { body } = render(UnknownBlock, { props: { type: 'quiz' } });
		expect(body).toContain('Неизвестный блок');
		expect(body).toContain('re:DTF пока не поддерживает блоки типа quiz');
		expect(body).not.toContain('Открыть на DTF');
	});

	it('рендерит ссылку на пост, если передан postId', () => {
		const { body } = render(UnknownBlock, { props: { type: 'quiz', postId: 5389802 } });
		expect(body).toContain('href="https://dtf.ru/5389802"');
		expect(body).toContain('Открыть на DTF');
	});

	it('рендерит ссылку на комментарий, если передан commentId', () => {
		const { body } = render(UnknownBlock, { props: { type: 'audio', postId: 5389802, commentId: 69597055 } });
		expect(body).toContain('href="https://dtf.ru/5389802?comment=69597055"');
		expect(body).toContain('Открыть на DTF');
	});

	it('не показывает кнопку для не-DTF источников', () => {
		const { body } = render(UnknownBlock, { props: { type: 'quiz', postId: 5389802, sourceId: 'custom' } });
		expect(body).not.toContain('Открыть на DTF');
	});
});
