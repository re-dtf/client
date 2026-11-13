import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PlusBadge from './PlusBadge.svelte';

describe('PlusBadge', () => {
	it('не рендерит ничего, если у пользователя нет Плюса', () => {
		const { body } = render(PlusBadge, {
			props: {
				author: { isPlus: false }
			}
		});

		expect(body).not.toContain('plus-badge');
		expect(body).not.toContain('<button');
	});

	it('рендерит кнопку бейджа с алмазом по умолчанию', () => {
		const { body } = render(PlusBadge, {
			props: {
				author: { isPlus: true },
				size: 20
			}
		});

		expect(body).toContain('plus-badge');
		expect(body).toContain('ui_badge_plus');
		expect(body).toContain('width="20"');
		expect(body).toContain('height="20"');
	});
});
