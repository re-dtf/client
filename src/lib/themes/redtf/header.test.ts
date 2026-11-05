import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'svelte/server';
import Header from '../dtf2022/Header.svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { activeTheme } from '../index.svelte';
import { getThemeSettings } from '../settings.svelte';

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
