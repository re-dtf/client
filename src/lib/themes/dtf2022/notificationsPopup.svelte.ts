import { notifications } from '$lib/api/notifications.svelte';

let open = $state(false);

/** Панель уведомлений одна на шапку и мобильную панель: открыта в одной — открыта в обеих. Клик внутри [data-notifications] её не закрывает */
export const notificationsPopup = {
	get open() {
		return open;
	},

	/** При открытии обновляем список; число на колокольчике сбрасывается сразу, подсветка в списке снимается по клику или кнопкой «Пометить все» */
	set(value: boolean) {
		if (value === open) return;
		open = value;
		if (value) notifications.load().then(() => open && notifications.markSeen());
	},

	toggle() {
		this.set(!open);
	}
};
