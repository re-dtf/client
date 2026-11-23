import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { expect, it, vi } from 'vitest';
import Popover from './Popover.svelte';

it('рисует разделитель только между видимыми группами действий', () => {
	const { body } = render(Popover, {
		props: {
			open: true,
			items: [
				{ value: 'copy', label: 'Копировать ссылку', group: 'content' },
				{ value: 'open', label: 'Открыть на DTF', group: 'content' },
				{ value: 'complain', label: 'Пожаловаться', group: 'moderation' }
			],
			onselect: vi.fn(),
			children: createRawSnippet(() => ({ render: () => '<button>⋯</button>' }))
		}
	});
	expect(body.match(/Копировать ссылку|Открыть на DTF|popover__divider|Пожаловаться/g)).toEqual([
		'Копировать ссылку', 'Открыть на DTF', 'popover__divider', 'Пожаловаться'
	]);
});
