<script lang="ts">
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSegmented from './SettingsSegmented.svelte';
	import { REACTIONS, type ReactionKind } from '$lib/config/reactions';
	import { reactionSettings, resetRules, ruleOf, setRule, voteReaction } from '$lib/storage/reactions.svelte';

	/*
	 * Страница «Реакции». DTF считает любую реакцию плюсом, поэтому здесь пользователь решает, какие реакции
	 * плюсуют, какие минусуют и какие ни на что не влияют. Настройка сортировки ленты находится в разделе «Лента».
	 */
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
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
	}

	.picks {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.pick {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.pick:hover {
		background: var(--st-button-hover);
	}

	.pick:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: -2px;
	}

	.pick[aria-pressed='true'] {
		background: color-mix(in srgb, var(--st-accent) 14%, transparent);
		box-shadow: inset 0 0 0 2px var(--st-accent);
	}

	.pick[aria-pressed='true']:hover {
		background: color-mix(in srgb, var(--st-accent) 20%, transparent);
	}
</style>
