import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ dtfToken: '', isAuthenticated: false }));
const account = vi.hoisted(() => ({ value: { id: 1, name: '', description: '', commentingPermissions: 'everybody', defaultFeed: 'popular', myFeedSorting: 'new', isBlurNsfw: true, hideViewedPostsFromFeeds: false } }));
const getAccountSettings = vi.hoisted(() => vi.fn());
const updateAccountSettings = vi.hoisted(() => vi.fn());

vi.mock('$lib/storage/auth.svelte', () => ({ authStorage: auth }));
vi.mock('$lib/api/index.svelte', () => ({ api: { getAccountSettings, updateAccountSettings } }));

import { nsfwBlur } from './nsfwBlur.svelte';

describe('nsfwBlur', () => {
	beforeEach(() => {
		getAccountSettings.mockReset().mockImplementation(async () => account.value);
		updateAccountSettings.mockReset().mockResolvedValue(undefined);
	});

	it('размывает только помеченные записи', async () => {
		expect(nsfwBlur.isBlurred({})).toBe(false);
		expect(nsfwBlur.isBlurred({ isBlur: true })).toBe(true);
	});

	it('вошедшему пользователю: закрыто, пока настройки не пришли, и по настройке «Размывать NSFW»', async () => {
		auth.dtfToken = 'token-a';
		auth.isAuthenticated = true;
		expect(nsfwBlur.isBlurred({ isBlur: true })).toBe(true);

		await nsfwBlur.ensure();
		expect(nsfwBlur.isBlurred({ isBlur: true })).toBe(true);

		await nsfwBlur.disable();
		expect(updateAccountSettings).toHaveBeenCalledWith(1, { defaultFeed: 'popular', myFeedSorting: 'new', isBlurNsfw: false, hideViewedPostsFromFeeds: false });
		expect(nsfwBlur.isBlurred({ isBlur: true })).toBe(false);
	});

	it('не удалось сохранить: размытие остаётся по настройке аккаунта', async () => {
		auth.dtfToken = 'token-b';
		await nsfwBlur.ensure();
		expect(nsfwBlur.isBlurred({ isBlur: true })).toBe(true);

		updateAccountSettings.mockRejectedValue(new Error('сеть'));
		await expect(nsfwBlur.disable()).rejects.toThrow('сеть');
		expect(nsfwBlur.isBlurred({ isBlur: true })).toBe(true);
	});

	it('аноним подтверждает возраст: размытие снято до перезагрузки', () => {
		auth.dtfToken = '';
		auth.isAuthenticated = false;
		expect(nsfwBlur.isBlurred({ isBlur: true })).toBe(true);
		nsfwBlur.confirmAge();
		expect(nsfwBlur.isBlurred({ isBlur: true })).toBe(false);
	});
});
