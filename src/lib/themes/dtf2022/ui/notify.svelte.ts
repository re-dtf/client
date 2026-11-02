/** Уведомления об успехе и ошибке — как $notify у DTF: плашка справа сверху, пропадает через 3 секунды */
export type ToastType = 'success' | 'error';

export interface Toast {
	id: number;
	type: ToastType;
	message: string;
}

let nextId = 0;
let items = $state<Toast[]>([]);

export const toasts = {
	get items() {
		return items;
	},
	/** Новые сверху, как у оригинала */
	add(type: ToastType, message: string) {
		items = [{ id: nextId++, type, message }, ...items];
	},
	remove(id: number) {
		items = items.filter((toast) => toast.id !== id);
	}
};

export const notify = {
	success: (message: string) => toasts.add('success', message),
	error: (message: string) => toasts.add('error', message)
};
