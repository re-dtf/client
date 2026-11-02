import { notifications } from '$lib/api/notifications.svelte';

let open = $state(false);

/** Панель уведомлений одна на шапку и мобильную панель: открыта в одной — открыта в обеих. Клик внутри [data-notifications] её не закрывает */
export const notificationsPopup = {
	get open() {
		return open;
	},

	/** При открытии обновляем список; прочитанным уведомления становятся по клику или кнопкой «Пометить все» */
	set(value: boolean) {
		if (value === open) return;
		open = value;
		if (value) notifications.load();
	},

	toggle() {
		this.set(!open);
	}
};
