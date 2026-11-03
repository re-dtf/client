import type { Comment } from '$lib/api/types';
import { api } from '$lib/api/index.svelte';
import { ensureLogin } from '../actions.svelte';
import { applyReaction, nextReactionId } from '$lib/reactions';
import { voteReaction } from '$lib/storage/reactions.svelte';
import { notify } from '../ui/notify.svelte';
import { haptics } from '$lib/haptics';

/**
 * Поставить или снять реакцию на комментарий. Счётчики меняются сразу, при ошибке откатываются.
 * Без входа в DTF — открываем окно входа. Комментарий лежит в $state, поэтому правим его на месте.
 */
export function toggleCommentReaction(comment: Comment, reactionId: number): boolean {
	if (comment.sourceId === 'dtf' && !ensureLogin()) return false;

	haptics.click();
	const prev = $state.snapshot(comment.reactions);
	const next = nextReactionId(prev, reactionId);
	comment.reactions = applyReaction(prev, next);

	api.reactToComment(comment.id, next, comment.sourceId, comment.author).catch((e) => {
		comment.reactions = prev;
		notify.error(e.message);
	});
	return true;
}

/** Голос «за» или «против» — реакции, которые пользователь выбрал для лайка и дизлайка в настройках */
export const voteComment = (comment: Comment, sign: 1 | -1) => toggleCommentReaction(comment, voteReaction(sign));

export async function toggleCommentFavorite(comment: Comment) {
	if (!ensureLogin()) return;

	haptics.click();
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
