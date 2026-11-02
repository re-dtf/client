import { describe, it, expect, vi } from 'vitest';
import { themeChain, themeSettingsSchema, themes, getTheme } from './registry';
import type { ThemeManifest } from './types';

const make = (...list: ThemeManifest[]) => new Map(list.map((t) => [t.id, t]));

const base: ThemeManifest = {
	id: 'base',
	name: 'Base',
	settings: [
		{ key: 'votes', type: 'radio', title: 'Оценки', default: 'likes', options: [{ value: 'likes', title: 'Лайки' }] },
		{ key: 'dense', type: 'toggle', title: 'Плотно', default: false }
	]
};

describe('реестр тем', () => {
	it('находит темы из папок', () => {
		expect(getTheme('dtf2022')?.name).toBe('DTF 2022');
		expect(themes.map((t) => t.id)).toEqual(expect.arrayContaining(['dtf2022']));
	});

	it('цепочка идёт от темы к основе', () => {
		const all = make(base, { id: 'fork', name: 'Fork', extends: 'base' }, { id: 'fork2', name: 'Fork 2', extends: 'fork' });

		expect(themeChain('base', all)).toEqual(['base']);
		expect(themeChain('fork2', all)).toEqual(['fork2', 'fork', 'base']);
	});

	it('не зацикливается на теме, которая наследуется сама от себя', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const all = make({ id: 'a', name: 'A', extends: 'b' }, { id: 'b', name: 'B', extends: 'a' });

		expect(themeChain('a', all)).toEqual(['a', 'b']);
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it('не падает, если основы не существует', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const all = make({ id: 'orphan', name: 'Orphan', extends: 'gone' });

		expect(themeChain('orphan', all)).toEqual(['orphan']);
		error.mockRestore();
	});

	it('форк получает настройки основы, и свои поля с тем же ключом заменяют основные', () => {
		const all = make(base, {
			id: 'fork',
			name: 'Fork',
			extends: 'base',
			settings: [
				{ key: 'dense', type: 'toggle', title: 'Плотно (форк)', default: true },
				{ key: 'extra', type: 'toggle', title: 'Своё', default: false }
			]
		});

		const schema = themeSettingsSchema('fork', all);

		expect(schema.map((f) => f.key)).toEqual(['votes', 'dense', 'extra']);
		expect(schema.find((f) => f.key === 'dense')).toMatchObject({ title: 'Плотно (форк)', default: true });
	});
});
