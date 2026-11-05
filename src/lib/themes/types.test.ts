import { describe, it, expect, vi } from 'vitest';
import { isFieldVisible, getCurrentDevice, MOBILE_BREAKPOINT, type SettingField } from './types';

describe('isFieldVisible', () => {
	const fieldWithoutDeps: SettingField = {
		key: 'votes',
		type: 'radio',
		title: 'Оценки',
		default: 'likes',
		options: [{ value: 'likes', title: 'Лайки' }]
	};

	const fieldWithSingleDep: SettingField = {
		key: 'arrowsSide',
		type: 'radio',
		title: 'Стрелки',
		default: 'right',
		dependsOn: { key: 'votes', value: 'rating' },
		options: [{ value: 'right', title: 'Справа' }]
	};

	const fieldWithArrayDep: SettingField = {
		key: 'arrowsOrder',
		type: 'radio',
		title: 'Порядок',
		default: 'down-up',
		dependsOn: { key: 'votes', value: ['rating', 'custom'] },
		options: [{ value: 'down-up', title: 'Вниз / вверх' }]
	};

	const mobileOnlyField: SettingField = {
		key: 'mobileBarBlur',
		type: 'toggle',
		title: 'Блюр мобильного бара',
		default: false,
		device: 'mobile'
	};

	const desktopOnlyField: SettingField = {
		key: 'contentWidth',
		type: 'slider',
		title: 'Ширина контента',
		default: 640,
		steps: [640, 720],
		cssVars: () => ({}),
		device: 'desktop'
	};

	const mobileWithDepField: SettingField = {
		key: 'mobileArrowsSide',
		type: 'radio',
		title: 'Стрелки на мобильном',
		default: 'right',
		device: 'mobile',
		dependsOn: { key: 'votes', value: 'rating' },
		options: [{ value: 'right', title: 'Справа' }]
	};

	it('всегда видимо, если dependsOn не задан', () => {
		expect(isFieldVisible(fieldWithoutDeps, {})).toBe(true);
		expect(isFieldVisible(fieldWithoutDeps, { votes: 'likes' })).toBe(true);
	});

	it('видимо только при совпадении одиночного значения dependsOn', () => {
		expect(isFieldVisible(fieldWithSingleDep, { votes: 'likes' })).toBe(false);
		expect(isFieldVisible(fieldWithSingleDep, { votes: 'rating' })).toBe(true);
		expect(isFieldVisible(fieldWithSingleDep, {})).toBe(false);
	});

	it('видимо при совпадении с одним из значений массива dependsOn', () => {
		expect(isFieldVisible(fieldWithArrayDep, { votes: 'likes' })).toBe(false);
		expect(isFieldVisible(fieldWithArrayDep, { votes: 'rating' })).toBe(true);
		expect(isFieldVisible(fieldWithArrayDep, { votes: 'custom' })).toBe(true);
	});

	it('учитывает ограничение по устройству (device: mobile)', () => {
		expect(isFieldVisible(mobileOnlyField, {}, undefined, 'mobile')).toBe(true);
		expect(isFieldVisible(mobileOnlyField, {}, undefined, 'desktop')).toBe(false);
	});

	it('учитывает ограничение по устройству (device: desktop)', () => {
		expect(isFieldVisible(desktopOnlyField, {}, undefined, 'desktop')).toBe(true);
		expect(isFieldVisible(desktopOnlyField, {}, undefined, 'mobile')).toBe(false);
	});

	it('комбинирует device и dependsOn', () => {
		// Не подходит устройство, даже если dependsOn совпал
		expect(isFieldVisible(mobileWithDepField, { votes: 'rating' }, undefined, 'desktop')).toBe(false);
		// Устройство подходит, но dependsOn не совпал
		expect(isFieldVisible(mobileWithDepField, { votes: 'likes' }, undefined, 'mobile')).toBe(false);
		// И устройство, и dependsOn совпали
		expect(isFieldVisible(mobileWithDepField, { votes: 'rating' }, undefined, 'mobile')).toBe(true);
	});
});

describe('getCurrentDevice', () => {
	it('MOBILE_BREAKPOINT равен 719', () => {
		expect(MOBILE_BREAKPOINT).toBe(719);
	});

	it('возвращает mobile если ширина попадает в max-width 719px', () => {
		vi.stubGlobal('window', {
			matchMedia: (query: string) => ({
				matches: query === `(max-width: ${MOBILE_BREAKPOINT}px)`
			})
		});
		expect(getCurrentDevice()).toBe('mobile');
		vi.unstubAllGlobals();
	});

	it('возвращает desktop если ширина превышает 719px', () => {
		vi.stubGlobal('window', {
			matchMedia: () => ({ matches: false })
		});
		expect(getCurrentDevice()).toBe('desktop');
		vi.unstubAllGlobals();
	});
});
