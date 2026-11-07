<script lang="ts">
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSegmented from './SettingsSegmented.svelte';
	import { FREE_REACTION_IDS, PLUS_REACTION_IDS, REACTIONS, type ReactionKind } from '$lib/config/reactions';
	import { MAX_FAVORITES, reactionSettings, resetRules, ruleOf, setRule, toggleFavorite, voteReaction } from '$lib/storage/reactions.svelte';
	import { activeTheme } from '$lib/themes/index.svelte';

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
	{@const free = FREE_REACTION_IDS.filter((id) => ruleOf(id).kind === kind)}
	{@const plus = PLUS_REACTION_IDS.filter((id) => ruleOf(id).kind === kind)}
	<SettingsRow {title} {subtitle}>
		<div class="picks">
			{#each free as id (id)}
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
			{#if free.length > 0 && plus.length > 0}
				<div class="picks-divider" role="separator" aria-orientation="horizontal"></div>
			{/if}
			{#each plus as id (id)}
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

{#if activeTheme.gestures}
	{@const favorites = reactionSettings.value.favorites}
	<SettingsGroup
		title="Любимые реакции"
		description="До {MAX_FAVORITES} реакций для свайпа по комментарию: потяните комментарий влево и, не отпуская, ведите палец вниз. Пока не выбраны — лайк и дизлайк."
	>
		<SettingsRow title="Свайп по комментарию" subtitle="Под ответом в том порядке, в каком выбраны">
			<div class="picks">
				{#each [FREE_REACTION_IDS, PLUS_REACTION_IDS] as group, g (g)}
					{#if g > 0}
						<div class="picks-divider" role="separator" aria-orientation="horizontal"></div>
					{/if}
					{#each group as id (id)}
						{@const place = favorites.indexOf(id)}
						<button
							class="pick"
							type="button"
							title={REACTIONS[id].name}
							aria-label={REACTIONS[id].name}
							aria-pressed={place >= 0}
							disabled={place < 0 && favorites.length >= MAX_FAVORITES}
							onclick={() => toggleFavorite(id)}
						>
							<img src={REACTIONS[id].url} width="28" height="28" alt="" />
							{#if place >= 0}<span class="pick__place">{place + 1}</span>{/if}
						</button>
					{/each}
				{/each}
			</div>
		</SettingsRow>
	</SettingsGroup>
{/if}

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

	.picks-divider {
		flex-basis: 100%;
		height: 1px;
		margin: 4px 0;
		background: var(--st-separator);
	}

	.pick {
		position: relative;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.pick:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.pick__place {
		position: absolute;
		top: 2px;
		right: 2px;
		min-width: 16px;
		height: 16px;
		border-radius: 8px;
		font-size: 11px;
		font-weight: 600;
		line-height: 16px;
		color: #fff;
		background: var(--st-accent);
	}

	.pick:hover:not(:disabled) {
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
