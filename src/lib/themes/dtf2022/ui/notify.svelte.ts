import { haptics } from '$lib/haptics';

/** Уведомления об успехе и ошибке — как $notify у DTF: плашка справа сверху, пропадает через 3 секунды */
export type ToastType = 'success' | 'error';

/** Кнопка в плашке, например «Отменить» */
export interface ToastAction {
	label: string;
	onclick: () => void;
}

export interface Toast {
	id: number;
	type: ToastType;
	message: string;
	action?: ToastAction;
}

let nextId = 0;
let items = $state<Toast[]>([]);

export const toasts = {
	get items() {
		return items;
	},
	/** Новые сверху, как у оригинала */
	add(type: ToastType, message: string, action?: ToastAction) {
		if (type === 'error') haptics.error();
		else if (type === 'success') haptics.double();
		items = [{ id: nextId++, type, message, action }, ...items];
	},
	remove(id: number) {
		items = items.filter((toast) => toast.id !== id);
	}
};

export const notify = {
	success: (message: string, action?: ToastAction) => toasts.add('success', message, action),
	error: (message: string) => toasts.add('error', message)
};
