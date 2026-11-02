import { describe, it, expect } from 'vitest';
import { DISLIKE_REACTION, LIKE_REACTION, applyReaction, nextReactionId, votesOf } from './reactionVotes';

describe('applyReaction', () => {
	it('новая реакция добавляется, прежняя уходит', () => {
		const result = applyReaction({ counters: [{ id: 2, count: 3 }, { id: 6, count: 1 }], reactionId: 2 }, 6);

		expect(result).toEqual({ counters: [{ id: 2, count: 2 }, { id: 6, count: 2 }], reactionId: 6 });
	});

	it('0 снимает реакцию, счётчик не уходит ниже нуля', () => {
		expect(applyReaction({ counters: [{ id: 2, count: 0 }], reactionId: 2 }, 0)).toEqual({ counters: [{ id: 2, count: 0 }], reactionId: 0 });
	});

	it('реакции может не быть совсем', () => {
		expect(applyReaction(undefined, 4)).toEqual({ counters: [{ id: 4, count: 1 }], reactionId: 4 });
	});

	it('не меняет переданный объект', () => {
		const reactions = { counters: [{ id: 2, count: 1 }], reactionId: 0 };
		applyReaction(reactions, 2);

		expect(reactions.counters[0].count).toBe(1);
	});
});

describe('nextReactionId', () => {
	it('повторное нажатие снимает реакцию', () => {
		expect(nextReactionId({ counters: [], reactionId: 4 }, 4)).toBe(0);
		expect(nextReactionId({ counters: [], reactionId: 4 }, 6)).toBe(6);
		expect(nextReactionId(undefined, 6)).toBe(6);
	});
});

describe('votesOf', () => {
	it('лайк и дизлайк — две выбранные реакции, остальные не считаются', () => {
		const reactions = {
			counters: [{ id: LIKE_REACTION, count: 5 }, { id: DISLIKE_REACTION, count: 2 }, { id: 99, count: 40 }],
			reactionId: DISLIKE_REACTION
		};

		expect(votesOf({ reactions })).toEqual({ up: 5, down: 2, myVote: -1 });
	});

	it('без реакций берёт likes', () => {
		expect(votesOf({ likes: { count: 3, dislikes: 1, myVote: 1 } })).toEqual({ up: 3, down: 1, myVote: 1 });
		expect(votesOf({})).toEqual({ up: 0, down: 0, myVote: 0 });
	});
});
