import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { render } from 'svelte/server';
import Header from '../dtf2022/Header.svelte';
import SidebarLeft from './SidebarLeft.svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { activeTheme } from '../index.svelte';
import { getThemeSettings } from '../settings.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Header: настройка avatarOpensMenu', () => {
	beforeEach(() => {
		authStorage.session = {
			userId: 12345,
			accessToken: 'fake-token'
		} as any;
	});

	afterEach(() => {
		authStorage.logout();
		activeTheme.set('redtf');
		getThemeSettings('redtf').patch({ avatarOpensMenu: true });
	});

	it('в теме dtf2022 аватар по умолчанию ведёт в профиль, а стрелка открывает меню', () => {
		activeTheme.set('dtf2022');
		const { body } = render(Header);
		expect(body).toMatch(/<a[^>]*class="[^"]*header-profile__avatar[^"]*"[^>]*aria-label="Мой профиль"/);
		expect(body).toMatch(/<button[^>]*class="[^"]*header-profile__toggle[^"]*"/);
		expect(body).not.toMatch(/header-profile__btn/);
	});

	it('в теме redtf аватар и стрелка по умолчанию объединены в единую кнопку открытия меню', () => {
		activeTheme.set('redtf');
		const { body } = render(Header);
		expect(body).toMatch(/<button[^>]*class="[^"]*header-profile__btn[^"]*"[^>]*aria-label="Меню профиля"/);
		expect(body).toMatch(/header-profile__arrow/);
		expect(body).not.toMatch(/<a[^>]*class="[^"]*header-profile__avatar[^"]*"/);
		expect(body).not.toMatch(/header-profile__toggle/);
	});

	it('при отключении настройки в redtf аватар снова становится ссылкой на профиль', () => {
		activeTheme.set('redtf');
		getThemeSettings('redtf').patch({ avatarOpensMenu: false });
		const { body } = render(Header);
		expect(body).toMatch(/<a[^>]*class="[^"]*header-profile__avatar[^"]*"[^>]*aria-label="Мой профиль"/);
		expect(body).toMatch(/<button[^>]*class="[^"]*header-profile__toggle[^"]*"/);
		expect(body).not.toMatch(/header-profile__btn/);
	});

	it('явный проп avatarOpensMenu переопределяет настройку темы', () => {
		activeTheme.set('dtf2022');
		const { body } = render(Header, { props: { avatarOpensMenu: true } });
		expect(body).toMatch(/header-profile__btn/);
	});
});

