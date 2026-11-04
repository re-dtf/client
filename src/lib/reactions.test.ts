import { beforeEach, describe, it, expect } from 'vitest';
import { applyReaction, nextReactionId, rankByScore, scoreOf, votesOf } from './reactions';
import { reactionSettings, resetRules, setRule, voteReaction } from './storage/reactions.svelte';

beforeEach(() => {
	reactionSettings.value = { rules: {}, like: 1, dislike: 23, rank: true };
});

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
	// 1 ❤️ и 2 🔥 — плюсовые, 23 😐 и 25 🤡 — минусовые, 6 😮 — нейтральная, 99 — неизвестная
	const reactions = (reactionId: number) => ({
		counters: [{ id: 1, count: 5 }, { id: 2, count: 1 }, { id: 23, count: 2 }, { id: 25, count: 3 }, { id: 6, count: 40 }, { id: 99, count: 9 }],
		reactionId
	});

	it('плюсовые и минусовые реакции складываются, нейтральные и неизвестные не считаются', () => {
		expect(votesOf({ reactions: reactions(25) })).toEqual({ up: 6, down: 8, myVote: -1 });
		expect(votesOf({ reactions: reactions(6) }).myVote).toBe(0);
	});

	it('вес реакции и её вид берутся из настроек пользователя', () => {
		setRule(25, { weight: 3 });
		setRule(6, { kind: 'positive' });
		setRule(1, { kind: 'neutral' });
		// В хранилище лежит только вид и вес, без картинки и названия из каталога
		expect(reactionSettings.value.rules[25]).toEqual({ kind: 'negative', weight: 3 });

		expect(votesOf({ reactions: reactions(6) })).toEqual({ up: 41, down: 2 + 9, myVote: 1 });

		resetRules();
		expect(votesOf({ reactions: reactions(0) })).toEqual({ up: 6, down: 8, myVote: 0 });
	});

	it('без реакций берёт likes', () => {
		expect(votesOf({ likes: { count: 3, dislikes: 1, myVote: 1 } })).toEqual({ up: 3, down: 1, myVote: 1 });
		expect(votesOf({})).toEqual({ up: 0, down: 0, myVote: 0 });
	});
});

describe('rankByScore', () => {
	const item = (name: string, counters: { id: number; count: number }[], isPinned = false) => ({ name, isPinned, reactions: { counters, reactionId: 0 } });

	it('залайканное выше задизлайканного, закреплённое сверху, при равенстве порядок прежний', () => {
		const loved = item('loved', [{ id: 1, count: 4 }]);
		const hated = item('hated', [{ id: 1, count: 9 }, { id: 25, count: 20 }]);
		const first = item('first', [{ id: 6, count: 5 }]);
		const second = item('second', []);
		const pinned = item('pinned', [{ id: 25, count: 1 }], true);

		expect(rankByScore([hated, first, loved, second, pinned]).map((i) => i.name)).toEqual(['pinned', 'loved', 'first', 'second', 'hated']);
		expect(scoreOf(hated)).toBe(-31);
	});
});

describe('voteReaction', () => {
	it('по умолчанию лайк — сердце, дизлайк — покерфейс', () => {
		expect([voteReaction(1), voteReaction(-1)]).toEqual([1, 23]);
	});

	it('если выбранная реакция перестала быть подходящей, берётся первая подходящая', () => {
		setRule(1, { kind: 'neutral' });
		setRule(23, { kind: 'positive' });

		expect(voteReaction(1)).toBe(2);
		expect(voteReaction(-1)).toBe(5);
	});
});
