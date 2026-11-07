import { describe, it, expect } from 'vitest';
import { linkifyHashtags } from './hashtags';

describe('linkifyHashtags', () => {
	it('превращает теги в ссылки на страницу тега', () => {
		expect(linkifyHashtags('<p>#новости #xbox #контроллеры </p>')).toBe(
			'<p><a href="https://dtf.ru/tag/%D0%BD%D0%BE%D0%B2%D0%BE%D1%81%D1%82%D0%B8">#новости</a> <a href="https://dtf.ru/tag/xbox">#xbox</a> <a href="https://dtf.ru/tag/%D0%BA%D0%BE%D0%BD%D1%82%D1%80%D0%BE%D0%BB%D0%BB%D0%B5%D1%80%D1%8B">#контроллеры</a> </p>'
		);
	});

	it('не трогает решётку внутри слова, цвета в ссылках и код', () => {
		expect(linkifyHashtags('<p>C#sharp и a#b</p>')).toBe('<p>C#sharp и a#b</p>');
		expect(linkifyHashtags('<p><a href="https://dtf.ru/x">#уже ссылка</a></p>')).toBe('<p><a href="https://dtf.ru/x">#уже ссылка</a></p>');
		expect(linkifyHashtags('<code>#fff</code> и <pre>#000</pre>')).toBe('<code>#fff</code> и <pre>#000</pre>');
		expect(linkifyHashtags('<p>&#39;кавычка&#39;</p>')).toBe('<p>&#39;кавычка&#39;</p>');
	});

	it('после ссылки теги снова работают', () => {
		expect(linkifyHashtags('<a href="/x">ссылка</a> #тег')).toBe('<a href="/x">ссылка</a> <a href="https://dtf.ru/tag/%D1%82%D0%B5%D0%B3">#тег</a>');
	});
});
