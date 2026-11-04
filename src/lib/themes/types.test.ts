import { describe, it, expect } from 'vitest';
import { isFieldVisible, type SettingField } from './types';

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
});
