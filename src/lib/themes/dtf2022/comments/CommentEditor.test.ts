import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import CommentEditor from './CommentEditor.svelte';

describe('CommentEditor', () => {
	it('рендерит поле ввода комментария', () => {
		const { body } = render(CommentEditor, {
			props: {
				text: ''
			}
		});

		expect(body).toContain('comment-editor-box__input');
		expect(body).toContain('contenteditable="plaintext-only"');
		expect(body).toContain('role="textbox"');
		expect(body).toContain('Написать комментарий...');
	});

	it('рендерит плейсхолдер ответа в режиме replying', () => {
		const { body } = render(CommentEditor, {
			props: {
				replying: true
			}
		});

		expect(body).toContain('Написать ответ...');
		expect(body).toContain('Отмена');
	});
});
