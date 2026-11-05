import { describe, it, expect } from 'vitest';
import { parseDtfUrl, dtfTargetToPath, dtfUrlToPath } from './dtfLinks';

describe('parseDtfUrl', () => {
	it('пост в разделе и пост автора, с комментарием и без', () => {
		expect(parseDtfUrl('https://dtf.ru/games/5220898-atomic-heart-dostupna')).toEqual({ type: 'post', postId: 5220898 });
		expect(parseDtfUrl('https://dtf.ru/games/5394366-remejk-the-legend-of-zelda-ocarina-of-time')).toEqual({ type: 'post', postId: 5394366 });
		expect(parseDtfUrl('https://dtf.ru/games/5394366-remejk-the-legend-of-zelda-ocarina-of-time?comment=69664424')).toEqual({
			type: 'post',
			postId: 5394366,
			commentId: 69664424
		});
		expect(parseDtfUrl('https://dtf.ru/id1157049/5220874-dtf')).toEqual({ type: 'post', postId: 5220874 });
		expect(parseDtfUrl('https://dtf.ru/hard/5218338-xbox#comments')).toEqual({ type: 'post', postId: 5218338, toComments: true });
		expect(parseDtfUrl('https://dtf.ru/hard/5218338-xbox?comment=67015878')).toEqual({ type: 'post', postId: 5218338, commentId: 67015878 });
		expect(parseDtfUrl('https://dtf.ru/games/5394366-remejk#comment-69664424')).toEqual({
			type: 'post',
			postId: 5394366,
			commentId: 69664424
		});
	});

	it('посты с префиксом /s/, короткие ссылки и http/мобильные домены', () => {
		expect(parseDtfUrl('https://dtf.ru/s/cinema/5394366-remejk')).toEqual({ type: 'post', postId: 5394366 });
		expect(parseDtfUrl('https://dtf.ru/5394366-remejk')).toEqual({ type: 'post', postId: 5394366 });
		expect(parseDtfUrl('https://dtf.ru/5394366')).toEqual({ type: 'post', postId: 5394366 });
		expect(parseDtfUrl('http://dtf.ru/5394366')).toEqual({ type: 'post', postId: 5394366 });
		expect(parseDtfUrl('https://m.dtf.ru/games/5394366-remejk')).toEqual({ type: 'post', postId: 5394366 });
		expect(parseDtfUrl('/games/5394366-remejk')).toEqual({ type: 'post', postId: 5394366 });
		expect(parseDtfUrl('/post/5394366?comment=123')).toEqual({ type: 'post', postId: 5394366, commentId: 123 });
	});

	it('профиль: /id<N> и /u/<N>-имя, а также /s/<N>', () => {
		expect(parseDtfUrl('https://dtf.ru/id3512753')).toEqual({ type: 'profile', profileId: 3512753 });
		expect(parseDtfUrl('https://dtf.ru/id3312859')).toEqual({ type: 'profile', profileId: 3312859 });
		expect(parseDtfUrl('https://dtf.ru/u/120658-dzhamil/entries')).toEqual({ type: 'profile', profileId: 120658 });
		expect(parseDtfUrl('https://dtf.ru/u/120658')).toEqual({ type: 'profile', profileId: 120658 });
		expect(parseDtfUrl('https://dtf.ru/s/120658-subsite')).toEqual({ type: 'profile', profileId: 120658 });
		expect(parseDtfUrl('/u/120658')).toEqual({ type: 'profile', profileId: 120658 });
	});

	it('остальное остаётся на dtf.ru', () => {
		expect(parseDtfUrl('https://dtf.ru/rules#8')).toBeUndefined();
		expect(parseDtfUrl('https://dtf.ru/gameindustry')).toBeUndefined();
		expect(parseDtfUrl('https://dtf.ru/s/cinema')).toBeUndefined();
		expect(parseDtfUrl('https://evil.example/games/5220898-x')).toBeUndefined();
		expect(parseDtfUrl('javascript:alert(1)')).toBeUndefined();
	});
});

describe('dtfTargetToPath и dtfUrlToPath', () => {
	it('превращает цель в локальный адрес', () => {
		expect(dtfTargetToPath({ type: 'post', postId: 5394366 })).toBe('/post/5394366');
		expect(dtfTargetToPath({ type: 'post', postId: 5394366, commentId: 69664424 })).toBe('/post/5394366?comment=69664424');
		expect(dtfTargetToPath({ type: 'post', postId: 5394366, toComments: true })).toBe('/post/5394366#comments');
		expect(dtfTargetToPath({ type: 'profile', profileId: 3512753 })).toBe('/u/3512753');
	});

	it('dtfUrlToPath преобразует URL на dtf.ru в путь приложения', () => {
		expect(dtfUrlToPath('https://dtf.ru/games/5394366-remejk-the-legend-of-zelda-ocarina-of-time')).toBe('/post/5394366');
		expect(dtfUrlToPath('https://dtf.ru/games/5394366-remejk?comment=69664424')).toBe('/post/5394366?comment=69664424');
		expect(dtfUrlToPath('https://dtf.ru/id3512753')).toBe('/u/3512753');
		expect(dtfUrlToPath('https://dtf.ru/rules')).toBeUndefined();
	});
});
