<script lang="ts">
	import AccountGate from './AccountGate.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSelect from './SettingsSelect.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import { api } from '$lib/api/index.svelte';
	import { nsfwBlur } from '$lib/nsfwBlur.svelte';
	import { reactionSettings } from '$lib/storage/reactions.svelte';
	import type { AccountSettings } from '$lib/api/types';
	import type { SettingValue } from '$lib/themes/types';

	/*
	 * Страница «Моя лента»: сортировка по рейтингу реакций,
	 * настройки ленты аккаунта DTF (лента по умолчанию, сортировка «Моей ленты»,
	 * размытие NSFW, скрытие прочитанного) и ссылка на оформление ленты.
	 */
	let { onopencontent }: { onopencontent?: () => void } = $props();

	const FEED_OPTIONS = [
		{ value: 'popular', title: 'Популярное' },
		{ value: 'new', title: 'Свежее' },
		{ value: 'my', title: 'Моя лента' }
	];

	const MY_FEED_SORTING_OPTIONS = [
		{ value: 'new', title: 'Свежее' },
		{ value: 'popular', title: 'Популярное' }
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
			nsfwBlur.sync(feed);
		} catch (e) {
			feed = before;
			feedError = (e as Error).message;
		}
	}
</script>

<SettingsGroup>
	<SettingsRow
		tag="label"
		title="Сортировать по моему рейтингу"
		subtitle="«Популярное» и «Лучшие» упорядочиваются по очкам из настроек реакций, а не по очкам DTF. В комментариях появляется опция «Худшие». Прежние посты и комментарии на месте не прыгают."
	>
		<SettingsSwitch
			checked={reactionSettings.value.rank}
			label="Сортировать по моему рейтингу"
			onchange={(checked) => reactionSettings.patch({ rank: checked })}
		/>
	</SettingsRow>
</SettingsGroup>

<AccountGate>
	<SettingsGroup
		title="Настройки с DTF"
		description="Синхронизируются с сервером DTF и сохраняются в аккаунте."
	>
		{#if feed}
			<SettingsRow title="Лента по умолчанию" subtitle="Какая лента открывается первой при запуске.">
				<SettingsSelect
					id="dtf-defaultFeed"
					options={FEED_OPTIONS}
					value={feed.defaultFeed}
					label="Лента по умолчанию"
					onchange={(value) => setFeed('defaultFeed', value as 'popular' | 'new' | 'my')}
				/>
			</SettingsRow>
			<SettingsRow title="Сортировка моей ленты" subtitle="Порядок постов во вкладке «Моя лента».">
				<SettingsSelect
					id="dtf-myFeedSorting"
					options={MY_FEED_SORTING_OPTIONS}
					value={feed.myFeedSorting}
					label="Сортировка моей ленты"
					onchange={(value) => setFeed('myFeedSorting', value as 'new' | 'popular')}
				/>
			</SettingsRow>
			<SettingsRow tag="label" title="Размывать NSFW" subtitle="Откровенные картинки и видео в ленте закрыты размытием.">
				<SettingsSwitch
					checked={feed.isBlurNsfw}
					label="Размывать NSFW"
					onchange={(checked) => setFeed('isBlurNsfw', checked)}
				/>
			</SettingsRow>
			<SettingsRow tag="label" title="Скрывать просмотренные посты" subtitle="Прочитанные посты автоматически скрываются из лент.">
				<SettingsSwitch
					checked={feed.hideViewedPostsFromFeeds}
					label="Скрывать просмотренные посты"
					onchange={(checked) => setFeed('hideViewedPostsFromFeeds', checked)}
				/>
			</SettingsRow>
		{:else if !feedError}
			<div class="loading-card" aria-busy="true">
				<span class="loading-text">Загружаем…</span>
			</div>
		{/if}
	</SettingsGroup>
	{#if feedError}<p class="status status--error">{feedError}</p>{/if}
</AccountGate>

{#if onopencontent}
	<SettingsGroup title="Оформление ленты">
		<SettingsRow
			title="Лента и контент"
			subtitle="Ширина контента, рекомендации под постом и фильтрация"
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
	.loading-card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 66px;
		border-radius: 14px;
		background: var(--st-card);
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
