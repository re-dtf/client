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
export function toggleCommentReaction(
	comment: Comment,
	reactionId: number,
	onpatch?: (patch: Partial<Comment>) => void
): boolean {
	if (comment.sourceId === 'dtf' && !ensureLogin()) return false;

	const prev = $state.snapshot(comment.reactions);
	const next = nextReactionId(prev, reactionId);
	if (!next) haptics.soft();
	else if (ruleOf(next).kind === 'negative') haptics.dislike();
	else haptics.like();
	const reactions = applyReaction(prev, next);
	if (onpatch) onpatch({ reactions });
	else comment.reactions = reactions;

	api.reactToComment(comment.id, next, comment.sourceId, comment.author).catch((e) => {
		if (onpatch) onpatch({ reactions: prev });
		else comment.reactions = prev;
		notify.error(e.message);
	});
	return true;
}

/** Голос «за» или «против» — реакции, которые пользователь выбрал для лайка и дизлайка в настройках (или снятие уже поставленной реакции того же знака) */
export const voteComment = (comment: Comment, sign: 1 | -1, onpatch?: (patch: Partial<Comment>) => void) =>
	toggleCommentReaction(comment, nextVoteReactionId(comment.reactions, sign), onpatch);

export async function toggleCommentFavorite(comment: Comment, onpatch?: (patch: Partial<Comment>) => void) {
	if (!ensureLogin()) return;

	const was = !!comment.isFavorited;
	if (was) haptics.soft();
	else haptics.click();
	if (onpatch) onpatch({ isFavorited: !was });
	else comment.isFavorited = !was;

	try {
		await api.setFavorite(comment.id, 'comment', !was);
		notify.success(was ? 'Комментарий удалён из закладок' : 'Комментарий добавлен в закладки');
	} catch {
		if (onpatch) onpatch({ isFavorited: was });
		else comment.isFavorited = was;
		notify.error(was ? 'Не удалось удалить из закладок' : 'Не удалось добавить в закладки');
	}
}
