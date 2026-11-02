<script lang="ts">
	import FieldControl from './FieldControl.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSegmented from './SettingsSegmented.svelte';
	import { REACTIONS, type ReactionKind } from '$lib/config/reactions';
	import { reactionSettings, resetRules, ruleOf, setRule, voteReaction } from '$lib/storage/reactions.svelte';
	import type { ToggleField } from '$lib/themes/types';

	/*
	 * Страница «Реакции». DTF считает любую реакцию плюсом, поэтому здесь пользователь решает, какие реакции
	 * плюсуют, какие минусуют и какие ни на что не влияют. Из этого строятся рейтинг и сортировка.
	 */
	const rankField: ToggleField = {
		key: 'rank',
		type: 'toggle',
		title: 'Сортировать по моему рейтингу',
		description:
			'«Популярное» и «Лучшие» комментарии упорядочиваются по очкам из настроек ниже, а не по очкам DTF. Порядок меняется внутри загруженной порции, прежние посты и комментарии на месте не прыгают.',
		default: true
	};

	const KINDS: { value: ReactionKind; title: string; tone: string }[] = [
		{ value: 'positive', title: 'Плюс', tone: 'var(--st-ok)' },
		{ value: 'neutral', title: 'Нейтральная', tone: 'var(--st-muted)' },
		{ value: 'negative', title: 'Минус', tone: 'var(--st-danger)' }
	];

	const WEIGHTS = [1, 2, 3].map((value) => ({ value, title: `×${value}` }));

	const ids = Object.keys(REACTIONS).map(Number);
	const idsOf = (kind: ReactionKind) => ids.filter((id) => ruleOf(id).kind === kind);
</script>

{#snippet picker(title: string, subtitle: string, kind: ReactionKind, current: number, onpick: (id: number) => void)}
	<SettingsRow {title} {subtitle}>
		<div class="picks">
			{#each idsOf(kind) as id (id)}
				<button
					class="pick"
					type="button"
					title={REACTIONS[id].name}
					aria-label={REACTIONS[id].name}
					aria-pressed={id === current}
					onclick={() => onpick(id)}
				>
					<img src={REACTIONS[id].url} width="28" height="28" alt="" />
				</button>
			{/each}
		</div>
	</SettingsRow>
{/snippet}

<FieldControl field={rankField} value={reactionSettings.value.rank} onchange={(value) => reactionSettings.patch({ rank: value === true })} />

<SettingsGroup title="Лайк и дизлайк" description="Какие реакции ставят кнопки лайка и дизлайка в темах, где они есть.">
	{@render picker('Лайк', 'Среди плюсовых реакций', 'positive', voteReaction(1), (like) => reactionSettings.patch({ like }))}
	{@render picker('Дизлайк', 'Среди минусовых реакций', 'negative', voteReaction(-1), (dislike) => reactionSettings.patch({ dislike }))}
</SettingsGroup>

<!-- Название короткое: пусть переключатели стоят справа и уходят под него, только когда совсем не помещаются -->
<div class="all" style:--row-text-basis="110px">
<SettingsGroup title="Все реакции" description="Вес — сколько очков даёт одна реакция. У нейтральных реакций веса нет: они не влияют на рейтинг.">
	{#each ids as id (id)}
		{@const rule = ruleOf(id)}
		<SettingsRow title={REACTIONS[id].name}>
			{#snippet prefix()}
				<img class="icon" src={REACTIONS[id].url} width="28" height="28" alt="" />
			{/snippet}
			<div class="controls">
				<SettingsSegmented
					options={KINDS}
					value={rule.kind}
					label="Вид реакции «{REACTIONS[id].name}»"
					onchange={(kind) => setRule(id, { kind })}
				/>
				<SettingsSegmented
					options={WEIGHTS}
					value={rule.weight}
					label="Вес реакции «{REACTIONS[id].name}»"
					disabled={rule.kind === 'neutral'}
					onchange={(weight) => setRule(id, { weight })}
				/>
			</div>
		</SettingsRow>
	{/each}
</SettingsGroup>
</div>

<SettingsButton onclick={resetRules}>Вернуть стандартные значения</SettingsButton>

<style>
	.icon {
		flex: none;
		object-fit: contain;
	}

	/* На узкой странице вес переносится под вид, а не вылезает из карточки */
	.controls {
		display: flex;
		flex: 0 1 auto;
		flex-wrap: wrap;
		min-width: 0;
		gap: 8px;
	}

	/* Выбор лайка и дизлайка: реакции, как они выглядят на сайте. Строка переносит их под заголовок */
	.picks {
		display: flex;
		flex: 1 1 100%;
		flex-wrap: wrap;
		gap: 6px;
	}

	.pick {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 14px;
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.pick img {
		object-fit: contain;
	}

	.pick:hover {
		background: var(--st-hover);
	}

	.pick[aria-pressed='true'] {
		background: color-mix(in srgb, var(--st-accent) 14%, transparent);
		box-shadow: inset 0 0 0 2px var(--st-accent);
	}

	.pick:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}
</style>
