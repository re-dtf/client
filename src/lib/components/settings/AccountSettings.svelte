<script lang="ts">
	import AccountGate from './AccountGate.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import { api } from '$lib/api/index.svelte';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import type { AccountSettings } from '$lib/api/types';

	/*
	 * Страница «Аккаунт»: имя и описание профиля. Почту и пароль DTF меняет только на своём сайте,
	 * поэтому для них ссылка.
	 */
	const DTF_ACCOUNT_URL = 'https://dtf.ru/settings/general';

	let saved = $state<AccountSettings>();
	let name = $state('');
	let description = $state('');
	let error = $state<string>();
	let saving = $state(false);
	let done = $state(false);

	api.getAccountSettings().then(
		(value) => {
			saved = value;
			name = value.name;
			description = value.description;
		},
		(e: Error) => (error = e.message)
	);

	let changed = $derived(!!saved && (name.trim() !== saved.name || description !== saved.description));

	async function save() {
		if (!saved) return;
		saving = true;
		error = undefined;
		done = false;
		const next = { name: name.trim(), description, commentingPermissions: saved.commentingPermissions };
		try {
			await api.updateAccountSettings(saved.id, next);
			saved = { ...saved, ...next };
			name = next.name;
			done = true;
			currentUser.refresh();
		} catch (e) {
			error = (e as Error).message;
		} finally {
			saving = false;
		}
	}
</script>

<AccountGate>
	<SettingsGroup title="Профиль" description="Так вас видят на DTF.">
		{#if saved}
			<div class="body">
				<label class="field">
					<span class="field__label">Имя</span>
					<input class="entry" type="text" autocomplete="off" bind:value={name} />
				</label>
				<label class="field">
					<span class="field__label">Описание</span>
					<textarea class="entry entry--area" rows="4" bind:value={description}></textarea>
				</label>
				<div class="actions">
					<SettingsButton variant="suggested" disabled={!changed || saving || !name.trim()} onclick={save}>Сохранить</SettingsButton>
					{#if done && !changed}<span class="status">Сохранено</span>{/if}
					{#if error}<span class="status status--error">{error}</span>{/if}
				</div>
			</div>
		{:else if error}
			<p class="body status status--error">{error}</p>
		{:else}
			<p class="body status">Загрузка…</p>
		{/if}
	</SettingsGroup>

	<SettingsGroup>
		<SettingsRow title="Почта и пароль" subtitle="Их можно сменить только на сайте DTF.">
			<SettingsButton href={DTF_ACCOUNT_URL}>Открыть на DTF</SettingsButton>
		</SettingsRow>
	</SettingsGroup>
</AccountGate>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field__label {
		color: var(--st-muted);
		font-size: 13px;
	}

	.entry {
		width: 100%;
		min-width: 0;
		height: 40px;
		padding: 0 16px;
		border-radius: 20px;
		background: var(--st-field);
		color: inherit;
		font: inherit;
		font-size: 14px;
	}

	.entry--area {
		height: auto;
		padding: 10px 16px;
		border-radius: 18px;
		resize: vertical;
	}

	.entry:focus-visible {
		outline: 2px solid var(--st-accent);
		outline-offset: 0;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}

	.status {
		color: var(--st-muted);
		font-size: 14px;
	}

	.status--error {
		color: var(--st-danger);
	}
</style>
