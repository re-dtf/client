<script lang="ts">
	import AccountGate from './AccountGate.svelte';
	import FieldControl from './FieldControl.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import { api } from '$lib/api/index.svelte';
	import type { AccountSettings, NotificationChannel } from '$lib/api/types';
	import type { SettingField, SettingValue } from '$lib/themes/types';

	/*
	 * Страница «DTF»: настройки лент и уведомлений, которые хранятся на сервере DTF.
	 * Каждое изменение сразу уходит на сервер; если сервер отказал, значение возвращается.
	 */
	const FEED_OPTIONS = [
		{ value: 'popular', title: 'Популярное' },
		{ value: 'new', title: 'Свежее' },
		{ value: 'my', title: 'Моя лента' }
	];

	const FIELDS: (SettingField & { key: keyof AccountSettings })[] = [
		{ key: 'defaultFeed', type: 'select', title: 'Лента по умолчанию', description: 'Какая лента открывается первой.', default: 'popular', options: FEED_OPTIONS },
		{
			key: 'myFeedSorting',
			type: 'select',
			title: 'Сортировка моей ленты',
			default: 'new',
			options: [
				{ value: 'new', title: 'Свежее' },
				{ value: 'popular', title: 'Популярное' }
			]
		},
		{ key: 'isBlurNsfw', type: 'toggle', title: 'Размывать NSFW', description: 'Откровенные картинки в ленте закрыты размытием.', default: false },
		{ key: 'hideViewedPostsFromFeeds', type: 'toggle', title: 'Скрывать просмотренные посты', description: 'Прочитанные посты не показываются в лентах.', default: false }
	];

	let feed = $state<AccountSettings>();
	let feedError = $state<string>();
	let channels = $state<NotificationChannel[]>();
	let channelsError = $state<string>();

	api.getAccountSettings().then(
		(value) => (feed = value),
		(e: Error) => (feedError = e.message)
	);
	api.getNotificationSettings().then(
		(value) => (channels = value),
		(e: Error) => (channelsError = e.message)
	);

	async function setFeed(key: keyof AccountSettings, value: SettingValue) {
		if (!feed) return;
		const before = feed;
		feed = { ...feed, [key]: value };
		feedError = undefined;
		try {
			// Сайт всегда присылает все четыре поля лент сразу
			const { defaultFeed, myFeedSorting, isBlurNsfw, hideViewedPostsFromFeeds } = feed;
			await api.updateAccountSettings(feed.id, { defaultFeed, myFeedSorting, isBlurNsfw, hideViewedPostsFromFeeds });
		} catch (e) {
			feed = before;
			feedError = (e as Error).message;
		}
	}

	async function setNotifications(values: Record<string, boolean>) {
		if (!channels) return;
		const before = channels;
		channels = channels.map((channel) => ({ ...channel, items: channel.items.map((item) => (item.key in values ? { ...item, enabled: values[item.key] } : item)) }));
		channelsError = undefined;
		try {
			// Ответ сервера — все настройки уже с новыми значениями
			channels = await api.setNotificationSettings(values);
		} catch (e) {
			channels = before;
			channelsError = (e as Error).message;
		}
	}

	/** «Все» в группе: включить или выключить сразу каждый пункт, как кнопка «включить все» на сайте */
	const setChannel = (channel: NotificationChannel, enabled: boolean) =>
		setNotifications(Object.fromEntries(channel.items.map((item) => [item.key, enabled])));
</script>

<AccountGate>
	{#if feed}
		{#each FIELDS as field (field.key)}
			<FieldControl {field} value={feed[field.key] as SettingValue} onchange={(value) => setFeed(field.key, value)} />
		{/each}
	{:else if !feedError}
		<p class="status">Загрузка…</p>
	{/if}
	{#if feedError}<p class="status status--error">{feedError}</p>{/if}

	<h2 class="section">Уведомления</h2>
	{#if channels}
		{#each channels as channel (channel.key)}
			<SettingsGroup title={channel.title}>
				<SettingsRow tag="label" title="Все">
					<SettingsSwitch checked={channel.items.every((item) => item.enabled)} label="Все: {channel.title}" onchange={(checked) => setChannel(channel, checked)} />
				</SettingsRow>
				{#each channel.items as item (item.key)}
					<SettingsRow tag="label" title={item.title}>
						<SettingsSwitch checked={item.enabled} label={item.title} onchange={(checked) => setNotifications({ [item.key]: checked })} />
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
	.section {
		margin: 8px 4px 12px;
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
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
