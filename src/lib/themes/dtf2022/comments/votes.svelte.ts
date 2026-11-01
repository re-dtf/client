import type { Comment } from '$lib/api/types';
import { api } from '$lib/api/index.svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { pushOverlay } from '$lib/overlays';

/**
 * Поставить или снять реакцию на комментарий. Счётчики меняются сразу,
 * при ошибке откатываются. Без входа в DTF — открываем окно входа.
 * Лайк в виде «лайк/дизлайк» и «рейтинг» — это реакция ❤️ (id 1).
 */
export async function toggleCommentReaction(comment: Comment, reactionId: number) {
	if (comment.sourceId === 'dtf' && !authStorage.isAuthenticated) {
		pushOverlay('login', '/login');
		return;
	}

	const reactions = (comment.reactions ??= { counters: [], reactionId: 0 });
	const prevReactions = $state.snapshot(reactions);
	const prevLikes = $state.snapshot(comment.likes);

	const bump = (id: number, delta: number) => {
		const counter = reactions.counters.find((c) => c.id === id);
		if (counter) counter.count += delta;
		else if (delta > 0) reactions.counters.push({ id, count: delta });
	};

	const hadReaction = reactions.reactionId !== 0;
	const removing = reactions.reactionId === reactionId;
	if (hadReaction) bump(reactions.reactionId, -1);
	if (!removing) bump(reactionId, 1);
	reactions.reactionId = removing ? 0 : reactionId;

	// В комментариях likes.count — сумма всех реакций
	if (comment.likes) {
		comment.likes.count += removing ? -1 : hadReaction ? 0 : 1;
		comment.likes.myVote = removing ? 0 : 1;
	}

	try {
		await api.reactToComment(comment.id, reactions.reactionId, comment.sourceId);
	} catch (e) {
		comment.reactions = prevReactions;
		comment.likes = prevLikes;
		console.warn('[dtf2022] Не удалось поставить реакцию:', e);
	}
}
