import { persistedState } from '$lib/storage/persisted.svelte';
import { dtfApiProvider, mapAvatarUrl } from '$lib/api/providers/dtf';

export interface CurrentUser {
	id: number;
	name: string;
	avatarUrl?: string;
}

// Запоминаем в localStorage, чтобы аватар в шапке появлялся сразу, до ответа API
const stored = persistedState<CurrentUser | null>('redtf:cache:current-user', null);

let loading: Promise<void> | undefined;

/** Вошедший в DTF пользователь для шапки и меню профиля. */
export const currentUser = {
	get value() {
		return stored.value;
	},

	/** Обновить данные один раз за загрузку страницы */
	load() {
		loading ??= dtfApiProvider
			.getMe?.()
			.then((me) => {
				stored.value = { id: me.id, name: me.name || 'Аноним', avatarUrl: mapAvatarUrl(me, '80x80') };
			})
			.catch((e) => {
				loading = undefined;
				console.warn('[dtf2022] Не удалось получить профиль:', e);
			});
	},

	clear() {
		loading = undefined;
		stored.value = null;
	}
};
