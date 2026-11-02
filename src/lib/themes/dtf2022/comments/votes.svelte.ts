import type { Comment } from '$lib/api/types';
import { api } from '$lib/api/index.svelte';
import { ensureLogin } from '../actions.svelte';
import { DISLIKE_REACTION, LIKE_REACTION, applyReaction, nextReactionId } from '../reactionVotes';
import { notify } from '../ui/notify.svelte';

/**
 * Поставить или снять реакцию на комментарий. Счётчики меняются сразу, при ошибке откатываются.
 * Без входа в DTF — открываем окно входа. Комментарий лежит в $state, поэтому правим его на месте.
 */
export function toggleCommentReaction(comment: Comment, reactionId: number): boolean {
	if (comment.sourceId === 'dtf' && !ensureLogin()) return false;

	const prev = $state.snapshot(comment.reactions);
	const next = nextReactionId(prev, reactionId);
	comment.reactions = applyReaction(prev, next);

	api.reactToComment(comment.id, next, comment.sourceId).catch((e) => {
		comment.reactions = prev;
		notify.error(e.message);
	});
	return true;
}

/** Голос «за» или «против» — это выбранные в reactionVotes две реакции */
export const voteComment = (comment: Comment, sign: 1 | -1) => toggleCommentReaction(comment, sign > 0 ? LIKE_REACTION : DISLIKE_REACTION);

export async function toggleCommentFavorite(comment: Comment) {
	if (!ensureLogin()) return;

	const was = !!comment.isFavorited;
	comment.isFavorited = !was;

	try {
		await api.setFavorite(comment.id, 'comment', !was);
		notify.success(was ? 'Комментарий удалён из закладок' : 'Комментарий добавлен в закладки');
	} catch {
		comment.isFavorited = was;
		notify.error(was ? 'Не удалось удалить из закладок' : 'Не удалось добавить в закладки');
	}
}
