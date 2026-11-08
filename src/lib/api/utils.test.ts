import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getAudioUrl,
	getLeonardoUrl,
	getLeonardoOriginalUrl,
	resolveImageExtension,
	getDownloadFilename,
	downloadImage
} from './utils';

describe('api/utils', () => {
	describe('getLeonardoUrl', () => {
		it('возвращает пустую строку для пустого uuid', () => {
			expect(getLeonardoUrl('')).toBe('');
		});

		it('возвращает исходную ссылку, если uuid уже является полным URL', () => {
			expect(getLeonardoUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
			expect(getLeonardoUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
		});

		it('формирует ссылку на превью по ширине', () => {
			expect(getLeonardoUrl('test-uuid-1', { width: 1024 })).toBe(
				'https://leonardo.osnova.io/test-uuid-1/-/preview/1024/-/format/webp/'
			);
		});

		it('формирует ссылку с обрезкой scale_crop', () => {
			expect(getLeonardoUrl('test-uuid-2', { scale_crop: '200x200' })).toBe(
				'https://leonardo.osnova.io/test-uuid-2/-/scale_crop/200x200/-/format/webp/'
			);
		});

		it('поддерживает кастомный формат', () => {
			expect(getLeonardoUrl('test-uuid-3', { width: 500, format: 'jpeg' })).toBe(
				'https://leonardo.osnova.io/test-uuid-3/-/preview/500/-/format/jpeg/'
			);
		});

		it('возвращает оригинал при options.original: true', () => {
			expect(getLeonardoUrl('test-uuid-4', { original: true })).toBe(
				'https://leonardo.osnova.io/test-uuid-4/'
			);
		});
	});

	describe('getAudioUrl', () => {
		it('кодирует имя файла', () => {
			expect(getAudioUrl('u-1', 'my track.mp3')).toBe('https://leonardo.osnova.io/audio/u-1/my%20track.mp3');
		});
	});

	describe('getLeonardoOriginalUrl', () => {
		it('формирует прямую ссылку на оригинал изображения без сжатия', () => {
			expect(getLeonardoOriginalUrl('abc-123')).toBe('https://leonardo.osnova.io/abc-123/');
		});

		it('возвращает пустую строку для пустого uuid', () => {
			expect(getLeonardoOriginalUrl('')).toBe('');
		});

		it('сохраняет внешние URL без изменений', () => {
			expect(getLeonardoOriginalUrl('https://cdn.example.org/photo.png')).toBe(
				'https://cdn.example.org/photo.png'
			);
		});
	});

	describe('resolveImageExtension', () => {
		it('определяет расширение по mime-типу', () => {
			expect(resolveImageExtension('image/jpeg')).toBe('jpg');
			expect(resolveImageExtension('image/png')).toBe('png');
			expect(resolveImageExtension('image/gif')).toBe('gif');
			expect(resolveImageExtension('image/webp')).toBe('webp');
			expect(resolveImageExtension('video/mp4')).toBe('mp4');
		});

		it('использует type, если mime отсутствует или application/octet-stream', () => {
			expect(resolveImageExtension(undefined, 'png')).toBe('png');
			expect(resolveImageExtension('application/octet-stream', 'jpeg')).toBe('jpg');
			expect(resolveImageExtension('', '.gif')).toBe('gif');
		});

		it('возвращает jpg по умолчанию', () => {
			expect(resolveImageExtension()).toBe('jpg');
			expect(resolveImageExtension('application/octet-stream')).toBe('jpg');
		});
	});

	describe('getDownloadFilename', () => {
		it('формирует имя из uuid и расширения', () => {
			expect(getDownloadFilename('4c869051-89c4-5895', 'jpg')).toBe('4c869051-89c4-5895.jpg');
			expect(getDownloadFilename('abc', 'png')).toBe('abc.png');
		});

		it('извлекает имя файла из внешнего URL, если оно есть', () => {
			expect(getDownloadFilename('https://example.com/photos/landscape.webp', 'webp')).toBe(
				'landscape.webp'
			);
		});
	});

	describe('downloadImage', () => {
		let createdElements: HTMLElement[] = [];
		let clickedLinks: { href: string; download: string; target?: string }[] = [];

		beforeEach(() => {
			createdElements = [];
			clickedLinks = [];

			vi.stubGlobal('window', {});

			vi.stubGlobal('URL', {
				createObjectURL: vi.fn(() => 'blob:mock-url'),
				revokeObjectURL: vi.fn()
			});

			vi.stubGlobal('document', {
				createElement: (tag: string) => {
					const el = {
						tagName: tag.toUpperCase(),
						href: '',
						download: '',
						target: '',
						rel: '',
						click: vi.fn(function () {
							clickedLinks.push({
								href: el.href,
								download: el.download,
								target: el.target
							});
						}),
						remove: vi.fn()
					};
					createdElements.push(el as any);
					return el;
				},
				body: {
					appendChild: vi.fn(),
					removeChild: vi.fn()
				}
			});
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('скачивает файл через blob и временную ссылку', async () => {
			const mockBlob = { type: 'image/jpeg' };
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				blob: vi.fn().mockResolvedValue(mockBlob)
			}));

			await downloadImage('https://leonardo.osnova.io/image-1/', 'image-1');

			expect(fetch).toHaveBeenCalledWith('https://leonardo.osnova.io/image-1/');
			expect(clickedLinks.length).toBe(1);
			expect(clickedLinks[0].href).toBe('blob:mock-url');
			expect(clickedLinks[0].download).toBe('image-1.jpg');
		});

		it('при ошибке сети переключается на открытие в новой вкладке', async () => {
			vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

			await downloadImage('https://leonardo.osnova.io/image-fail/', 'image-fail', 'png');

			expect(clickedLinks.length).toBe(1);
			expect(clickedLinks[0].href).toBe('https://leonardo.osnova.io/image-fail/');
			expect(clickedLinks[0].target).toBe('_blank');
			expect(clickedLinks[0].download).toBe('image-fail.png');
		});
	});
});
