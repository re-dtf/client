import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import type { Post } from '$lib/api/types';
import PostCard from './PostCard.svelte';

const draftPost: Post = {
	id: 5388155,
	sourceId: 'dtf',
	title: 'Черновик теста',
	blocks: [],
	author: { id: 1, name: 'Автор' },
	commentsCount: 0,
	createdAt: '2026-01-01T00:00:00.000Z',
	isDraft: true
};

describe('PostCard (черновик)', () => {
	it('показывает кнопки черновика только при переданных обработчиках и «Удалить» — при ondelete', () => {
		const withoutHandlers = render(PostCard, { props: { post: draftPost } });
		expect(withoutHandlers.body).not.toContain('Смотреть');
		expect(withoutHandlers.body).not.toContain('Редактировать');
		expect(withoutHandlers.body).not.toContain('Удалить');

		const withoutDelete = render(PostCard, { props: { post: draftPost, onedit: () => {} } });
		expect(withoutDelete.body).toContain('Смотреть');
		expect(withoutDelete.body).toContain('Редактировать');
		expect(withoutDelete.body).not.toContain('Удалить');

		const withDelete = render(PostCard, { props: { post: draftPost, onedit: () => {}, ondelete: () => {} } });
		expect(withDelete.body).toContain('Удалить');
		expect(withDelete.body).toContain('#v_delete');
	});
});
