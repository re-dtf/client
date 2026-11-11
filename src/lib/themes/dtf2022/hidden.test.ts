import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	setPostIgnored: vi.fn(),
	setSubsiteIgnored: vi.fn(),
	openOverlay: vi.fn(),
	auth: { isAuthenticated: true }
}));

vi.mock('$lib/api/index.svelte', () => ({
	api: { setPostIgnored: mocks.setPostIgnored, setSubsiteIgnored: mocks.setSubsiteIgnored }
}));
vi.mock('$lib/navigation', () => ({ openOverlay: mocks.openOverlay }));
vi.mock('$lib/storage/auth.svelte', () => ({ authStorage: mocks.auth }));
vi.mock('$lib/api/currentUser.svelte', () => ({ currentUser: { value: undefined as { id: number } | undefined } }));
vi.mock('./ui/notify.svelte', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { currentUser } from '$lib/api/currentUser.svelte';
import { hiddenPostsLog } from '$lib/storage/hiddenPosts.svelte';
import { notify } from './ui/notify.svelte';
import { authorMenuItems, hidePost, isPostHidden, isSubsiteMuted, runAuthorAction, setSubsiteMuted } from './actions.svelte';

const post = (id: number, authorId = 1) => ({ id, sourceId: 'dtf', author: { id: authorId, name: 'Автор' } }) as any;
const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('скрытие через меню «⋯»', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.isAuthenticated = true;
	});

	it('скрывает пост сразу и отправляет запрос', async () => {
		mocks.setPostIgnored.mockResolvedValue(undefined);
		hidePost(post(10));
		expect(isPostHidden(post(10))).toBe(true);
		expect(mocks.setPostIgnored).toHaveBeenCalledWith(10, true);
		await flush();
		expect(isPostHidden(post(10))).toBe(true);
	});

	it('возвращает пост при ошибке', async () => {
		mocks.setPostIgnored.mockRejectedValue(new Error('fail'));
		hidePost(post(11));
		await flush();
		expect(isPostHidden(post(11))).toBe(false);
	});

	it('«Отменить» в тосте возвращает пост, а журнал скрытых ведётся', async () => {
		mocks.setPostIgnored.mockResolvedValue(undefined);
		const ids = () => hiddenPostsLog.value.map((item) => item.id);

		hidePost(post(40));
		expect(ids()).toContain(40);
		await flush();

		const undo = vi.mocked(notify.success).mock.calls.at(-1)![1]!;
		expect(undo.label).toBe('Отменить');
		undo.onclick();
		expect(isPostHidden(post(40))).toBe(false);
		expect(ids()).not.toContain(40);
		expect(mocks.setPostIgnored).toHaveBeenLastCalledWith(40, false);

		// если вернуть не вышло, пост остаётся скрытым и в журнале
		mocks.setPostIgnored.mockRejectedValueOnce(new Error('fail'));
		undo.onclick();
		await flush();
		expect(isPostHidden(post(40))).toBe(true);
		expect(ids()).toContain(40);
	});

	it('скрытый автор прячет все свои посты, при ошибке возвращает', async () => {
		mocks.setSubsiteIgnored.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('fail'));
		setSubsiteMuted(post(20, 7).author, true);
		expect(isPostHidden(post(21, 7))).toBe(true);
		expect(isPostHidden(post(22, 8))).toBe(false);
		setSubsiteMuted(post(23, 9).author, true);
		await flush();
		expect(isPostHidden(post(24, 9))).toBe(false);
	});

	it('профиль: состояние чёрного списка берётся из профиля, пока его не меняли, потом возвращается и откатывается', async () => {
		expect(isSubsiteMuted(50, true)).toBe(true);
		mocks.setSubsiteIgnored.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('fail'));

		setSubsiteMuted({ id: 50, name: 'Имя' }, false);
		expect(isSubsiteMuted(50, true)).toBe(false);
		expect(mocks.setSubsiteIgnored).toHaveBeenCalledWith(50, false);
		await flush();

		setSubsiteMuted({ id: 50, name: 'Имя' }, true);
		await flush();
		expect(isSubsiteMuted(50, true)).toBe(false);
	});

	it('скрыть автора работает без входа и не трогает чёрный список DTF; блокировка есть только после входа', () => {
		const author = { id: 70, name: 'Имя' };
		const values = () => authorMenuItems(author).map((item) => item.value);

		(currentUser as any).value = undefined;
		expect(values()).toEqual(['hide_author']);

		runAuthorAction('hide_author', author);
		expect(values()).toEqual(['unhide_author']);
		expect(mocks.setSubsiteIgnored).not.toHaveBeenCalled();

		(currentUser as any).value = { id: 1 };
		expect(values()).toEqual(['unhide_author', 'block_author']);
		expect(authorMenuItems(author, { blocked: true }).map((item) => item.value)).toEqual(['unhide_author', 'unblock_author']);

		runAuthorAction('unhide_author', author);
		expect(values()).toEqual(['hide_author', 'block_author']);
		(currentUser as any).value = undefined;
	});

	it('без входа открывает окно входа и ничего не скрывает', () => {
		mocks.auth.isAuthenticated = false;
		hidePost(post(30));
		expect(mocks.openOverlay).toHaveBeenCalledWith({ type: 'login' });
		expect(isPostHidden(post(30))).toBe(false);
	});
});
