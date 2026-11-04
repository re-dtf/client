import { activeThemeSettings } from '../settings.svelte';
import { settings } from '$lib/storage/settings.svelte';

/**
 * Вид оценок у постов и комментариев:
 * likes — лайк/дизлайк (DTF начала 2023), rating — стрелки ±, reactions — реакции, как сейчас на сайте.
 * Варианты и подписи описаны в theme.ts, значение хранится в настройках выбранной темы (в том числе форка).
 */
export type VotesStyle = 'likes' | 'rating' | 'reactions';
export type ColorScheme = 'auto' | 'light' | 'dark';

export const themeSettings = {
	/** Цветовая схема: 'auto' (системная), 'light' (светлая) или 'dark' (тёмная) */
	get colorScheme(): ColorScheme {
		return settings.value.colorScheme ?? 'auto';
	},
	get votes(): VotesStyle {
		return activeThemeSettings().value.votes as VotesStyle;
	},
	/** Сторона стрелок оценки: в футере поста и в строке действий комментария */
	get arrowsSide(): 'left' | 'right' {
		return activeThemeSettings().value.arrowsSide as 'left' | 'right';
	},
	/** Порядок стрелок оценки: 'down-up' (вниз / вверх) или 'up-down' (вверх / вниз) */
	get arrowsOrder(): 'down-up' | 'up-down' {
		return (activeThemeSettings().value.arrowsOrder as 'down-up' | 'up-down') ?? 'down-up';
	},
	/** Использовать продвинутые эффекты прозрачности и размытия */
	get transparencyEffects(): boolean {
		const val = activeThemeSettings().value.transparencyEffects;
		if (typeof val === 'boolean') return val;
		if (typeof window === 'undefined') return true;
		return !window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
	}
};
