import { describe, expect, it } from 'vitest';
import { extractImageFiles, isImageFile } from './clipboard';

describe('clipboard', () => {
	it('определяет картинку по типу или расширению', () => {
		expect(isImageFile(new File([], 'pic.png', { type: 'image/png' }))).toBe(true);
		expect(isImageFile(new File([], 'photo.jpg', { type: '' }))).toBe(true);
		expect(isImageFile(new File([], 'doc.pdf', { type: 'application/pdf' }))).toBe(false);
	});

	it('извлекает файлы картинок из files', () => {
		const img = new File([], 'screenshot.png', { type: 'image/png' });
		const doc = new File([], 'doc.txt', { type: 'text/plain' });
		const data = {
			files: [img, doc]
		} as unknown as DataTransfer;

		const result = extractImageFiles(data);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(img);
	});

	it('извлекает файлы из items, если files пуст', () => {
		const img = new File([], 'blob.png', { type: 'image/png' });
		const data = {
			files: [],
			items: [
				{ kind: 'string', type: 'text/plain' },
				{ kind: 'file', type: 'image/png', getAsFile: () => img }
			]
		} as unknown as DataTransfer;

		const result = extractImageFiles(data);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(img);
	});

	it('возвращает пустой массив для пустого или невалидного буфера', () => {
		expect(extractImageFiles(null)).toEqual([]);
		expect(extractImageFiles(undefined)).toEqual([]);
		expect(extractImageFiles({ files: [] } as unknown as DataTransfer)).toEqual([]);
	});
});
