import { activeThemeSettings } from '../settings.svelte';

/**
 * Вид оценок у постов и комментариев:
 * likes — лайк/дизлайк (DTF начала 2023), rating — стрелки ±, reactions — реакции, как сейчас на сайте.
 * Варианты и подписи описаны в theme.ts, значение хранится в настройках выбранной темы (в том числе форка).
 */
export type VotesStyle = 'likes' | 'rating' | 'reactions';

export const themeSettings = {
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
	/** Клик на аватар в шапке открывает меню вместо перехода в профиль */
	get avatarOpensMenu(): boolean {
		return activeThemeSettings().value.avatarOpensMenu === true;
	}
};
