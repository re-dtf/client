import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPageState: { overlays: any[] } = { overlays: [] };
vi.mock('$app/state', () => ({
	page: {
		get state() {
			return mockPageState;
		},
		route: { id: '/' },
		params: {},
		url: new URL('http://localhost/')
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn().mockResolvedValue(undefined)
}));

import { goto } from '$app/navigation';
import { getPostPath, getPostShareUrl, getSettingsPath, pushSubstate, popSubstate, closeOverlay, resetSubstates, clearSubstates, openPost, openDtfUrl, openDtfLink } from './navigation';
import { settings } from './storage/settings.svelte';
import { embedToPost } from './api/embed';
import { clearPostCache, peekPost } from './postCache';
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

	it('getPostShareUrl строит адрес через сервис превью или напрямую в зависимости от настроек, сервиса и источника', () => {
		const shareService = 'https://share.example.com';
		expect(getPostShareUrl({ id: 123, sourceId: 'dtf' }, undefined, undefined, shareService)).toBe('https://share.example.com/post/123');
		expect(getPostShareUrl({ id: 123, sourceId: 'dtf' }, 456, undefined, shareService)).toBe('https://share.example.com/post/123?comment=456');

		// Без адреса сервиса превью -> прямой адрес клиента
		expect(getPostShareUrl({ id: 123, sourceId: 'dtf' }, undefined, 'https://redtf.org', '')).toBe('https://redtf.org/post/123');

		// Для сторонних источников -> прямой адрес клиента
		expect(getPostShareUrl({ id: 123, sourceId: 'sourceX' }, undefined, 'https://redtf.org', shareService)).toBe('https://redtf.org/post/123?source=sourceX');

		// При отключённой настройке useSharePreview -> прямой адрес клиента
		settings.patch({ useSharePreview: false });
		try {
			expect(getPostShareUrl({ id: 123, sourceId: 'dtf' }, undefined, 'https://redtf.org', shareService)).toBe('https://redtf.org/post/123');
		} finally {
			settings.patch({ useSharePreview: true });
		}
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

	describe('openDtfUrl и openDtfLink', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			mockPageState.overlays = [];
		});

		it('openDtfUrl открывает оверлей для ссылок на посты, профили и теги', () => {
			expect(openDtfUrl('https://dtf.ru/games/5394366-remejk')).toBe(true);
			expect(goto).toHaveBeenCalledWith(
				'/post/5394366',
				expect.objectContaining({
					shallow: true,
					state: expect.objectContaining({
						overlays: expect.arrayContaining([
							expect.objectContaining({
								type: 'post',
								data: expect.objectContaining({ postId: 5394366 })
							})
						])
					})
				})
			);

			expect(openDtfUrl('https://dtf.ru/u/120658-dzhamil')).toBe(true);
			expect(openDtfUrl('https://dtf.ru/tag/xbox')).toBe(true);
			expect(openDtfUrl('https://dtf.ru/notifications')).toBe(true);
		});

		it('открывает короткое имя профиля оверлеем без ожидания API', () => {
			const event = { button: 0, preventDefault: vi.fn() } as unknown as MouseEvent;
			expect(openDtfLink(event, 'https://dtf.ru/donatovnet')).toBe(true);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(goto).toHaveBeenCalledWith('/u/donatovnet', expect.objectContaining({
				shallow: true,
				state: { overlays: [expect.objectContaining({ type: 'profile', data: { profileId: 'donatovnet' } })] }
			}));
		});

		it('открывает короткое имя в новой вкладке для Ctrl и средней кнопки', () => {
			const open = vi.fn();
			vi.stubGlobal('window', { open });
			try {
				for (const options of [{ button: 0, ctrlKey: true }, { button: 1 }]) {
					const event = { ...options, preventDefault: vi.fn() } as unknown as MouseEvent;
					expect(openDtfLink(event, 'https://dtf.ru/donatovnet')).toBe(true);
					expect(event.preventDefault).toHaveBeenCalled();
				}
				expect(open).toHaveBeenCalledTimes(2);
				expect(open).toHaveBeenCalledWith('/u/donatovnet', '_blank');
				expect(goto).not.toHaveBeenCalled();
			} finally {
				vi.unstubAllGlobals();
			}
		});

		it('не открывает ссылку повторно при всплытии уже обработанного клика', () => {
			const event = { defaultPrevented: true, button: 0, preventDefault: vi.fn() } as unknown as MouseEvent;
			expect(openDtfLink(event, '/u/donatovnet')).toBe(false);
			expect(goto).not.toHaveBeenCalled();
		});

		it('openDtfUrl возвращает false для неподдерживаемых адресов', () => {
			expect(openDtfUrl('https://dtf.ru/rules')).toBe(false);
			expect(openDtfUrl('https://example.com/test')).toBe(false);
		});

		it('openDtfLink отменяет стандартный клик и вызывает открытие', () => {
			const preventDefault = vi.fn();
			const event = {
				button: 0,
				ctrlKey: false,
				metaKey: false,
				shiftKey: false,
				preventDefault
			} as unknown as MouseEvent;

			expect(openDtfLink(event, 'https://dtf.ru/post/5394366')).toBe(true);
			expect(preventDefault).toHaveBeenCalled();
		});

		it('openDtfLink при клике с новой вкладкой открывает window.open', () => {
			const preventDefault = vi.fn();
			const openMock = vi.fn();
			vi.stubGlobal('window', { open: openMock });

			const event = {
				button: 1, // средняя кнопка мыши
				ctrlKey: false,
				metaKey: false,
				shiftKey: false,
				preventDefault
			} as unknown as MouseEvent;

			expect(openDtfLink(event, 'https://dtf.ru/post/5394366')).toBe(true);
			expect(preventDefault).toHaveBeenCalled();
			expect(openMock).toHaveBeenCalledWith('/post/5394366', '_blank');
			vi.unstubAllGlobals();
		});

		it('openPost не кладёт карточку репоста (embedToPost) в кэш полных постов', () => {
			clearPostCache();
			const embed = embedToPost({ original_id: 5404140, title: 'Оригинал', blocks: [{ type: 'text', cover: true, data: { text: 'превью' } }] });
			const event = { button: 0, preventDefault: vi.fn() } as unknown as MouseEvent;

			openPost(event, embed);

			expect(peekPost(5404140)).toBeUndefined();
		});
	});
});
