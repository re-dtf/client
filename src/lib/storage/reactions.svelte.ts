import { REACTIONS, type ReactionKind } from '$lib/config/reactions';
import { persistedState } from './persisted.svelte';

export interface ReactionRule {
	kind: ReactionKind;
	weight: number;
}

export interface ReactionSettings {
	/** Только то, что пользователь изменил: остальное берётся из config/reactions.ts, поэтому новые реакции подхватываются сами */
	rules: Record<number, ReactionRule>;
	/** Какие реакции ставят кнопки «лайк» и «дизлайк» */
	like: number;
	dislike: number;
	/** Сортировать посты и комментарии по рейтингу из реакций, а не так, как отдал сервер */
	rank: boolean;
}

export const reactionSettings = persistedState<ReactionSettings>('redtf:settings:reactions', {
	rules: {},
	like: 1,
	dislike: 23,
	rank: true
});

/** Реакция без записи в config/reactions.ts не влияет на рейтинг */
const UNKNOWN: ReactionRule = { kind: 'neutral', weight: 0 };

export function ruleOf(id: number): ReactionRule {
	return reactionSettings.value.rules[id] ?? REACTIONS[id] ?? UNKNOWN;
}

export function setRule(id: number, part: Partial<ReactionRule>) {
	const { rules } = reactionSettings.value;
	const { kind, weight } = ruleOf(id);
	reactionSettings.patch({ rules: { ...rules, [id]: { kind, weight, ...part } } });
}

export function resetRules() {
	reactionSettings.patch({ rules: {} });
}

/** Реакция для кнопки «лайк» (1) или «дизлайк» (-1). Если выбранная перестала быть плюсовой или минусовой, берём первую подходящую */
export function voteReaction(sign: 1 | -1): number {
	const { like, dislike } = reactionSettings.value;
	const chosen = sign > 0 ? like : dislike;
	const kind: ReactionKind = sign > 0 ? 'positive' : 'negative';
	if (ruleOf(chosen).kind === kind) return chosen;
	return Object.keys(REACTIONS).map(Number).find((id) => ruleOf(id).kind === kind) ?? chosen;
}
