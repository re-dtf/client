<script lang="ts">
	import { activeTheme } from '$lib/themes/index.svelte';
	import { activeThemeSettings } from '$lib/themes/settings.svelte';
	import { themeSettingsSchema } from '$lib/themes/registry';
	import { paletteSelection } from '$lib/themes/palette';
	import { isFieldVisible, MOBILE_BREAKPOINT, type SettingDevice } from '$lib/themes/types';
	import { MediaQuery } from 'svelte/reactivity';
	import SettingsGroup from './settings/SettingsGroup.svelte';
	import SettingsRow from './settings/SettingsRow.svelte';
	import SettingsSegmented from './settings/SettingsSegmented.svelte';
	import SettingsSelect from './settings/SettingsSelect.svelte';
	import SettingsSlider from './settings/SettingsSlider.svelte';

	const mobile = new MediaQuery(`max-width: ${MOBILE_BREAKPOINT}px`);

	let fields = $derived(themeSettingsSchema(activeTheme.id));
	let device = $derived<SettingDevice>(mobile.current ? 'mobile' : 'desktop');
	let votes = $derived(fields.find((field) => field.key === 'votes' && isFieldVisible(field, {}, fields, device)));
	let width = $derived(fields.find((field) => field.key === 'contentWidth' && isFieldVisible(field, {}, fields, device)));
</script>

<div class="preferences">
	{#if votes?.type === 'radio' || votes?.type === 'select'}
		<div class="choice-field">
			<SettingsGroup>
				<SettingsRow title="Вид оценок">
					<SettingsSegmented
						options={votes.options.map((option) => ({ value: option.value, title: option.title.split(' · ')[0] }))}
						value={String(activeThemeSettings().value.votes ?? votes.default)}
						label="Вид оценок"
						onchange={(value) => activeThemeSettings().patch({ votes: value })}
					/>
				</SettingsRow>
			</SettingsGroup>
		</div>
	{/if}

	{#if width?.type === 'slider'}
		<SettingsGroup>
			<SettingsRow title="Ширина контента" subtitle="На больших экранах. Потяните, чтобы примерить.">
				<SettingsSlider
					steps={width.steps}
					value={Number(activeThemeSettings().value.contentWidth ?? width.default)}
					unit={width.unit}
					label="Ширина контента"
					onchange={(contentWidth) => activeThemeSettings().patch({ contentWidth })}
				/>
			</SettingsRow>
		</SettingsGroup>
	{/if}

	<div class="choice-field">
		<SettingsGroup>
			<SettingsRow title="Палитра">
				<SettingsSelect
					options={[{ value: 'auto', title: 'Системная' }, ...activeTheme.palettes.options.map((palette) => ({ value: palette.id, title: palette.title }))]}
					value={paletteSelection(activeTheme.palettes, activeThemeSettings().value.palette)}
					label="Палитра"
					onchange={(palette) => activeThemeSettings().patch({ palette })}
				/>
			</SettingsRow>
		</SettingsGroup>
	</div>
</div>

<style>
	.preferences {
		--st-accent: var(--theme-st-accent, #317df0);
		--st-muted: var(--theme-st-muted, var(--legal));
		--st-card: var(--theme-st-card, var(--card));
		--st-card-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 8%, transparent), 0 2px 5px rgb(0 0 0 / 0.04);
		--st-card-shadow-soft: 0 1px 3px rgb(0 0 0 / 0.12);
		--st-button: var(--theme-st-button, color-mix(in srgb, var(--ink) 6%, var(--card)));
		--st-button-hover: var(--theme-st-button-hover, color-mix(in srgb, var(--ink) 10%, var(--card)));
		--st-hover: var(--theme-st-hover, color-mix(in srgb, var(--ink) 4%, transparent));
		--st-separator: var(--theme-st-separator, color-mix(in srgb, var(--ink) 8%, transparent));
		--st-track: var(--theme-st-track, color-mix(in srgb, var(--ink) 15%, var(--card)));
		--st-text: var(--ink);
		--duration-base: 180ms;
		--row-text-basis: 100%;
		display: grid;
		gap: 14px;
		width: 100%;
		text-align: left;
	}
	.preferences :global(.group) {
		margin: 0;
	}
	.preferences :global(.segmented) {
		flex-wrap: wrap;
	}
	.preferences :global(.segment) {
		flex: 1;
	}
	.choice-field {
		transition: opacity 350ms ease, translate 450ms var(--out);
	}
	:global(.welcome[data-slider-drag]) .choice-field {
		opacity: 0;
		translate: 0 6px;
		pointer-events: none;
	}
</style>
