import type { Likes, Reactions } from '$lib/api/types';
import { ruleOf, voteReaction } from '$lib/storage/reactions.svelte';
import { REACTIONS } from '$lib/config/reactions';

/*
 * Лайков и дизлайков на DTF больше нет, только реакции. «Оценка» поста или комментария строится из них
 * по правилам пользователя (storage/reactions.svelte.ts): плюсовые реакции дают очки «за», минусовые — «против».
 */

export interface Votes {
	/** Очки плюсовых реакций */
	up: number;
	/** Очки минусовых реакций, по модулю */
	down: number;
	/** 1 — своя реакция плюсовая, -1 — минусовая, 0 — нет или нейтральная */
	myVote: 1 | -1 | 0;
}

interface Rated {
	reactions?: Reactions;
	likes?: Likes;
	isPinned?: boolean;
}

/** Оценка из реакций; у источников без реакций остаётся то, что прислали в `likes` */
export function votesOf({ reactions, likes }: Rated): Votes {
	if (!reactions) return { up: likes?.count ?? 0, down: likes?.dislikes ?? 0, myVote: (likes?.myVote as Votes['myVote']) ?? 0 };

	let up = 0;
	let down = 0;
	for (const { id, count } of reactions.counters) {
		const { kind, weight } = ruleOf(id);
		if (kind === 'positive') up += count * weight;
		else if (kind === 'negative') down += count * weight;
	}
	const mine = ruleOf(reactions.reactionId).kind;
	return { up, down, myVote: mine === 'positive' ? 1 : mine === 'negative' ? -1 : 0 };
}

/** Рейтинг: очки «за» минус очки «против» */
export function scoreOf(item: Rated): number {
	const { up, down } = votesOf(item);
	return up - down;
}

/** От лучших к худшим (или от худших к лучшим при ascending=true); закреплённые остаются сверху, при равенстве сохраняется прежний порядок */
export function rankByScore<T extends Rated>(items: T[], ascending = false): T[] {
	return items
		.map((item) => ({ item, score: scoreOf(item) }))
		.sort((a, b) => Number(!!b.item.isPinned) - Number(!!a.item.isPinned) || (ascending ? a.score - b.score : b.score - a.score))
		.map(({ item }) => item);
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

/**
 * Реакция для отправки при клике на лайк (+1) или дизлайк (-1).
 * Если на кнопке уже висит своя реакция (того же знака или нейтральная у плюса),
 * возвращает её id — чтобы `nextReactionId` снял голос (toggle off).
 */
export function nextVoteReactionId(reactions: Reactions | undefined, sign: 1 | -1): number {
	const id = reactions?.reactionId;
	return id && (ruleOf(id).kind === 'negative') === (sign < 0) ? id : voteReaction(sign);
}

/** Иконка реакции, если поставлена отличная от основной (лайк/дизлайк) */
export function customVoteIconOf(reactions: Reactions | undefined, sign: 1 | -1) {
	const id = nextVoteReactionId(reactions, sign);
	return id !== voteReaction(sign) ? REACTIONS[id] : undefined;
}
