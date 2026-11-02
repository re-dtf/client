import { describe, it, expect } from 'vitest';
import { bgUrls } from './ready';

describe('bgUrls', () => {
	it('достаёт адреса из url() с кавычками и без', () => {
		expect(bgUrls('url("https://a.io/x.webp"), url(/b.png), url(\'c.svg\')')).toEqual(['https://a.io/x.webp', '/b.png', 'c.svg']);
	});

	it('пропускает градиенты и none', () => {
		expect(bgUrls('none')).toEqual([]);
		expect(bgUrls('linear-gradient(red, blue), url("a.png")')).toEqual(['a.png']);
	});
});
