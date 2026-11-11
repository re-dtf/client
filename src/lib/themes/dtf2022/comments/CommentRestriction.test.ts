import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import CommentRestriction from './CommentRestriction.svelte';

describe('CommentRestriction', () => {
	it('показывает текст сервера', () => {
		const { body } = render(CommentRestriction, { props: { text: 'Комментирование доступно только подписчикам блога автора' } });

		expect(body).toContain('Комментирование доступно только подписчикам блога автора');
	});

	it('без текста подставляет общую фразу', () => {
		expect(render(CommentRestriction, { props: {} }).body).toContain('Комментирование недоступно');
	});
});
