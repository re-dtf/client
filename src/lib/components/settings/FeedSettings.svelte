<script lang="ts">
	import AccountGate from './AccountGate.svelte';
	import FieldControl from './FieldControl.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import { api } from '$lib/api/index.svelte';
	import type { AccountSettings } from '$lib/api/types';
	import { reactionSettings } from '$lib/storage/reactions.svelte';
	import type { ChoiceField, SettingField, SettingValue, ToggleField } from '$lib/themes/types';

	/*
	 * Страница «Лента»: алгоритмы ранжирования, сортировка, размытие NSFW
	 * и быстрый переход к фильтрам контента (Чёрному списку).
	 */
	let { onopenignored }: { onopenignored?: () => void } = $props();

	const rankField: ToggleField = {
		key: 'rank',
		type: 'toggle',
		title: 'Сортировать по моему рейтингу',
		description:
			'«Популярное» и «Лучшие» упорядочиваются по очкам из настроек реакций, а не по очкам DTF. Прежние посты и комментарии на месте не прыгают.',
		default: true
	};

	const FEED_OPTIONS = [
		{ value: 'popular', title: 'Популярное' },
		{ value: 'new', title: 'Свежее' },
		{ value: 'my', title: 'Моя лента' }
	];

	const DTF_FEED_FIELDS: (SettingField & { key: keyof AccountSettings })[] = [
		{
			key: 'defaultFeed',
			type: 'select',
			title: 'Лента по умолчанию',
			description: 'Какая лента открывается первой при запуске.',
			default: 'popular',
			options: FEED_OPTIONS
		},
		{
			key: 'myFeedSorting',
			type: 'select',
			title: 'Сортировка моей ленты',
			description: 'Порядок постов во вкладке «Моя лента».',
			default: 'new',
			options: [
				{ value: 'new', title: 'Свежее' },
				{ value: 'popular', title: 'Популярное' }
			]
		},
		{
			key: 'isBlurNsfw',
			type: 'toggle',
			title: 'Размывать NSFW',
			description: 'Откровенные картинки и видео в ленте закрыты размытием.',
			default: false
		},
		{
			key: 'hideViewedPostsFromFeeds',
			type: 'toggle',
			title: 'Скрывать просмотренные посты',
			description: 'Прочитанные посты автоматически скрываются из лент.',
			default: false
		}
	];

	let feed = $state<AccountSettings>();
	let feedError = $state<string>();

	api.getAccountSettings().then(
		(value) => (feed = value),
		(e: Error) => (feedError = e.message)
	);

	async function setFeed(key: keyof AccountSettings, value: SettingValue) {
		if (!feed) return;
		const before = feed;
		feed = { ...feed, [key]: value };
		feedError = undefined;
		try {
			const { defaultFeed, myFeedSorting, isBlurNsfw, hideViewedPostsFromFeeds } = feed;
			await api.updateAccountSettings(feed.id, { defaultFeed, myFeedSorting, isBlurNsfw, hideViewedPostsFromFeeds });
		} catch (e) {
			feed = before;
			feedError = (e as Error).message;
		}
	}
</script>

<FieldControl
	field={rankField}
	value={reactionSettings.value.rank}
	onchange={(value) => reactionSettings.patch({ rank: value === true })}
/>

<AccountGate>
	{#if feed}
		{#each DTF_FEED_FIELDS as field (field.key)}
			<FieldControl
				{field}
				value={feed[field.key] as SettingValue}
				onchange={(value) => setFeed(field.key, value)}
			/>
		{/each}
	{:else if !feedError}
		<p class="status">Загрузка настроек ленты DTF…</p>
	{/if}
	{#if feedError}<p class="status status--error">{feedError}</p>{/if}
</AccountGate>

<SettingsGroup title="Фильтрация контента">
	<SettingsRow
		title="Чёрный список и стоп-слова"
		subtitle="Скрытие постов по тегам (#политика, #аниме), ключевым словам, а также авторов и сообществ DTF"
	>
		{#if onopenignored}
			<SettingsButton variant="suggested" onclick={onopenignored}>
				<span class="btn-text">
					Настроить
					<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M6 3l5 5-5 5" />
					</svg>
				</span>
			</SettingsButton>
		{/if}
	</SettingsRow>
</SettingsGroup>

<style>
	.status {
		margin: 0 4px 24px;
		color: var(--st-muted);
		font-size: 14px;
	}

	.status--error {
		color: var(--st-danger);
	}

	.btn-text {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
</style>
