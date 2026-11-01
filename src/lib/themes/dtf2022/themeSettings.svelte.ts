import { persistedState } from '$lib/storage/persisted.svelte';

/**
 * Вид оценок у постов и комментариев:
 * likes — лайк/дизлайк (DTF начала 2022), rating — стрелки ±, reactions — реакции, как сейчас на сайте.
 * ponytail: переключателя пока нет — Settings.svelte темы ещё не сверстан.
 */
export type VotesStyle = 'likes' | 'rating' | 'reactions';

export const themeSettings = persistedState<{ votes: VotesStyle }>('redtf:dtf2022', { votes: 'likes' });
