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
	}
};
