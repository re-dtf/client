import { describe, expect, it } from 'vitest';
import { getCommentBadge } from './clientBadge';

describe('clientBadge', () => {
	it('возвращает re: бейдж для комментариев с isRedtf: true при mode="all"', () => {
		const badge = getCommentBadge({ isRedtf: true, deviceSource: null }, 'all');
		expect(badge).toEqual({
			type: 'redtf',
			label: 're:',
			title: 'Отправлено через reDTF'
		});
	});

	it('возвращает re: бейдж при mode="redtf_only"', () => {
		const badge = getCommentBadge({ isRedtf: true }, 'redtf_only');
		expect(badge?.type).toBe('redtf');
	});

	it('не возвращает re: бейдж при mode="none"', () => {
		const badge = getCommentBadge({ isRedtf: true }, 'none');
		expect(badge).toBeNull();
	});

	it('возвращает Android бейдж при mode="all"', () => {
		const badge = getCommentBadge({ deviceSource: 'android-app' }, 'all');
		expect(badge).toEqual({
			type: 'android',
			label: 'Android',
			title: 'Отправлено из приложения для Android',
			icon: 'v_android'
		});
	});

	it('не возвращает Android бейдж при mode="redtf_only" или "none"', () => {
		expect(getCommentBadge({ deviceSource: 'android-app' }, 'redtf_only')).toBeNull();
		expect(getCommentBadge({ deviceSource: 'android-app' }, 'none')).toBeNull();
	});

	it('возвращает iOS бейдж при mode="all"', () => {
		const badge = getCommentBadge({ deviceSource: 'ios-app' }, 'all');
		expect(badge).toEqual({
			type: 'ios',
			label: 'iOS',
			title: 'Отправлено из приложения для iOS',
			icon: 'v_apple'
		});
	});

	it('не возвращает iOS бейдж при mode="redtf_only" или "none"', () => {
		expect(getCommentBadge({ deviceSource: 'ios-app' }, 'redtf_only')).toBeNull();
		expect(getCommentBadge({ deviceSource: 'ios-app' }, 'none')).toBeNull();
	});

	it('возвращает null для обычного веб-комментария (deviceSource: null)', () => {
		expect(getCommentBadge({ deviceSource: null }, 'all')).toBeNull();
		expect(getCommentBadge({}, 'all')).toBeNull();
	});
});