describe('Header: стили блюра верхней панели (headerBlur)', () => {
	const cssContent = fs.readFileSync(path.join(__dirname, 'theme.css'), 'utf-8');

	it('в светлой теме использует rgba(217, 245, 255, 0.5) и блюр 20px', () => {
		expect(cssContent).toContain(
			':root[data-theme~="redtf"][data-header-blur="true"] .header {\n\tbackground-color: rgba(217, 245, 255, 0.5);\n\tbackdrop-filter: blur(20px) saturate(180%);'
		);
	});

	it('на смартфонах (max-width: 719px) использует блюр 10px saturate(180%)', () => {
		expect(cssContent).toMatch(
			/@media \(max-width: 719px\) \{\s*:root\[data-theme~="redtf"\]\[data-header-blur="true"\] \.header \{\s*backdrop-filter: blur\(10px\) saturate\(180%\);/
		);
	});

	it('в тёмной теме сохраняет background-color: rgba(0, 0, 0, 0.1)', () => {
		expect(cssContent).toContain(
			':root[data-theme~="redtf"][data-theme-mode="dark"][data-header-blur="true"] .header {\n\tbackground-color: rgba(0, 0, 0, 0.1);\n}'
		);
	});
});

describe('Header: раскладка кнопок топбара при разных ширинах экрана', () => {
	const cssContent = fs.readFileSync(path.join(__dirname, 'theme.css'), 'utf-8');

	it('до 1400px скрывает кнопку Создать в колонке контента и оставляет её в header-right', () => {
		expect(cssContent).toMatch(
			/@media \(max-width: 1399px\) \{\s*:root\[data-theme~="redtf"\] \.header-create--column \{\s*display: none;\s*\}\s*:root\[data-theme~="redtf"\] \.header-create--side \{\s*display: flex;\s*\}/
		);
	});

	it('от 1180px правый блок растягивается на 100% высоты для правильного выравнивания', () => {
		expect(cssContent).toMatch(
			/@media \(min-width: 1180px\) \{\s*:root\[data-theme~="redtf"\] \.header-container \{\s*grid-template-columns: var\(--sidebar-left-width\) 1fr 0;\s*\}\s*:root\[data-theme~="redtf"\] \.header-right \{\s*position: absolute;\s*top: 0;\s*right: 0;\s*height: 100%;/
		);
	});

	it('от 1400px возвращает статичное позиционирование и резервирует правую колонку', () => {
		expect(cssContent).toMatch(
			/@media \(min-width: 1400px\) \{\s*:root\[data-theme~="redtf"\] \.header-container \{\s*grid-template-columns: var\(--sidebar-left-width\) 1fr var\(--sidebar-left-width\);\s*\}\s*:root\[data-theme~="redtf"\] \.header-right \{\s*position: static;\s*\}/
		);
	});

	it('на десктопе при header--create-sidebar скрывает обе кнопки Создать в шапке', () => {
		expect(cssContent).toMatch(
			/@media \(min-width: 860px\) \{\s*:root\[data-theme~="redtf"\] \.header--create-sidebar \.header-create--column,\s*:root\[data-theme~="redtf"\] \.header--create-sidebar \.header-create--side \{\s*display: none;\s*\}/
		);
	});
});

describe('Header: настройка createButtonPos', () => {
	it('по умолчанию в redtf кнопка Создать отображается сверху и класс header--create-sidebar отсутствует', () => {
		activeTheme.set('redtf');
		const { body } = render(Header);
		expect(body).not.toContain('header--create-sidebar');
	});

	it('при createButtonPos: sidebar шапка получает класс header--create-sidebar', () => {
		activeTheme.set('redtf');
		getThemeSettings('redtf').patch({ createButtonPos: 'sidebar' });
		const { body } = render(Header);
		expect(body).toContain('header--create-sidebar');
		getThemeSettings('redtf').patch({ createButtonPos: 'top' });
	});
});

describe('Header: настройка searchBarMode', () => {
	it('по умолчанию в redtf строка поиска отображается всегда (нет header-search-toggle и нет header-search--collapsed)', () => {
		activeTheme.set('redtf');
		const { body } = render(Header);
		expect(body).not.toContain('header-search-toggle');
		expect(body).not.toContain('header-search--collapsed');
	});

	it('при searchBarMode: button отображается кнопка поиска слева от колокольчика, а строка в центре скрыта за классом header-search--collapsed', () => {
		activeTheme.set('redtf');
		getThemeSettings('redtf').patch({ searchBarMode: 'button' });
		const { body } = render(Header);
		expect(body).toContain('header-search-toggle');
		expect(body).toContain('header-search--collapsed');

		// Кнопка поиска стоит перед кнопкой уведомлений
		const searchIndex = body.indexOf('header-search-toggle');
		const bellIndex = body.indexOf('header-notifications');
		expect(searchIndex).toBeGreaterThan(-1);
		expect(bellIndex).toBeGreaterThan(-1);
		expect(searchIndex).toBeLessThan(bellIndex);

		getThemeSettings('redtf').patch({ searchBarMode: 'always' });
	});
});

describe('SidebarLeft: настройка createButtonPos', () => {
	it('по умолчанию в redtf кнопка в сайдбаре скрыта на десктопе (нет sidebar-write--desktop)', () => {
		activeTheme.set('redtf');
		const { body } = render(SidebarLeft);
		expect(body).not.toContain('sidebar-write--desktop');
		expect(body).toContain('Новая запись');
	});

	it('при createButtonPos: sidebar в сайдбаре активируется блок кнопки с классом sidebar-write--desktop', () => {
		activeTheme.set('redtf');
		getThemeSettings('redtf').patch({ createButtonPos: 'sidebar' });
		const { body } = render(SidebarLeft);
		expect(body).toContain('sidebar-write--desktop');
		expect(body).toContain('Новая запись');
		getThemeSettings('redtf').patch({ createButtonPos: 'top' });
	});
});
