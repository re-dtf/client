<script lang="ts">
	import AccountGate from './AccountGate.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import { api } from '$lib/api/index.svelte';
	import type { IgnoredSubsite } from '$lib/api/types';

	/*
	 * Страница «Чёрный список»: пользователи и темы, которых вошедший скрыл на DTF.
	 * Скрывать с этой страницы нельзя: кнопки «скрыть» стоят у профилей и тем.
	 */
	let items = $state<IgnoredSubsite[]>();
	let error = $state<string>();

	api.getIgnoredSubsites().then(
		(value) => (items = value),
		(e: Error) => (error = e.message)
	);

	let users = $derived(items?.filter((item) => !item.isCommunity) ?? []);
	let communities = $derived(items?.filter((item) => item.isCommunity) ?? []);

	async function restore(item: IgnoredSubsite) {
		if (!items) return;
		const before = items;
		items = items.filter((other) => other.id !== item.id);
		error = undefined;
		try {
			await api.setSubsiteIgnored(item.id, false);
		} catch (e) {
			items = before;
			error = (e as Error).message;
		}
	}
</script>

{#snippet list(title: string, subsites: IgnoredSubsite[])}
	{#if subsites.length}
		<SettingsGroup {title}>
			{#each subsites as item (item.id)}
				<SettingsRow title={item.name} subtitle={item.description}>
					{#snippet prefix()}
						<span class="avatar" style:background-image={item.avatarUrl ? `url(${item.avatarUrl})` : undefined}></span>
					{/snippet}
					<SettingsButton onclick={() => restore(item)}>Убрать</SettingsButton>
				</SettingsRow>
			{/each}
		</SettingsGroup>
	{/if}
{/snippet}

<AccountGate>
	{#if items}
		{@render list('Пользователи', users)}
		{@render list('Темы', communities)}
		{#if !items.length}
			<p class="status">Здесь пусто: вы никого не скрывали.</p>
		{/if}
	{:else if !error}
		<p class="status">Загрузка…</p>
	{/if}
	{#if error}<p class="status status--error">{error}</p>{/if}
</AccountGate>

<style>
	.avatar {
		flex: none;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--st-field) 50% 50% / cover no-repeat;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
	}

	.status {
		margin: 0 4px 24px;
		color: var(--st-muted);
		font-size: 14px;
	}

	.status--error {
		color: var(--st-danger);
	}
</style>
