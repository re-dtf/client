import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import LoginModal from './LoginModal.svelte';

describe('LoginModal', () => {
	it('рендерит модальное окно входа и методы авторизации на первом этапе', () => {
		const { body } = render(LoginModal);

		expect(body).toContain('login-modal');
		expect(body).toContain('login-modal__close');
		expect(body).toContain('Вход в аккаунт');
		expect(body).toContain('Почта');
		expect(body).toContain('Токен');
		expect(body).toContain('Настройки прокси');
		expect(body).toContain('Регистрация');
	});
});
