import { beforeEach, describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyReaction, customVoteIconOf, nextReactionId, nextVoteReactionId, rankByScore, scoreOf, votesOf } from './reactions';
import { reactionSettings, resetRules, setRule, voteReaction } from './storage/reactions.svelte';
import { FREE_REACTION_IDS, PLUS_REACTION_IDS, REACTIONS } from './config/reactions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

beforeEach(() => {
	reactionSettings.value = { rules: {}, like: 1, dislike: 23, favorites: [], rank: true };
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
	// 1 ❤️ и 2 🔥 — плюсовые, 23 😐 и 25 🤡 — минусовые, 7 🐸 — нейтральная, 99 — неизвестная
	const reactions = (reactionId: number) => ({
		counters: [{ id: 1, count: 5 }, { id: 2, count: 1 }, { id: 23, count: 2 }, { id: 25, count: 3 }, { id: 7, count: 40 }, { id: 99, count: 9 }],
		reactionId
	});

	it('плюсовые и минусовые реакции складываются, нейтральные и неизвестные не считаются', () => {
		expect(votesOf({ reactions: reactions(25) })).toEqual({ up: 6, down: 8, myVote: -1 });
		expect(votesOf({ reactions: reactions(7) }).myVote).toBe(0);
	});

	it('вес реакции и её вид берутся из настроек пользователя', () => {
		setRule(25, { weight: 3 });
		setRule(7, { kind: 'positive' });
		setRule(1, { kind: 'neutral' });
		// В хранилище лежит только вид и вес, без картинки и названия из каталога
		expect(reactionSettings.value.rules[25]).toEqual({ kind: 'negative', weight: 3 });

		expect(votesOf({ reactions: reactions(7) })).toEqual({ up: 41, down: 2 + 9, myVote: 1 });

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
		const first = item('first', [{ id: 7, count: 5 }]);
		const second = item('second', []);
		const pinned = item('pinned', [{ id: 25, count: 1 }], true);

		expect(rankByScore([hated, first, loved, second, pinned]).map((i) => i.name)).toEqual(['pinned', 'loved', 'first', 'second', 'hated']);
		expect(scoreOf(hated)).toBe(-31);
	});

	it('при ascending=true задизлайканное выше залайканного, закреплённое всё равно сверху', () => {
		const loved = item('loved', [{ id: 1, count: 4 }]);
		const hated = item('hated', [{ id: 1, count: 9 }, { id: 25, count: 20 }]);
		const first = item('first', [{ id: 7, count: 5 }]);
		const second = item('second', []);
		const pinned = item('pinned', [{ id: 25, count: 1 }], true);

		expect(rankByScore([loved, first, hated, second, pinned], true).map((i) => i.name)).toEqual(['pinned', 'hated', 'first', 'second', 'loved']);
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

describe('free vs plus reactions', () => {
	it('разделяет бесплатные реакции (10 штук) и плюс реакции', () => {
		expect(FREE_REACTION_IDS).toEqual([1, 2, 22, 4, 6, 3, 23, 24, 5, 9]);

		for (const id of FREE_REACTION_IDS) {
			expect(REACTIONS[id]?.isPlus).toBe(false);
		}

		for (const id of PLUS_REACTION_IDS) {
			expect(REACTIONS[id]?.isPlus).toBe(true);
		}

		const allKeys = Object.keys(REACTIONS).map(Number);
		expect(FREE_REACTION_IDS.length + PLUS_REACTION_IDS.length).toBe(allKeys.length);
	});

	it('Reactions.svelte и ReactionsSettings.svelte содержат полоски-разделители', () => {
		const reactionsSvelte = fs.readFileSync(path.resolve(__dirname, 'themes/dtf2022/post/Reactions.svelte'), 'utf8');
		expect(reactionsSvelte).toContain('post-reactions__picker-divider');

		const settingsSvelte = fs.readFileSync(path.resolve(__dirname, 'components/settings/ReactionsSettings.svelte'), 'utf8');
		expect(settingsSvelte).toContain('picks-divider');
	});
});

describe('customVoteIconOf', () => {
	it('возвращает undefined без реакции или для основной реакции лайка/дизлайка', () => {
		expect(customVoteIconOf(undefined, 1)).toBeUndefined();
		expect(customVoteIconOf(undefined, -1)).toBeUndefined();
		expect(customVoteIconOf({ counters: [], reactionId: 0 }, 1)).toBeUndefined();
		expect(customVoteIconOf({ counters: [], reactionId: 1 }, 1)).toBeUndefined();
		expect(customVoteIconOf({ counters: [], reactionId: 23 }, -1)).toBeUndefined();
	});

	it('возвращает иконку для другой позитивной реакции у плюса', () => {
		const r = customVoteIconOf({ counters: [], reactionId: 2 }, 1);
		expect(r?.name).toBe('Огонь');
		expect(r?.url).toBe('/reactions/2.png');
		expect(customVoteIconOf({ counters: [], reactionId: 2 }, -1)).toBeUndefined();
	});

	it('возвращает иконку для другой негативной реакции у минуса', () => {
		const r = customVoteIconOf({ counters: [], reactionId: 25 }, -1);
		expect(r?.name).toBe('Клоун');
		expect(r?.url).toBe('/reactions/25.webp');
		expect(customVoteIconOf({ counters: [], reactionId: 25 }, 1)).toBeUndefined();
	});

	it('возвращает иконку для нейтральной реакции у плюса', () => {
		const r = customVoteIconOf({ counters: [], reactionId: 4 }, 1);
		expect(r?.name).toBe('Смех');
		expect(r?.url).toBe('/reactions/4.png');
		expect(customVoteIconOf({ counters: [], reactionId: 4 }, -1)).toBeUndefined();
	});
});

describe('nextVoteReactionId', () => {
	it('возвращает стандартный лайк/дизлайк без реакции', () => {
		expect(nextVoteReactionId(undefined, 1)).toBe(1);
		expect(nextVoteReactionId(undefined, -1)).toBe(23);
		expect(nextVoteReactionId({ counters: [], reactionId: 0 }, 1)).toBe(1);
		expect(nextVoteReactionId({ counters: [], reactionId: 0 }, -1)).toBe(23);
	});

	it('возвращает текущий id при клике на тот же знак (для снятия голоса)', () => {
		// Если стоит 2 (Огонь, позитивная), клик по лайку (1) возвращает 2 для снятия через nextReactionId
		expect(nextVoteReactionId({ counters: [], reactionId: 2 }, 1)).toBe(2);
		// Если стоит 25 (Клоун, негативная), клик по дизлайку (-1) возвращает 25 для снятия
		expect(nextVoteReactionId({ counters: [], reactionId: 25 }, -1)).toBe(25);
	});

	it('возвращает текущий id при клике на лайк для нейтральной реакции (снятие голоса)', () => {
		// 4 — Смех (нейтральная по умолчанию), клик по лайку снимает
		expect(nextVoteReactionId({ counters: [], reactionId: 4 }, 1)).toBe(4);
		// При клике на дизлайк переключает на дизлайк
		expect(nextVoteReactionId({ counters: [], reactionId: 4 }, -1)).toBe(23);
	});

	it('переключает на дефолтную реакцию другого знака при клике на противоположную кнопку', () => {
		// Если стоит 2 (Огонь, позитивная), клик по дизлайку (-1) переключает на дизлайк (23)
		expect(nextVoteReactionId({ counters: [], reactionId: 2 }, -1)).toBe(23);
		// Если стоит 25 (Клоун, негативная), клик по лайку (1) переключает на лайк (1)
		expect(nextVoteReactionId({ counters: [], reactionId: 25 }, 1)).toBe(1);
	});
});
