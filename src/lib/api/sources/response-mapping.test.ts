import { describe, it, expect } from 'vitest';
import {
	getValueByPath,
	sanitizeString,
	transformNumber,
	transformString,
	transformUnixToIso,
	transformLeonardoImage,
	sanitizeMediaItem,
	mapElement,
	applyResponseMapping,
	MAX_CONTENT_LENGTH,
	MAX_ITEMS_COUNT,
	MAX_MEDIA_COUNT
} from './response-mapping';
import type { EndpointMapping } from './types';
import { parseCommentText } from '$lib/themes/dtf2022/comments/commentText';

describe('response-mapping', () => {
	describe('getValueByPath & prototype pollution defense', () => {
		const sample = {
			id: 123,
			data: {
				user: {
					id: 456,
					name: 'Test User'
				},
				tags: ['news', 'gaming']
			}
		};

		it('should extract top-level and nested properties', () => {
			expect(getValueByPath(sample, 'id')).toBe(123);
			expect(getValueByPath(sample, 'data.user.id')).toBe(456);
			expect(getValueByPath(sample, 'data.user.name')).toBe('Test User');
			expect(getValueByPath(sample, 'data.tags.0')).toBe('news');
		});

		it('should return undefined for missing paths', () => {
			expect(getValueByPath(sample, 'nonexistent')).toBeUndefined();
			expect(getValueByPath(sample, 'data.nonexistent.field')).toBeUndefined();
			expect(getValueByPath(null, 'id')).toBeUndefined();
			expect(getValueByPath(undefined, 'id')).toBeUndefined();
		});

		it('should block prototype pollution paths', () => {
			expect(getValueByPath(sample, '__proto__.polluted')).toBeUndefined();
			expect(getValueByPath(sample, 'prototype.polluted')).toBeUndefined();
			expect(getValueByPath(sample, 'constructor.polluted')).toBeUndefined();
			expect(getValueByPath(sample, 'data.__proto__.admin')).toBeUndefined();
		});
	});

	describe('sanitizeString', () => {
		it('should strip BiDi overrides and isolates (spoofing protection)', () => {
			const bidi = 'Normal \u202Ereversed\u202C text \u2066isolate\u2069';
			expect(sanitizeString(bidi)).toBe('Normal reversed text isolate');
		});

		it('should strip C0/C1 control characters but preserve whitespace and newlines', () => {
			const textWithControl = 'Hello\u0000\u0007\u0008\u001B World!\r\nLine 2\tTabbed';
			expect(sanitizeString(textWithControl)).toBe('Hello World!\r\nLine 2\tTabbed');
		});

		it('should normalize string to canonical NFC form', () => {
			expect(sanitizeString('e\u0301')).toBe('é');
		});
	});

	describe('transformers', () => {
		it('transformNumber should convert numbers and numeric strings, rejecting NaN and Infinity', () => {
			expect(transformNumber(123)).toBe(123);
			expect(transformNumber('456')).toBe(456);
			expect(transformNumber('  789  ')).toBe(789);
			expect(transformNumber('invalid')).toBeUndefined();
			expect(transformNumber(Infinity)).toBeUndefined();
			expect(transformNumber(-Infinity)).toBeUndefined();
			expect(transformNumber(NaN)).toBeUndefined();
			expect(transformNumber(null)).toBeUndefined();
		});

		it('transformString should sanitize and truncate to MAX_CONTENT_LENGTH', () => {
			expect(transformString('Clean text')).toBe('Clean text');
			const longStr = 'a'.repeat(MAX_CONTENT_LENGTH + 500);
			const res = transformString(longStr);
			expect(res?.length).toBe(MAX_CONTENT_LENGTH);
		});

		it('transformUnixToIso should convert seconds and milliseconds to ISO strings', () => {
			// 1785046581 seconds -> 2026-07-27T06:16:21.000Z
			const iso = transformUnixToIso(1785046581);
			expect(iso).toBe(new Date(1785046581 * 1000).toISOString());

			// Milliseconds
			const ms = 1785046581000;
			expect(transformUnixToIso(ms)).toBe(new Date(ms).toISOString());

			expect(transformUnixToIso('invalid')).toBeUndefined();
			expect(transformUnixToIso(-100)).toBeUndefined();
		});

		it('transformLeonardoImage should convert valid uuid to Leonardo CDN URL', () => {
			const uuid = '8d516466-ea43-5a2f-9ec8-e979b191af41';
			const url = transformLeonardoImage(uuid);
			expect(url).toContain('leonardo.osnova.io');
			expect(url).toContain(uuid);

			// Invalid uuid rejected
			expect(transformLeonardoImage('not-a-uuid')).toBeUndefined();
			expect(transformLeonardoImage('https://evil.com/img.png')).toBeUndefined();
		});
	});

	describe('sanitizeMediaItem', () => {
		it('should accept valid image media with uuid and dimensions', () => {
			const raw = {
				type: 'image',
				data: {
					uuid: '8d516466-ea43-5a2f-9ec8-e979b191af41',
					width: 700,
					height: 700,
					size: 255776,
					type: 'jpg',
					color: '968659'
				}
			};

			const media = sanitizeMediaItem(raw);
			expect(media).toEqual({
				type: 'image',
				data: {
					uuid: '8d516466-ea43-5a2f-9ec8-e979b191af41',
					width: 700,
					height: 700,
					size: 255776,
					type: 'jpg',
					color: '968659'
				}
			});
		});

		it('should reject video: comments do not show it', () => {
			expect(sanitizeMediaItem({ type: 'video', data: { external_service: { name: 'youtube', id: 'D2N8BSvANAM' } } })).toBeNull();
		});

		it('should reject invalid media types or missing uuid for images', () => {
			expect(sanitizeMediaItem({ type: 'audio', data: {} })).toBeNull();
			expect(sanitizeMediaItem({ type: 'image', data: { uuid: 'not-valid' } })).toBeNull();
			expect(sanitizeMediaItem({ type: 'image', data: { url: 'https://evil.com' } })).toBeNull();
		});
	});

	describe('mapElement', () => {
		const mappingFields = {
			id: { from: 'id', as: 'number' as const },
			postId: { from: 'post_id', as: 'number' as const },
			authorId: { from: 'data.user.id', as: 'number' as const },
			content: { from: 'data.text' },
			createdAt: { from: 'data.date', as: 'unixToIso' as const },
			media: { from: 'data.media' }
		};

		it('should correctly map raw item to sanitized object', () => {
			const raw = {
				id: '66449400',
				post_id: '5405884',
				data: {
					date: 1784043271,
					text: 'Original comment text',
					user: { id: 10458, name: 'Author' },
					media: []
				}
			};

			const mapped = mapElement(raw, mappingFields, 5405884);
			expect(mapped).toEqual({
				id: 66449400,
				postId: 5405884,
				authorId: 10458,
				content: 'Original comment text',
				createdAt: new Date(1784043271 * 1000).toISOString(),
				media: []
			});
		});

		it('should reject element if id is missing or not a valid number', () => {
			const raw = {
				id: 'invalid-id',
				data: { text: 'Test' }
			};
			expect(mapElement(raw, mappingFields)).toBeNull();
		});

		it('should reject element if postId does not match expectedPostId', () => {
			const raw = {
				id: '123',
				post_id: '999',
				data: { text: 'Test' }
			};
			// Expected 5405884 but post_id is 999
			expect(mapElement(raw, mappingFields, 5405884)).toBeNull();
		});

		it('should enforce MAX_MEDIA_COUNT', () => {
			const raw = {
				id: 1,
				data: {
					text: 'Many media',
					media: Array.from({ length: MAX_MEDIA_COUNT + 10 }, () => ({
						type: 'image',
						data: { uuid: '8d516466-ea43-5a2f-9ec8-e979b191af41' }
					}))
				}
			};

			const mapped = mapElement(raw, mappingFields);
			expect(mapped?.media?.length).toBe(MAX_MEDIA_COUNT);
		});
	});

	describe('applyResponseMapping', () => {
		const mapping: EndpointMapping = {
			items: 'data',
			emptyStatuses: [404],
			fields: {
				id: { from: 'id', as: 'number' },
				content: { from: 'data.text' },
				authorId: { from: 'data.user.id', as: 'number' }
			}
		};

		it('should map list response matching dtfrandomizer format', () => {
			const rawResponse = {
				status: 'ok',
				data: [
					{ id: '1', data: { text: 'First', user: { id: 10 } } },
					{ id: '2', data: { text: 'Second', user: { id: 20 } } },
					{ id: 'invalid', data: { text: 'Third' } } // should be filtered out
				]
			};

			const result = applyResponseMapping<{ items: any[] }>(rawResponse, mapping);
			expect(result.items.length).toBe(2);
			expect(result.items[0]).toEqual({ id: 1, content: 'First', authorId: 10 });
			expect(result.items[1]).toEqual({ id: 2, content: 'Second', authorId: 20 });
		});

		it('should support flat ID arrays when fields is empty', () => {
			const idMapping: EndpointMapping = {
				items: 'data'
			};
			const rawResponse = {
				status: 'ok',
				data: [66449400, '66794951', 'invalid', 66797677]
			};

			const result = applyResponseMapping<{ items: number[] }>(rawResponse, idMapping);
			expect(result.items).toEqual([66449400, 66794951, 66797677]);
		});

		it('should cap items to MAX_ITEMS_COUNT', () => {
			const rawResponse = {
				data: Array.from({ length: MAX_ITEMS_COUNT + 100 }, (_, i) => ({
					id: i,
					data: { text: `Item ${i}` }
				}))
			};

			const result = applyResponseMapping<{ items: any[] }>(rawResponse, mapping);
			expect(result.items.length).toBe(MAX_ITEMS_COUNT);
		});
	});

	describe('XSS and URL scheme safety in commentText parser', () => {
		it('should parse http/https links as clickable links', () => {
			const parsed = parseCommentText('Check https://dtf.ru/games/1 for info');
			const line = parsed[0].lines[0];
			expect(line.some((part) => part.type === 'link' && part.url === 'https://dtf.ru/games/1')).toBe(true);
		});

		it('should NEVER convert javascript: or data: URIs into links', () => {
			const malicious1 = 'Click javascript:alert(1) here';
			const parsed1 = parseCommentText(malicious1);
			const line1 = parsed1[0].lines[0];
			expect(line1.some((part) => part.type === 'link')).toBe(false);

			const malicious2 = 'Look at data:text/html,<script>alert(1)</script>';
			const parsed2 = parseCommentText(malicious2);
			const line2 = parsed2[0].lines[0];
			expect(line2.some((part) => part.type === 'link')).toBe(false);
		});
	});

	describe('media from sources', () => {
		it('санитизирует media всегда, даже если для поля задан `as`', () => {
			const evil = { type: 'image', data: { uuid: 'https://evil.example/pixel.png', width: 1, height: 1, size: 1, type: 'png' } };
			const ok = { type: 'image', data: { uuid: '11111111-2222-3333-4444-555555555555', width: 1, height: 1, size: 1, type: 'png' } };
			const res = mapElement({ id: 1, media: [evil, ok] }, { id: { from: 'id' }, media: { from: 'media', as: 'string' } });
			expect(res?.media).toHaveLength(1);
			expect(res?.media[0].data.uuid).toBe('11111111-2222-3333-4444-555555555555');
		});
	});
});
