import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';
import BadgeInfoModal from './BadgeInfoModal.svelte';

describe('BadgeInfoModal', () => {
	it('рендерит информацию для reDTF бейджа', () => {
		const { body } = render(BadgeInfoModal, {
			props: {
				badge: { type: 'redtf', label: 're:', title: 'Отправлено через reDTF' },
				onclose: vi.fn()
			}
		});

		expect(body).toContain('badge-modal__badge--redtf');
		expect(body).toContain('re:');
		expect(body).toContain('Этот комментарий написан с клиента re:DTF, которым вы сейчас пользуетесь.');
		expect(body).toContain('Кстати, вы можете сделать, чтобы таких комментариев было больше');
		expect(body).toContain('Поделиться ссылкой');
	});

	it('рендерит информацию для Android бейджа со ссылкой на загрузку приложения', () => {
		const { body } = render(BadgeInfoModal, {
			props: {
				badge: { type: 'android', label: 'Android', title: 'Отправлено из приложения для Android', icon: 'v_android' },
				onclose: vi.fn()
			}
		});

		expect(body).toContain('badge-modal__badge--android');
		expect(body).toContain('Android');
		expect(body).toContain('Этот комментарий написан с использованием Android приложения DTF.');
		expect(body).toContain('Кстати, у re:DTF тоже есть мобильное приложение для Android.');
		expect(body).toContain('https://github.com/re-dtf/client/releases');
		expect(body).toContain('Загрузить приложение');
	});

	it('рендерит информацию для iOS бейджа', () => {
		const { body } = render(BadgeInfoModal, {
			props: {
				badge: { type: 'ios', label: 'iOS', title: 'Отправлено из приложения для iOS', icon: 'v_apple' },
				onclose: vi.fn()
			}
		});

		expect(body).toContain('badge-modal__badge--ios');
		expect(body).toContain('iOS');
		expect(body).toContain('Этот комментарий написан с использованием iOS приложения DTF.');
		expect(body).toContain('Закрыть');
	});
});
