import type { CommentMedia } from '../types';
import type { EndpointMapping, FieldMapping, MappingTransform } from './types';
import { getLeonardoUrl } from '../utils';

/** Максимальный допустимый размер ответа источника (5 МБ) */
export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
/** Максимальное количество элементов в ответе источника */
export const MAX_ITEMS_COUNT = 2000;
/** Максимальная длина текста комментария из источника */
export const MAX_CONTENT_LENGTH = 50000;
/** Максимальное количество медиавложений на один комментарий */
export const MAX_MEDIA_COUNT = 30;

const UUID_RE = /^[0-9a-f-]{36}$/i;

function isRecord(v: unknown): v is Record<string, any> {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Управляющие коды Unicode (категория Cc), кроме допустимых пробельных (\t, \n, \r),
 * и официальные символы управления направлением текста Unicode (свойство Bidi_Control).
 */
const CONTROL_AND_BIDI_RE = /[\p{Cc}\p{Bidi_Control}]/gu;

/**
 * Очищает строку от опасных управляющих и BiDi-символов, нормализуя в каноническую форму NFC.
 */
export function sanitizeString(val: string): string {
	return val
		.normalize('NFC')
		.replace(CONTROL_AND_BIDI_RE, (ch) => (ch === '\n' || ch === '\r' || ch === '\t' ? ch : ''));
}

/**
 * Безопасно извлекает значение из объекта по пути с точками (например, 'data.text').
 * Защищает от Prototype Pollution: запрещает сегменты __proto__, prototype, constructor.
 */
export function getValueByPath(obj: unknown, path: string): unknown {
	if (obj === null || typeof obj !== 'object' || !path) {
		return undefined;
	}
	const segments = path.split('.');
	let current: any = obj;
	for (const segment of segments) {
		if (current === null || typeof current !== 'object') {
			return undefined;
		}
		if (segment === '__proto__' || segment === 'prototype' || segment === 'constructor') {
			return undefined;
		}
		current = current[segment];
	}
	return current;
}

/**
 * Преобразует значение в число. Возвращает undefined, если число не конечное.
 */
export function transformNumber(val: unknown): number | undefined {
	if (typeof val === 'number') {
		return Number.isFinite(val) ? val : undefined;
	}
	if (typeof val === 'string' && val.trim() !== '') {
		const num = Number(val);
		return Number.isFinite(num) ? num : undefined;
	}
	return undefined;
}

/**
 * Преобразует значение в строку с санитайзингом и ограничением длины.
 */
export function transformString(val: unknown): string | undefined {
	if (val === null || val === undefined) return undefined;
	const str = sanitizeString(String(val));
	return str.length > MAX_CONTENT_LENGTH ? str.slice(0, MAX_CONTENT_LENGTH) : str;
}

/**
 * Преобразует unix-timestamp (секунды или миллисекунды) в ISO 8601 дату.
 */
export function transformUnixToIso(val: unknown): string | undefined {
	const num = transformNumber(val);
	if (num === undefined || num <= 0) return undefined;
	const d = new Date(num < 1e11 ? num * 1000 : num);
	return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Строит безопасный URL Leonardo из uuid изображения.
 */
export function transformLeonardoImage(val: unknown): string | undefined {
	if (typeof val !== 'string') return undefined;
	const uuid = val.trim();
	if (!UUID_RE.test(uuid)) return undefined;
	return getLeonardoUrl(uuid);
}

/**
 * Санитизирует один медиа-элемент, защищая от внешних URL и инъекций.
 * Допустимы только картинки и гифки с uuid Leonardo: комментарии не показывают остальные типы.
 */
export function sanitizeMediaItem(raw: unknown): CommentMedia | null {
	if (!isRecord(raw) || (raw.type !== 'image' && raw.type !== 'movie')) return null;
	const d = raw.data;
	if (!isRecord(d) || typeof d.uuid !== 'string' || !UUID_RE.test(d.uuid)) return null;

	const size = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
	const data: CommentMedia['data'] = {
		uuid: d.uuid,
		width: size(d.width),
		height: size(d.height),
		size: size(d.size),
		type: typeof d.type === 'string' && /^[a-z0-9]+$/i.test(d.type) ? d.type.toLowerCase() : 'jpg'
	};
	if (typeof d.color === 'string' && /^[0-9a-f]{3,8}$/i.test(d.color)) data.color = d.color;
	if (typeof d.duration === 'number' && Number.isFinite(d.duration) && d.duration >= 0) data.duration = d.duration;
	if (typeof d.has_audio === 'boolean') data.has_audio = d.has_audio;
	if (typeof d.base64preview === 'string' && d.base64preview.startsWith('/9j/')) {
		data.base64preview = d.base64preview.slice(0, 4096);
	}
	return { type: raw.type, data };
}

const TRANSFORMS: Record<MappingTransform, (val: unknown) => unknown> = {
	string: transformString,
	number: transformNumber,
	unixToIso: transformUnixToIso,
	leonardoImage: transformLeonardoImage
};

/** Преобразование по умолчанию, когда у поля нет `as`: по имени поля */
function defaultTransform(targetField: string, val: unknown): unknown {
	if (targetField === 'id' || targetField === 'postId' || targetField === 'authorId') return transformNumber(val);
	if (targetField === 'content') return transformString(val);
	if (typeof val === 'string') return sanitizeString(val);
	return typeof val === 'boolean' || (typeof val === 'number' && Number.isFinite(val)) ? val : undefined;
}

/**
 * Преобразует и санитайзит единичный сырой элемент по схеме полей.
 */
export function mapElement(
	raw: unknown,
	fields: Record<string, FieldMapping>,
	expectedPostId?: number
): Record<string, any> | null {
	if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
		return null;
	}

	const res: Record<string, any> = {};

	for (const [targetField, { from, as }] of Object.entries(fields)) {
		const rawVal = getValueByPath(raw, from);
		let val: unknown;
		if (targetField === 'media') {
			// Медиа всегда проходят полную санитизацию, `as` для них не действует: иначе источник подсунул бы внешние URL
			if (!Array.isArray(rawVal)) continue;
			val = [];
			for (const m of rawVal) {
				const cleaned = sanitizeMediaItem(m);
				if (cleaned) (val as CommentMedia[]).push(cleaned);
				if ((val as CommentMedia[]).length >= MAX_MEDIA_COUNT) break;
			}
		} else {
			val = as ? TRANSFORMS[as](rawVal) : defaultTransform(targetField, rawVal);
		}
		if (val !== undefined) res[targetField] = val;
	}

	// Если маппинг задан для id, он должен дать число
	if ('id' in fields && res.id === undefined) return null;

	// Защита целостности: сверка postId с ожидаемым постом
	if (expectedPostId !== undefined && res.postId !== undefined && res.postId !== expectedPostId) {
		return null;
	}

	return res;
}

/**
 * Применяет EndpointMapping к ответу сервера.
 */
export function applyResponseMapping<T>(
	rawResponse: unknown,
	mapping: EndpointMapping,
	expectedPostId?: number
): T {
	const { items: itemsPath, fields } = mapping;
	if (rawResponse === null || rawResponse === undefined) {
		return (itemsPath !== undefined ? { items: [] } : {}) as T;
	}

	// Без `items` ответ — либо массив в корне, либо один объект
	if (itemsPath === undefined && !Array.isArray(rawResponse)) {
		const single = typeof rawResponse === 'object' && fields ? mapElement(rawResponse, fields, expectedPostId) : null;
		return (single ?? {}) as T;
	}

	const list = itemsPath ? getValueByPath(rawResponse, itemsPath) : rawResponse;
	if (!Array.isArray(list)) return { items: [] } as T;

	// Без схемы полей список — плоский массив чисел (например, id)
	const hasFields = fields && Object.keys(fields).length > 0;
	const items: unknown[] = [];
	for (const rawItem of list.slice(0, MAX_ITEMS_COUNT)) {
		const mapped = hasFields ? mapElement(rawItem, fields, expectedPostId) : transformNumber(rawItem);
		if (mapped !== null && mapped !== undefined) items.push(mapped);
	}
	return { items } as T;
}
