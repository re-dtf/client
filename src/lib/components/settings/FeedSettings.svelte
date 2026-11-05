<script lang="ts">
	import AccountGate from './AccountGate.svelte';
	import FieldControl from './FieldControl.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import { api } from '$lib/api/index.svelte';
	import type { AccountSettings } from '$lib/api/types';
	import type { SettingField, SettingValue } from '$lib/themes/types';

	/*
	 * Страница «Моя лента»: настройки аккаунта DTF (лента по умолчанию,
	 * сортировка «Моей ленты», размытие NSFW, скрытие прочитанного).
	 */
	let { onopencontent }: { onopencontent?: () => void } = $props();

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

<AccountGate>
	<div class="settings-cards">
		{#if feed}
			{#each DTF_FEED_FIELDS as field (field.key)}
				<FieldControl
					{field}
					value={feed[field.key] as SettingValue}
					onchange={(value) => setFeed(field.key, value)}
				/>
			{/each}
		{:else if !feedError}
			{#each DTF_FEED_FIELDS as field (field.key)}
				<div class="loading-card" aria-busy="true">
					<span class="loading-text">Загружаем…</span>
				</div>
			{/each}
		{/if}
	</div>
	{#if feedError}<p class="status status--error">{feedError}</p>{/if}
</AccountGate>

{#if onopencontent}
	<SettingsGroup title="Оформление ленты">
		<SettingsRow
			title="Лента и контент"
			subtitle="Ширина контента, сортировка по рейтингу реакций и фильтрация"
		>
			<SettingsButton variant="suggested" onclick={onopencontent}>
				<span class="btn-text">
					Настроить
					<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M6 3l5 5-5 5" />
					</svg>
				</span>
			</SettingsButton>
		</SettingsRow>
	</SettingsGroup>
{/if}

<style>
	.settings-cards {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 36px;
	}

	.settings-cards > :global(.group) {
		margin-bottom: 0;
	}

	.loading-card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 66px;
		border-radius: 14px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow);
		padding: 12px 20px;
		box-sizing: border-box;
	}

	.loading-text {
		color: var(--st-muted);
		font-size: 13px;
		opacity: 0.65;
		user-select: none;
	}

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
