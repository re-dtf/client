import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SettingsScreen from './SettingsScreen.svelte';

describe('SettingsScreen', () => {
	it('рендерит основные категории и пункты Уровня 1', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {}
			}
		});

		// Заголовок окна
		expect(body).toContain('Настройки');

		// Основные категории первого уровня
		expect(body).toContain('Аккаунт');
		expect(body).toContain('Персонализация');
		expect(body).toContain('Сеть');
		expect(body).toContain('Данные');
		expect(body).toContain('Приложение');

		// Пункты меню первого уровня
		expect(body).toContain('Профиль');
		expect(body).toContain('Уведомления');
		expect(body).toContain('Чёрный список');
		expect(body).toContain('Внешний вид');
		expect(body).toContain('Поведение');
		expect(body).toContain('Источники данных');
		expect(body).toContain('Моя статистика');
		expect(body).toContain('Хочу помочь');
		expect(body).toContain('О приложении');
	});

	it('рендерит режим solo с кнопкой возврата', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'ignored',
				solo: true
			}
		});

		expect(body).toContain('data-solo="true"');
		expect(body).toContain('solo-back-button');
		expect(body).toContain('solo-back-button--menu');
		expect(body).toContain('Показать меню');
	});
});
