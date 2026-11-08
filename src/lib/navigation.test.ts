import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPageState: { overlays: any[] } = { overlays: [] };
vi.mock('$app/state', () => ({
	page: {
		get state() {
			return mockPageState;
		}
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn().mockResolvedValue(undefined)
}));

import { getPostPath, getSettingsPath, pushSubstate, popSubstate, closeOverlay, resetSubstates, clearSubstates } from './navigation';
import fs from 'node:fs';
import path from 'node:path';

describe('navigation', () => {
	it('getPostPath строит правильные адреса для постов и комментариев', () => {
		expect(getPostPath({ id: 123, sourceId: 'dtf' })).toBe('/post/123');
		expect(getPostPath({ id: 123, sourceId: 'dtf' }, 456)).toBe('/post/123?comment=456');
		expect(getPostPath({ id: 123, sourceId: 'dtf' }, 'comments')).toBe('/post/123#comments');
		expect(getPostPath({ id: 123, sourceId: 'dtf' }, 'sobytiya')).toBe('/post/123#sobytiya');
		expect(getPostPath({ id: 123, sourceId: 'sourceX' })).toBe('/post/123?source=sourceX');
		expect(getPostPath({ id: 123, sourceId: 'sourceX' }, 456)).toBe('/post/123?source=sourceX&comment=456');
		expect(getPostPath({ id: 123, sourceId: 'sourceX' }, 'comments')).toBe('/post/123?source=sourceX#comments');
		expect(getPostPath({ id: 123, sourceId: 'sourceX' }, 'sobytiya')).toBe('/post/123?source=sourceX#sobytiya');
	});

	it('getSettingsPath строит правильные адреса для настроек', () => {
		expect(getSettingsPath()).toBe('/settings');
		expect(getSettingsPath('about')).toBe('/settings?page=about');
		expect(getSettingsPath('help')).toBe('/settings?page=help');
		expect(getSettingsPath('about', 'documents')).toBe('/settings?page=about&section=documents');
	});

	it('SidebarLeft в dtf2022 содержит рабочие ссылки на «О приложении» и «Хочу помочь»', () => {
		const filePath = path.resolve(__dirname, 'themes/dtf2022/SidebarLeft.svelte');
		const content = fs.readFileSync(filePath, 'utf-8');

		expect(content).toContain('?page=about');
		expect(content).toContain('?page=help');
		expect(content).toContain('?page=about&section=documents');
		expect(content).toContain("openSettings(e, 'about')");
		expect(content).toContain("openSettings(e, 'help')");
		expect(content).toContain("openSettings(e, 'about', 'documents')");
	});

	it('SidebarLeft в redtf содержит рабочие ссылки на «О приложении» и «Хочу помочь»', () => {
		const filePath = path.resolve(__dirname, 'themes/redtf/SidebarLeft.svelte');
		const content = fs.readFileSync(filePath, 'utf-8');

		expect(content).toContain('?page=about');
		expect(content).toContain('?page=help');
		expect(content).toContain('?page=about&section=documents');
		expect(content).toContain("openSettings(e, 'about')");
		expect(content).toContain("openSettings(e, 'help')");
		expect(content).toContain("openSettings(e, 'about', 'documents')");
	});

	describe('substate navigation', () => {
		const listeners = new Map<string, Function[]>();
		let backCount = 0;
		let goDeltas: number[] = [];

		beforeEach(() => {
			clearSubstates();
			listeners.clear();
			backCount = 0;
			goDeltas = [];

			vi.stubGlobal('window', {
				addEventListener: (event: string, fn: Function) => {
					const list = listeners.get(event) ?? [];
					list.push(fn);
					listeners.set(event, list);
				},
				location: { href: 'http://localhost/settings' }
			});

			vi.stubGlobal('history', {
				back: () => {
					backCount++;
					const popList = listeners.get('popstate') ?? [];
					for (const fn of popList) fn();
				},
				go: (delta: number) => {
					goDeltas.push(delta);
					const popList = listeners.get('popstate') ?? [];
					for (const fn of popList) fn();
				}
			});

			// Setup an active overlay in page.state
			mockPageState.overlays = [
				{ id: 'settings-overlay-1', type: 'settings', presentation: 'modal' }
			];
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('pushSubstate регистрирует шаг, popSubstate откатывает историю и вызывает callback', () => {
			let called = false;
			pushSubstate(() => {
				called = true;
			});

			expect(popSubstate()).toBe(true);
			expect(backCount).toBe(1);
			expect(called).toBe(true);
		});

		it('popSubstate возвращает false, если шагов нет', () => {
			expect(popSubstate()).toBe(false);
			expect(backCount).toBe(0);
		});

		it('closeOverlay при активных вложенных шагах откатывает историю на глубину + 1', () => {
			pushSubstate(() => {});
			pushSubstate(() => {});

			closeOverlay();

			expect(goDeltas).toEqual([-3]);
		});

		it('closeOverlay при отсутствии вложенных шагов делает обычный history.back()', () => {
			closeOverlay();

			expect(backCount).toBe(1);
			expect(goDeltas.length).toBe(0);
		});

		it('resetSubstates откатывает вложенные шаги до корня оверлея', () => {
			pushSubstate(() => {});
			pushSubstate(() => {});

			resetSubstates();

			expect(goDeltas).toEqual([-2]);
		});
	});
});
