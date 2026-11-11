import { describe, expect, it } from 'vitest';
import { catalogTags, filterCatalog, isInstalled, parseCatalog } from './catalog';
import type { SourceState } from './types';

const entry = (over: Record<string, unknown> = {}) => ({
	id: 'a',
	name: 'Архив',
	description: 'Удалённые комментарии',
	author: 'Nikos',
	manifestUrl: 'https://example.com/a.json',
	tags: ['comments', 'archive'],
	...over
});

describe('parseCatalog', () => {
	it('отбрасывает битые записи, чужие схемы иконок и ставит проверенные первыми', () => {
		const { sources, updatedAt } = parseCatalog({
			lastUpdated: '2026-11-11T23:32:00Z',
			sources: [
				entry({ id: 'plain' }),
				entry({ id: 'ok', verified: true, icon: 'javascript:alert(1)' }),
				entry({ id: 'img', icon: 'https://example.com/i.png' }),
				{ id: 'no-manifest', name: 'x' },
				null
			]
		});
		expect(sources.map((s) => s.id)).toEqual(['ok', 'plain', 'img']);
		expect(sources[0].icon).toBeUndefined();
		expect(sources[2].icon).toBe('https://example.com/i.png');
		expect(updatedAt?.getUTCFullYear()).toBe(2026);
	});

	it('не принимает ответ без списка источников', () => {
		expect(() => parseCatalog({ sources: 'nope' })).toThrow();
		expect(() => parseCatalog(null)).toThrow();
	});
});

describe('filterCatalog', () => {
	const sources = parseCatalog({
		sources: [entry(), entry({ id: 'b', name: 'Реакции', description: 'Свои реакции', tags: ['reactions'] })]
	}).sources;

	it('ищет по тексту без учёта регистра и по тегу', () => {
		expect(filterCatalog(sources, 'АРХИВ', null).map((s) => s.id)).toEqual(['a']);
		expect(filterCatalog(sources, '', 'reactions').map((s) => s.id)).toEqual(['b']);
		expect(filterCatalog(sources, 'архив', 'reactions')).toEqual([]);
	});

	it('собирает теги по частоте', () => {
		expect(catalogTags(sources)).toEqual(['comments', 'archive', 'reactions']);
	});
});

describe('isInstalled', () => {
	const source = parseCatalog({ sources: [entry()] }).sources[0];
	const installed = (url: string, id: string) => [{ manifestUrl: url, manifest: { id } }] as SourceState[];

	it('узнаёт установленный источник по адресу манифеста или по id', () => {
		expect(isInstalled(source, installed('https://example.com/a.json', 'other'))).toBe(true);
		expect(isInstalled(source, installed('github:me/fork', 'a'))).toBe(true);
		expect(isInstalled(source, installed('https://example.com/b.json', 'b'))).toBe(false);
	});
});
