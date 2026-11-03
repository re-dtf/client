import { persistedState } from '$lib/storage/persisted.svelte';
import { api } from './index.svelte';
import type { CurrentUser } from './types';

// Копия в localStorage (слой cache), чтобы аватар в шапке появлялся сразу, до ответа API
const stored = persistedState<CurrentUser | null>('redtf:cache:current-user', null);

let loading: Promise<void> | undefined;

/** Вошедший в DTF пользователь для шапки и меню профиля. */
export const currentUser = {
	get value() {
		return stored.value;
	},

	/** Обновить данные один раз за загрузку страницы */
	load() {
		loading ??= api
			.getMe()
			.then((me) => {
				stored.value = me;
			})
			.catch((e) => {
				loading = undefined;
				console.warn('[currentUser] Не удалось получить профиль:', e);
			});
	},

	/** Перечитать после смены имени или био */
	refresh() {
		loading = undefined;
		this.load();
	},

	clear() {
		loading = undefined;
		stored.value = null;
	}
};
