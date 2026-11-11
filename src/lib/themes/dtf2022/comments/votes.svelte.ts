import type { Comment } from '$lib/api/types';
import { api } from '$lib/api/index.svelte';
import { ensureLogin } from '../actions.svelte';
import { ruleOf } from '$lib/storage/reactions.svelte';
import { applyReaction, nextReactionId, nextVoteReactionId } from '$lib/reactions';
import { notify } from '../ui/notify.svelte';
import { haptics } from '$lib/haptics';

/**
 * Поставить или снять реакцию на комментарий. Счётчики меняются сразу, при ошибке откатываются.
 * Без входа в DTF — открываем окно входа. Комментарий лежит в $state, поэтому правим его на месте.
 */
export function toggleCommentReaction(comment: Comment, reactionId: number): boolean {
	if (comment.sourceId === 'dtf' && !ensureLogin()) return false;

	const prev = $state.snapshot(comment.reactions);
	const next = nextReactionId(prev, reactionId);
	if (!next) haptics.soft();
	else if (ruleOf(next).kind === 'negative') haptics.dislike();
	else haptics.like();
	comment.reactions = applyReaction(prev, next);

	api.reactToComment(comment.id, next, comment.sourceId, comment.author).catch((e) => {
		comment.reactions = prev;
		notify.error(e.message);
	});
	return true;
}

/** Голос «за» или «против» — реакции, которые пользователь выбрал для лайка и дизлайка в настройках (или снятие уже поставленной реакции того же знака) */
export const voteComment = (comment: Comment, sign: 1 | -1) =>
	toggleCommentReaction(comment, nextVoteReactionId(comment.reactions, sign));

export async function toggleCommentFavorite(comment: Comment) {
	if (!ensureLogin()) return;

	const was = !!comment.isFavorited;
	if (was) haptics.soft();
	else haptics.click();
	comment.isFavorited = !was;

	try {
		await api.setFavorite(comment.id, 'comment', !was);
		notify.success(was ? 'Комментарий удалён из закладок' : 'Комментарий добавлен в закладки');
	} catch {
		comment.isFavorited = was;
		notify.error(was ? 'Не удалось удалить из закладок' : 'Не удалось добавить в закладки');
	}
}
