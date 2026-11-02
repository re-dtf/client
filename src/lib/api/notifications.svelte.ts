import { api } from './index.svelte';
import type { Notification } from './types';

let items = $state.raw<Notification[]>([]);
let loading = $state(false);
let error = $state('');
/** Увиденные в открытом списке: число на колокольчике их уже не считает, но в списке они подсвечены, пока их не перезагрузят */
let seen = $state.raw(new Set<number>());
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
		return items.filter((n) => !n.isRead && !seen.has(n.id)).length;
	},

	/** Есть подсвеченные в списке: «Пометить все» нужна, пока подсветка не снята */
	get highlighted() {
		return items.some((n) => !n.isRead);
	},

	/** Список открыт и показан: число на колокольчике сбрасывается, на сервере уведомления прочитаны, подсветка в списке остаётся */
	markSeen() {
		const ids = items.filter((n) => !n.isRead && !seen.has(n.id)).map((n) => n.id);
		if (ids.length === 0) return;

		seen = new Set([...seen, ...ids]);
		api.markNotificationsRead(ids).catch((e) => console.warn('[notifications] Не удалось отметить прочитанными:', e));
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

	/** Отметить прочитанными: сразу у себя, на сервере — следом. Без аргументов — все */
	markRead(ids = items.filter((n) => !n.isRead).map((n) => n.id)) {
		const unread = ids.filter((id) => items.some((n) => n.id === id && !n.isRead));
		if (unread.length === 0) return;

		items = items.map((n) => (unread.includes(n.id) ? { ...n, isRead: true } : n));
		api.markNotificationsRead(unread).catch((e) => console.warn('[notifications] Не удалось отметить прочитанными:', e));
	},

	clear() {
		items = [];
		seen = new Set();
		error = '';
	}
};
