import { api } from '$lib/api/index.svelte';
import type { AccountSettings } from '$lib/api/types';
import { authStorage } from '$lib/storage/auth.svelte';

/*
 * Размытие записей 18+ в ленте. Правило клиента DTF: запись помечена (`isBlur`), и пользователь
 * либо аноним, либо включил «Размывать NSFW». Пока настройки аккаунта не пришли, запись остаётся закрытой.
 */

/** Настройки аккаунта: общий кэш на все карточки, сбрасывается при смене сессии */
let account = $state<AccountSettings>();
let loadedFor = '';
/** Аноним подтвердил, что ему есть 18: размытие снято до перезагрузки */
let ageConfirmed = $state(false);

export const nsfwBlur = {
	/** Нужно ли размывать запись сейчас (без учёта «Показать» у конкретной карточки) */
	isBlurred(post: { isBlur?: boolean }): boolean {
		if (!post.isBlur || ageConfirmed) return false;
		return !authStorage.isAuthenticated || account?.isBlurNsfw !== false;
	},

	/** Подгрузить настройки аккаунта; нужны только вошедшему пользователю */
	async ensure(): Promise<void> {
		const token = authStorage.dtfToken;
		if (!token) return;
		if (loadedFor === token) return;
		loadedFor = token;
		try {
			account = await api.getAccountSettings();
		} catch {
			loadedFor = '';
		}
	},

	/** Экран «Моя лента» сохранил настройки: карточки сразу работают по новому значению */
	sync(settings: AccountSettings) {
		account = settings;
		loadedFor = authStorage.dtfToken;
	},

	confirmAge() {
		ageConfirmed = true;
	},

	/** «Показывать всегда»: выключает размытие в настройках аккаунта */
	async disable(): Promise<void> {
		await nsfwBlur.ensure();
		if (!account) return;
		const before = account;
		account = { ...account, isBlurNsfw: false };
		const { defaultFeed, myFeedSorting, hideViewedPostsFromFeeds } = account;
		try {
			await api.updateAccountSettings(account.id, { defaultFeed, myFeedSorting, isBlurNsfw: false, hideViewedPostsFromFeeds });
		} catch (e) {
			account = before;
			throw e;
		}
	}
};
