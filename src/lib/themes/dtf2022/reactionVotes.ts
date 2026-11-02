import type { Likes, Reactions } from '$lib/api/types';

/*
 * Лайков и дизлайков на DTF больше нет, только реакции. Виды оценки «лайк/дизлайк» и «стрелки» строятся
 * из двух реакций: одна считается голосом «за», другая — «против».
 * TODO: когда появится редактор реакций, брать эти две из настроек пользователя.
 */
export const LIKE_REACTION = 1; // ❤️
export const DISLIKE_REACTION = 23; // 😐 покерфейс, им обычно и дизлайкают

export interface Votes {
	up: number;
	down: number;
	/** 1 — голос «за», -1 — «против», 0 — нет */
	myVote: 1 | -1 | 0;
}

/** Оценка из реакций; у источников без реакций остаётся то, что прислали в `likes` */
export function votesOf({ reactions, likes }: { reactions?: Reactions; likes?: Likes }): Votes {
	if (!reactions) return { up: likes?.count ?? 0, down: likes?.dislikes ?? 0, myVote: (likes?.myVote as Votes['myVote']) ?? 0 };

	const count = (id: number) => reactions.counters.find((c) => c.id === id)?.count ?? 0;
	return {
		up: count(LIKE_REACTION),
		down: count(DISLIKE_REACTION),
		myVote: reactions.reactionId === LIKE_REACTION ? 1 : reactions.reactionId === DISLIKE_REACTION ? -1 : 0
	};
}

/** Реакции после выбора `id` (0 — снять): прежняя реакция пользователя уходит, новая добавляется */
export function applyReaction(reactions: Reactions | undefined, id: number): Reactions {
	const current = reactions ?? { counters: [], reactionId: 0 };
	const counters = current.counters.map((c) => ({ ...c }));

	const bump = (reactionId: number, delta: number) => {
		const counter = counters.find((c) => c.id === reactionId);
		if (counter) counter.count = Math.max(0, counter.count + delta);
		else if (delta > 0) counters.push({ id: reactionId, count: delta });
	};

	if (current.reactionId) bump(current.reactionId, -1);
	if (id) bump(id, 1);
	return { counters, reactionId: id };
}

/** Какую реакцию отправить при нажатии на `id`: повторное нажатие снимает */
export function nextReactionId(reactions: Reactions | undefined, id: number): number {
	return reactions?.reactionId === id ? 0 : id;
}
