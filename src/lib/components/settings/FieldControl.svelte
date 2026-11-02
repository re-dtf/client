<script lang="ts">
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import type { SettingField, SettingValue } from '$lib/themes/types';

	/*
	 * Один пункт настроек по описанию поля: радиокнопки, список или переключатель.
	 * Рисуется группой из SettingsGroup; логика от оформления не зависит.
	 */
	let { field, value, onchange }: {
		field: SettingField;
		value: SettingValue;
		onchange: (value: SettingValue) => void;
	} = $props();

	// Уникальное имя группы радиокнопок: на экране может быть несколько полей с одним ключом
	const uid = $props.id();
</script>

{#if field.type === 'radio'}
	<SettingsGroup title={field.title} description={field.description}>
		{#each field.options as option (option.value)}
			<SettingsRow tag="label" title={option.title} subtitle={option.description}>
				<input
					class="option__input"
					type="radio"
					name="{uid}-{field.key}"
					value={option.value}
					checked={value === option.value}
					onchange={() => onchange(option.value)}
				/>
				<svg class="option__check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
					<path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</SettingsRow>
		{/each}
	</SettingsGroup>
{:else if field.type === 'select'}
	<SettingsGroup>
		<SettingsRow tag="label" title={field.title} subtitle={field.description}>
			<select class="select" {value} onchange={(e) => onchange(e.currentTarget.value)}>
				{#each field.options as option (option.value)}
					<option value={option.value}>{option.title}</option>
				{/each}
			</select>
		</SettingsRow>
	</SettingsGroup>
{:else}
	<SettingsGroup>
		<SettingsRow tag="label" title={field.title} subtitle={field.description}>
			<SettingsSwitch checked={value === true} {onchange} />
		</SettingsRow>
	</SettingsGroup>
{/if}

<style>
	/* Радио скрыто: выбранный вариант отмечается галочкой справа */
	.option__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.option__check {
		flex: none;
		color: var(--st-accent);
		opacity: 0;
	}

	.option__input:checked ~ .option__check {
		opacity: 1;
	}

	.option__input:focus-visible ~ .option__check {
		outline: 2px solid var(--st-accent);
		outline-offset: 4px;
		border-radius: 2px;
	}

	.select {
		flex: none;
		max-width: 50%;
		min-height: 38px;
		padding: 0 14px;
		border: 0;
		border-radius: 19px;
		background: var(--st-button);
		color: inherit;
		font: inherit;
		font-size: 14px;
		cursor: pointer;
	}

	.select:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 2px;
	}
</style>
