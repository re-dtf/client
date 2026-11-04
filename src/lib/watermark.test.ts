import { describe, expect, it } from 'vitest';
import { addWatermark, extractWatermark, REDTF_WATERMARK } from './watermark';

describe('watermark', () => {
	it('addWatermark добавляет сигнатуру в конец текста', () => {
		const text = 'Привет мир';
		const marked = addWatermark(text);
		expect(marked).toBe(text + REDTF_WATERMARK);
		expect(marked.endsWith(REDTF_WATERMARK)).toBe(true);
	});

	it('addWatermark обрезает хвостовые пробелы перед добавлением', () => {
		const text = 'Привет мир   \n';
		const marked = addWatermark(text);
		expect(marked).toBe('Привет мир' + REDTF_WATERMARK);
	});

	it('addWatermark перемещает существующий знак из середины в конец без дублирования', () => {
		const text = `Часть 1${REDTF_WATERMARK} Часть 2`;
		const marked = addWatermark(text);
		expect(marked).toBe('Часть 1 Часть 2' + REDTF_WATERMARK);
		expect(marked.split(REDTF_WATERMARK).length - 1).toBe(1);
	});

	it('extractWatermark распознаёт водяной знак и очищает текст', () => {
		const original = 'Текст комментария';
		const marked = original + REDTF_WATERMARK;
		const { text, isRedtf } = extractWatermark(marked);

		expect(isRedtf).toBe(true);
		expect(text).toBe(original);
	});

	it('extractWatermark возвращает isRedtf: false для текста без водяного знака', () => {
		const plain = 'Обычный комментарий с DTF';
		const { text, isRedtf } = extractWatermark(plain);

		expect(isRedtf).toBe(false);
		expect(text).toBe(plain);
	});

	it('extractWatermark распознаёт знак в середине (после правки на сайте DTF)', () => {
		const textWithMiddleSign = `Первая строка\n${REDTF_WATERMARK}\nВторая строка`;
		const { text, isRedtf } = extractWatermark(textWithMiddleSign);

		expect(isRedtf).toBe(true);
		expect(text).toBe('Первая строка\n\nВторая строка');
	});

	it('корректно обрабатывает пустые строки', () => {
		expect(addWatermark('')).toBe('');
		expect(extractWatermark('')).toEqual({ text: '', isRedtf: false });
	});
});
