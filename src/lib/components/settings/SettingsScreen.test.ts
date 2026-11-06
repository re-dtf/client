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
		expect(body).toContain('О проекте');
		expect(body).toContain('Разработка');

		// Пункты меню первого уровня
		expect(body).toContain('Профиль');
		expect(body).toContain('Уведомления');
		expect(body).toContain('Чёрный список');
		expect(body).toContain('Моя лента');
		expect(body).toContain('Выбор темы');
		expect(body).toContain('Интерфейс');
		expect(body).toContain('Реестр реакций');
		expect(body).toContain('Приложение');
		expect(body).toContain('Источники данных');
		expect(body).toContain('Моя статистика');
		expect(body).toContain('Хочу помочь');
		expect(body).toContain('О приложении');
		expect(body).toContain('Дебаг');
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

	it('рендерит страницу «Дебаг» при передаче page: debug', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'debug'
			}
		});

		expect(body).toContain('Подсветка Safe Area и панелей');
		expect(body).toContain('Плавающий HUD метрик');
		expect(body).toContain('Безопасная область (Safe Area)');
		expect(body).toContain('Верхняя панель (--header-height)');
	});

	it('рендерит подменю раздела со стрелкой назад справа от заголовка', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				section: 'interface'
			}
		});

		expect(body).toContain('Интерфейс');
		expect(body).toContain('folder-back');
		expect(body).toContain('aria-label="Назад к разделам"');

		// Заголовок предшествует кнопке возврата в разметке шапки сайдбара
		const titleIndex = body.indexOf('side-title');
		const backIndex = body.indexOf('folder-back');
		expect(titleIndex).toBeGreaterThan(-1);
		expect(backIndex).toBeGreaterThan(-1);
		expect(titleIndex).toBeLessThan(backIndex);
	});

	it('скрывает настройки для мобильных на десктопе и показывает настройки для десктопа', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				section: 'interface',
				page: 'interface-content',
				device: 'desktop'
			}
		});

		// В подменю на десктопе видна Верхняя панель, скрыта Мобильная панель
		expect(body).toContain('Верхняя панель');
		expect(body).not.toContain('Мобильная панель');

		// Десктопная настройка ширины контента видна
		expect(body).toContain('Ширина контента');
	});

	it('показывает настройки для мобильных на смартфонах и скрывает десктопные', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				section: 'interface',
				page: 'interface-mobile-bar',
				device: 'mobile'
			}
		});

		// В подменю на смартфонах видна Мобильная панель, скрыта Верхняя панель
		expect(body).toContain('Мобильная панель');
		expect(body).not.toContain('Верхняя панель');

		// Мобильные настройки видны
		expect(body).toContain('Отключить верхний бар в мобильной версии');
		expect(body).toContain('Блюр мобильного бара');
		expect(body).toContain('Плавающий мобильный бар');
		// Десктопная настройка ширины контента скрыта
		expect(body).not.toContain('Ширина контента');
	});

	it('меняет местами блоки в выборе темы: сначала тема, затем цветовая схема', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'theme-select'
			}
		});

		const themeIndex = body.indexOf('Выбор темы');
		const colorSchemeIndex = body.indexOf('Тема оформления');
		expect(themeIndex).toBeGreaterThan(-1);
		expect(colorSchemeIndex).toBeGreaterThan(-1);
		expect(themeIndex).toBeLessThan(colorSchemeIndex);
	});

	it('рендерит раздел Приложение с нужными параметрами и кнопкой выбора иконки', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'app'
			}
		});

		expect(body).toContain('Тактильный отклик (вибрация)');
		expect(body).toContain('Продвинутые эффекты прозрачности и размытия');
		expect(body).toContain('Невидимая подпись reDTF');
		expect(body).toContain('Иконка приложения');
		expect(body).toContain('Выбрать');
	});

	it('рендерит раздел Верхняя панель с меню аватара и блюром', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'interface-top-bar',
				device: 'desktop'
			}
		});

		expect(body).toContain('Меню по клику на аватар');
		expect(body).toContain('Блюр верхней панели');
	});

	it('рендерит раздел Лента и контент с рейтингом и соло-ссылкой на фильтрацию', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'interface-content'
			}
		});

		expect(body).toContain('Сортировать по моему рейтингу');
		expect(body).toContain('Фильтрация контента');
		expect(body).toContain('Чёрный список и стоп-слова');
	});

	it('рендерит Оценки с соло-ссылкой на Реестр реакций', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'interface-votes'
			}
		});

		expect(body).toContain('Оценки');
		expect(body).toContain('Реестр реакций');
		expect(body).toContain('Настройка реакций');
	});

	it('рендерит Комментарии с соло-ссылкой на параметры приложения для подписи', () => {
		const { body } = render(SettingsScreen, {
			props: {
				onclose: () => {},
				page: 'interface-comments'
			}
		});

		expect(body).toContain('Вложенные комментарии');
		expect(body).toContain('Виртуализация комментариев');
		expect(body).toContain('Подпись reDTF');
	});
});
