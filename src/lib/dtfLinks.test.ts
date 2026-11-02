import { describe, it, expect } from 'vitest';
import { parseDtfUrl } from './dtfLinks';

describe('parseDtfUrl', () => {
	it('пост в разделе и пост автора, с комментарием и без', () => {
		expect(parseDtfUrl('https://dtf.ru/games/5220898-atomic-heart-dostupna')).toEqual({ type: 'post', postId: 5220898 });
		expect(parseDtfUrl('https://dtf.ru/id1157049/5220874-dtf')).toEqual({ type: 'post', postId: 5220874 });
		expect(parseDtfUrl('https://dtf.ru/hard/5218338-xbox?comment=67015878')).toEqual({ type: 'post', postId: 5218338, commentId: 67015878 });
	});

	it('профиль: /id<N> и /u/<N>-имя', () => {
		expect(parseDtfUrl('https://dtf.ru/id3312859')).toEqual({ type: 'profile', profileId: 3312859 });
		expect(parseDtfUrl('https://dtf.ru/u/120658-dzhamil/entries')).toEqual({ type: 'profile', profileId: 120658 });
	});

	it('остальное остаётся на dtf.ru', () => {
		expect(parseDtfUrl('https://dtf.ru/rules#8')).toBeUndefined();
		expect(parseDtfUrl('https://dtf.ru/gameindustry')).toBeUndefined();
		expect(parseDtfUrl('https://evil.example/games/5220898-x')).toBeUndefined();
		expect(parseDtfUrl('javascript:alert(1)')).toBeUndefined();
	});
});
