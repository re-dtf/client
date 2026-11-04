<script lang="ts">
	import AccountGate from './AccountGate.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import { api } from '$lib/api/index.svelte';
	import type { NotificationChannel } from '$lib/api/types';

	/*
	 * Страница «Уведомления»: настройки уведомлений по каналам на сервере DTF.
	 */
	let channels = $state<NotificationChannel[]>();
	let channelsError = $state<string>();

	api.getNotificationSettings().then(
		(value) => (channels = value),
		(e: Error) => (channelsError = e.message)
	);

	async function setNotifications(values: Record<string, boolean>) {
		if (!channels) return;
		const before = channels;
		channels = channels.map((channel) => ({
			...channel,
			items: channel.items.map((item) => (item.key in values ? { ...item, enabled: values[item.key] } : item))
		}));
		channelsError = undefined;
		try {
			channels = await api.setNotificationSettings(values);
		} catch (e) {
			channels = before;
			channelsError = (e as Error).message;
		}
	}

	/** «Все» в группе: включить или выключить сразу каждый пункт */
	const setChannel = (channel: NotificationChannel, enabled: boolean) =>
		setNotifications(Object.fromEntries(channel.items.map((item) => [item.key, enabled])));
</script>

<AccountGate>
	{#if channels}
		{#each channels as channel (channel.key)}
			<SettingsGroup title={channel.title}>
				<SettingsRow tag="label" title="Все">
					<SettingsSwitch
						checked={channel.items.every((item) => item.enabled)}
						label="Все: {channel.title}"
						onchange={(checked) => setChannel(channel, checked)}
					/>
				</SettingsRow>
				{#each channel.items as item (item.key)}
					<SettingsRow tag="label" title={item.title}>
						<SettingsSwitch
							checked={item.enabled}
							label={item.title}
							onchange={(checked) => setNotifications({ [item.key]: checked })}
						/>
					</SettingsRow>
				{/each}
			</SettingsGroup>
		{/each}
	{:else if !channelsError}
		<p class="status">Загрузка…</p>
	{/if}
	{#if channelsError}<p class="status status--error">{channelsError}</p>{/if}
</AccountGate>

<style>
	.status {
		margin: 0 4px 24px;
		color: var(--st-muted);
		font-size: 14px;
	}

	.status--error {
		color: var(--st-danger);
	}
</style>
