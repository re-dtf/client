import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';
import Toast from './Toast.svelte';

describe('Toast', () => {
	it('показывает кнопку действия, только если она передана', () => {
		const withAction = render(Toast, { props: { type: 'success', message: 'Пост скрыт', action: { label: 'Отменить', onclick: vi.fn() }, onhide: vi.fn() } });
		expect(withAction.body).toContain('Пост скрыт');
		expect(withAction.body).toContain('Отменить');

		const plain = render(Toast, { props: { type: 'success', message: 'Пост скрыт', onhide: vi.fn() } });
		expect(plain.body).not.toContain('notify-item__action');
	});
});
