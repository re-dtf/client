import { resolve } from '$app/paths';

/** Рассказать о приложении: системное окно «Поделиться», если оно есть, иначе адрес копируется в буфер */
export async function shareApp(): Promise<'shared' | 'copied' | 'failed'> {
	const url = new URL(resolve('/'), location.origin).href;
	try {
		if (navigator.share) {
			await navigator.share({ title: 'reDTF', text: 'reDTF — неофициальный клиент DTF', url });
			return 'shared';
		}
		await navigator.clipboard.writeText(url);
		return 'copied';
	} catch {
		// Пользователь закрыл окно «Поделиться» или буфер недоступен
		return 'failed';
	}
}
