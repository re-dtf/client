import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	getProfileSubscriptions: vi.fn(),
	setSubscription: vi.fn(),
	setSubscriptionNotifications: vi.fn(),
	openOverlay: vi.fn(),
	auth: { isAuthenticated: false }
}));

vi.mock('$lib/api/index.svelte', () => ({
	api: {
		getProfileSubscriptions: mocks.getProfileSubscriptions,
		setSubscription: mocks.setSubscription,
		setSubscriptionNotifications: mocks.setSubscriptionNotifications
	}
}));

vi.mock('$lib/navigation', () => ({
	openOverlay: mocks.openOverlay
}));

vi.mock('$lib/storage/auth.svelte', () => ({
	authStorage: mocks.auth
}));

vi.mock('./ui/notify.svelte', () => ({
	notify: { error: vi.fn() }
}));

import { subscriptions } from './actions.svelte';

describe('subscriptions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		subscriptions.clear();
		mocks.auth.isAuthenticated = true;
	});

	it('возвращает initial по умолчанию, если подписка ещё не менялась', () => {
		expect(subscriptions.isSubscribed(100, false)).toBe(false);
		expect(subscriptions.isSubscribed(200, true)).toBe(true);
	});

	it('loadMine загружает подписки текущего пользователя и сохраняет их', async () => {
		mocks.getProfileSubscriptions.mockResolvedValue([
			{ id: 10, name: 'Игры', isSubscribed: true },
			{ id: 20, name: 'Кино', isSubscribed: true }
		]);

		await subscriptions.loadMine(1);

		expect(mocks.getProfileSubscriptions).toHaveBeenCalledWith(1);
		expect(subscriptions.isSubscribed(10, false)).toBe(true);
		expect(subscriptions.isSubscribed(20, false)).toBe(true);
		expect(subscriptions.isSubscribed(30, false)).toBe(false);
	});

	it('loadMine не перезаписывает статус, если пользователь уже отписался в этой сессии', async () => {
		mocks.setSubscription.mockResolvedValue(undefined);
		await subscriptions.toggle(10, true);
		expect(subscriptions.isSubscribed(10, true)).toBe(false);

		mocks.getProfileSubscriptions.mockResolvedValue([
			{ id: 10, name: 'Игры', isSubscribed: true }
		]);

		await subscriptions.loadMine(1);
		expect(subscriptions.isSubscribed(10, true)).toBe(false);
	});

	it('toggle переключает подписку и вызывает api.setSubscription', async () => {
		mocks.setSubscription.mockResolvedValue(undefined);

		await subscriptions.toggle(50, false);
		expect(subscriptions.isSubscribed(50, false)).toBe(true);
		expect(mocks.setSubscription).toHaveBeenCalledWith(50, true);

		await subscriptions.toggle(50, false);
		expect(subscriptions.isSubscribed(50, false)).toBe(false);
		expect(mocks.setSubscription).toHaveBeenCalledWith(50, false);
	});

	it('toggle откатывает состояние при ошибке API', async () => {
		mocks.setSubscription.mockRejectedValue(new Error('Network error'));

		await subscriptions.toggle(60, false);
		expect(subscriptions.isSubscribed(60, false)).toBe(false);
	});

	it('clear сбрасывает загруженные подписки', async () => {
		mocks.getProfileSubscriptions.mockResolvedValue([
			{ id: 70, name: 'DTF', isSubscribed: true }
		]);

		await subscriptions.loadMine(1);
		expect(subscriptions.isSubscribed(70, false)).toBe(true);

		subscriptions.clear();
		expect(subscriptions.isSubscribed(70, false)).toBe(false);
	});
});
