<script lang="ts">
	import GeneralSettings from './GeneralSettings.svelte';
	import FieldControl from './FieldControl.svelte';
	import { activeTheme } from '$lib/themes/index.svelte';
	import { getTheme, themeSettingsSchema } from '$lib/themes/registry';
	import { activeThemeSettings } from '$lib/themes/settings.svelte';

	/*
	 * Экран настроек: вкладка «Общие» и вкладка выбранной темы (её настройки описаны в theme.ts).
	 * Оформление временное.
	 */
	const uid = $props.id();

	let tab = $state<'general' | 'theme'>('general');

	let themeName = $derived(getTheme(activeTheme.id)?.name ?? activeTheme.id);
	let themeFields = $derived(themeSettingsSchema(activeTheme.id));
	let themeValues = $derived(activeThemeSettings());

	// У некоторых тем своих настроек нет: вкладки тогда нет, а если тему сменили, открываем «Общие»
	let currentTab = $derived(tab === 'theme' && themeFields.length > 0 ? 'theme' : 'general');
</script>

<div class="settings">
	<h2 class="settings__title">Настройки</h2>

	{#if themeFields.length > 0}
		<div class="tabs" role="tablist" aria-label="Разделы настроек">
			<button
				class={['tab', { 'tab--active': currentTab === 'general' }]}
				type="button"
				role="tab"
				id="{uid}-tab-general"
				aria-selected={currentTab === 'general'}
				aria-controls="{uid}-panel"
				onclick={() => (tab = 'general')}
			>
				Общие
			</button>
			<button
				class={['tab', { 'tab--active': currentTab === 'theme' }]}
				type="button"
				role="tab"
				id="{uid}-tab-theme"
				aria-selected={currentTab === 'theme'}
				aria-controls="{uid}-panel"
				onclick={() => (tab = 'theme')}
			>
				{themeName}
			</button>
		</div>
	{/if}

	<div class="panel" role="tabpanel" id="{uid}-panel" aria-labelledby="{uid}-tab-{currentTab}">
		{#if currentTab === 'theme'}
			{#each themeFields as field (field.key)}
				<FieldControl
					{field}
					value={themeValues.value[field.key] ?? field.default}
					onchange={(value) => themeValues.patch({ [field.key]: value })}
				/>
			{/each}
		{:else}
			<GeneralSettings />
		{/if}
	</div>
</div>

<style>
	.settings {
		color: var(--text-primary, #222);
		font-size: 16px;
		line-height: 24px;
	}

	.settings__title {
		margin-bottom: 16px;
		font-size: 22px;
		font-weight: 500;
		line-height: 30px;
	}

	.tabs {
		display: flex;
		gap: 4px;
		margin-bottom: 24px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.tab {
		margin-bottom: -1px;
		padding: 8px 16px;
		border-bottom: 2px solid transparent;
		color: var(--text-muted, #707070);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}

	.tab--active {
		border-bottom-color: var(--color-blue, #0079ff);
		color: inherit;
	}

	.tab:focus-visible {
		outline: 2px solid var(--color-blue, #0079ff);
		outline-offset: -2px;
	}
</style>
