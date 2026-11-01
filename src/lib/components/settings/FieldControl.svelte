<script lang="ts">
	import type { SettingField, SettingValue } from '$lib/themes/types';

	/*
	 * Один пункт настроек по описанию поля: радиокнопки, список или переключатель.
	 * Оформление временное, на CSS-переменных; логика от оформления не зависит.
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
	<fieldset class="field">
		<legend class="field__title">{field.title}</legend>
		{#if field.description}
			<p class="field__description">{field.description}</p>
		{/if}
		<div class="field__options">
			{#each field.options as option (option.value)}
				<label class={['option', { 'option--checked': value === option.value }]}>
					<input
						class="option__input"
						type="radio"
						name="{uid}-{field.key}"
						value={option.value}
						checked={value === option.value}
						onchange={() => onchange(option.value)}
					/>
					<span class="option__title">{option.title}</span>
					{#if option.description}
						<span class="option__description">{option.description}</span>
					{/if}
				</label>
			{/each}
		</div>
	</fieldset>
{:else if field.type === 'select'}
	<div class="field">
		<label class="field__title" for="{uid}-{field.key}">{field.title}</label>
		{#if field.description}
			<p class="field__description">{field.description}</p>
		{/if}
		<select class="select" id="{uid}-{field.key}" {value} onchange={(e) => onchange(e.currentTarget.value)}>
			{#each field.options as option (option.value)}
				<option value={option.value}>{option.title}</option>
			{/each}
		</select>
	</div>
{:else}
	<div class="field">
		<label class="toggle">
			<input type="checkbox" role="switch" checked={value === true} onchange={(e) => onchange(e.currentTarget.checked)} />
			<span class="field__title">{field.title}</span>
		</label>
		{#if field.description}
			<p class="field__description">{field.description}</p>
		{/if}
	</div>
{/if}

<style>
	.field {
		margin: 0 0 24px;
		padding: 0;
		border: 0;
		min-width: 0;
	}

	.field__title {
		display: block;
		margin-bottom: 8px;
		padding: 0;
		font-size: 18px;
		font-weight: 500;
		line-height: 26px;
	}

	.field__description {
		margin-bottom: 12px;
		color: var(--text-muted, #707070);
		font-size: 15px;
		line-height: 22px;
	}

	.field__options {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Вариант выбора: радио скрыто, выделяется вся карточка */
	.option {
		position: relative;
		display: grid;
		gap: 2px;
		padding: 12px 16px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 8px;
		cursor: pointer;
	}

	.option:hover {
		background-color: #f5f5f5;
	}

	.option--checked {
		border-color: var(--color-blue, #0079ff);
		box-shadow: 0 0 0 1px var(--color-blue, #0079ff);
	}

	.option:has(.option__input:focus-visible) {
		outline: 2px solid var(--color-blue, #0079ff);
		outline-offset: 2px;
	}

	.option__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.option__title {
		font-weight: 500;
	}

	.option__description {
		color: var(--text-muted, #707070);
		font-size: 15px;
		line-height: 22px;
	}

	.select {
		width: 100%;
		height: 48px;
		padding: 0 11px;
		border: 1px solid rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		background-color: #f5f5f5;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
	}

	.toggle .field__title {
		margin-bottom: 0;
	}
</style>
