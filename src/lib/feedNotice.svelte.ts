/*
 * Межпостное уведомление в ленте («Нравится reDTF? Поддержите…»), как плашка «Вакансии» у DTF.
 * Появляется спустя несколько дней после первого запуска. «Позже» откладывает его на две недели,
 * «Больше не показывать» убирает насовсем. Состояние лежит в слое data и никуда не отправляется.
 */
import { persistedState } from './storage/persisted.svelte';

const DAY = 86_400_000;
/** Сколько дней после первого запуска плашки нет */
export const SHOW_AFTER = 3 * DAY;
/** На сколько дней «Позже» прячет плашку */
export const SNOOZE_FOR = 14 * DAY;
/** После какого поста по счёту плашка вставляется в ленту */
export const NOTICE_AFTER_POST = 7;

export interface NoticeState {
	/** Когда приложение запустили впервые, мс */
	firstSeen: number;
	/** До какого момента плашка спрятана («Позже»), мс */
	hiddenUntil: number;
	/** Нажали «Больше не показывать» */
	dismissed: boolean;
}

export const isNoticeDue = (state: NoticeState, now = Date.now()) =>
	!state.dismissed && now >= state.hiddenUntil && now - state.firstSeen >= SHOW_AFTER;

const store = persistedState<NoticeState>('redtf:data:feedNotice', { firstSeen: 0, hiddenUntil: 0, dismissed: false });
// Отсчёт начинается с первого запуска
if (!store.value.firstSeen) store.patch({ firstSeen: Date.now() });

export const feedNotice = {
	get due() {
		return isNoticeDue(store.value);
	},
	later: () => store.patch({ hiddenUntil: Date.now() + SNOOZE_FOR }),
	never: () => store.patch({ dismissed: true })
};
