import { persistedState } from './persisted.svelte';

/*
 * Заметки о пользователях: личная пометка «зачем он мне» рядом с именем. Видит только владелец, никуда не уходит.
 * Ключ — id пользователя, а не имя и не адрес профиля: они меняются, id нет. Имя храним для будущего списка заметок.
 */
export const REMARK_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
export type RemarkColor = (typeof REMARK_COLORS)[number];

/** Достаточно для короткой пометки; длинные тексты в чипе всё равно не поместятся */
export const REMARK_MAX = 200;

export interface Remark {
	text: string;
	color?: RemarkColor;
	/** Имя на момент записи */
	name: string;
	updatedAt: string;
}

export const remarks = persistedState<Record<number, Remark>>('redtf:data:remarks', {});

export const getRemark = (id: number): Remark | undefined => remarks.value[id];

/** Сохраняет заметку; пустой текст удаляет её. Возвращает записанную заметку или undefined, если её не осталось */
export function setRemark(user: { id: number; name: string }, text: string, color?: RemarkColor): Remark | undefined {
	const clean = text.trim().slice(0, REMARK_MAX);
	if (!clean) {
		removeRemark(user.id);
		return undefined;
	}
	const remark: Remark = { text: clean, ...(color ? { color } : {}), name: user.name, updatedAt: new Date().toISOString() };
	remarks.value = { ...remarks.value, [user.id]: remark };
	return remark;
}

export function removeRemark(id: number) {
	const { [id]: _removed, ...rest } = remarks.value;
	remarks.value = rest;
}

/** Вернуть заметку как была (отмена удаления) */
export function restoreRemark(id: number, remark: Remark) {
	remarks.value = { ...remarks.value, [id]: remark };
}
