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

	it('по умолчанию открывается пустым с заглушкой по центру', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {}
			}
		});

		expect(body).toContain('Выберите раздел в меню слева');
		expect(body).toContain('empty-state');
		expect(body).not.toContain('nav__item--active');
	});

	it('открывает источники при явной передаче page: sources', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'sources'
			}
		});

		expect(body).toContain('nav__item--active');
		expect(body).not.toContain('Выберите раздел в меню слева');
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

	it('рендерит страницу «О приложении» при передаче page: about', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'about'
			}
		});

		expect(body).toContain('reDTF');
		expect(body).toContain('Переосмысление клиентского опыта для DTF');
		expect(body).toContain('Пользовательское соглашение');
		expect(body).toContain('id="about-documents"');
	});

	it('рендерит страницу «Хочу помочь» при передаче page: help', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'help'
			}
		});

		expect(body).toContain('Поддержите reDTF');
		expect(body).toContain('Расскажите о проекте');
		expect(body).toContain('Из России');
	});

	it('открывает «О приложении» при передаче page: legal', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'legal'
			}
		});

		expect(body).toContain('Пользовательское соглашение');
		expect(body).toContain('Политика конфиденциальности');
	});

	it('рендерит подменю раздела со стрелкой назад справа от заголовка', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				section: 'appearance'
			}
		});

		expect(body).toContain('Внешний вид');
		expect(body).toContain('folder-back');
		expect(body).toContain('aria-label="Назад к разделам"');

		// Заголовок предшествует кнопке возврата в разметке шапки сайдбара
		const titleIndex = body.indexOf('side-title');
		const backIndex = body.indexOf('folder-back');
		expect(titleIndex).toBeGreaterThan(-1);
		expect(backIndex).toBeGreaterThan(-1);
		expect(titleIndex).toBeLessThan(backIndex);
	});
});
