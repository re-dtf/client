import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'svelte/server';
import NotificationsPanel from './NotificationsPanel.svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { notifications } from '$lib/api/notifications.svelte';

describe('NotificationsPanel: плавная смена заголовка при обновлении', () => {
	beforeEach(() => {
		authStorage.session = {
			userId: 12345,
			accessToken: 'fake-token'
		} as any;
		notifications.clear();
	});

	afterEach(() => {
		authStorage.logout();
		notifications.clear();
	});

	it('рендерит заголовок с плавной сменой на «Обновляем...» и анимированными точками', () => {
		const { body } = render(NotificationsPanel);

		expect(body).toContain('notifications__title');
		expect(body).toContain('notifications__title-text');
		expect(body).toContain('Уведомления');
		expect(body).toContain('notifications__title-updating');
		expect(body).toContain('Обновляем');
		expect(body).toContain('notifications__dots');
		expect(body).toContain('notifications__dot');
	});

	it('показывает статус входа для неавторизованного пользователя', () => {
		authStorage.logout();
		const { body } = render(NotificationsPanel);

		expect(body).toContain('Войдите, чтобы видеть уведомления');
		expect(body).not.toContain('notifications__list');
	});

	it('в попапе рендерит футер со ссылкой на все уведомления', () => {
		const { body } = render(NotificationsPanel, { props: { page: false } });

		expect(body).toContain('notifications__footer');
		expect(body).toContain('Все уведомления');
	});

	it('на странице уведомлений не показывает ссылку на все уведомления', () => {
		const { body } = render(NotificationsPanel, { props: { page: true } });

		expect(body).toContain('notifications--page');
		expect(body).not.toContain('notifications__footer');
	});
});
