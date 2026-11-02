import { api } from './index.svelte';
import type { Notification } from './types';

let items = $state.raw<Notification[]>([]);
let loading = $state(false);
let error = $state('');
// Защита от повторного запроса; в $state не держим, чтобы эффект, вызывающий load(), не подписался на неё
let busy = false;

/** Уведомления вошедшего пользователя DTF для колокольчика в шапке. */
export const notifications = {
	get items() {
		return items;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	get unread() {
		return items.filter((n) => !n.isRead).length;
	},

	async load() {
		if (busy) return;
		busy = true;
		loading = true;
		error = '';
		try {
			items = await api.getNotifications();
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
			loading = false;
		}
	},

	/** Отметить всё прочитанным: сразу у себя, на сервере — следом */
	markAllRead() {
		const ids = items.filter((n) => !n.isRead).map((n) => n.id);
		if (ids.length === 0) return;

		items = items.map((n) => ({ ...n, isRead: true }));
		api.markNotificationsRead(ids).catch((e) => console.warn('[notifications] Не удалось отметить прочитанными:', e));
	},

	clear() {
		items = [];
		error = '';
	}
};
