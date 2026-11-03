<script lang="ts">
	import type { Comment, CursorData, Post, Profile, ProfileListItem, ProfileSorting as Sorting } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import { resolve } from '$app/paths';
	import { getProfilePath, isNewTabClick, openLightbox, openOverlay, openProfile, preloadLightbox } from '$lib/navigation';
	import { subscriptions } from './actions.svelte';
	import { loadOnVisible } from './loadOnVisible';
	import { formatDate, formatNumber, formatRating, plural } from './format';
	import PostCard from './post/PostCard.svelte';
	import ProfileComment from './ProfileComment.svelte';
	import ProfileDetails, { type DetailsPage } from './ProfileDetails.svelte';
	import Button from './ui/Button.svelte';
	import Preloader from './ui/Preloader.svelte';
	import { notify } from './ui/notify.svelte';

	let {
		profile,
		posts,
		sorting,
		hasMore,
		loadingPosts,
		postsError,
		subscribersPromise,
		subscriptionsPromise,
		onSortingChange,
		loadMore,
		onProfileUpdate
	}: {
		profile: Profile;
		posts: Post[];
		sorting: Sorting;
		hasMore: boolean;
		loadingPosts: boolean;
		postsError: string | null;
		subscribersPromise: Promise<ProfileListItem[]>;
		subscriptionsPromise: Promise<ProfileListItem[]>;
		onSortingChange: (sorting: Sorting) => void;
		loadMore: () => void;
		onProfileUpdate?: (profile: Profile) => void;
	} = $props();

	const SORTINGS: { value: Sorting; label: string }[] = [
		{ value: 'popular', label: 'Популярное' },
		{ value: 'new', label: 'Свежее' }
	];

	// Ссылки на подробности ведут на DTF для «открыть в новой вкладке»; обычный клик открывает вкладку у нас
	let externalUrl = $derived(profile.url ?? `https://dtf.ru/id${profile.id}`);

	let isMe = $derived(profile.id === currentUser.value?.id);
	// Без входа DTF присылает isSubscribed не про зрителя, поэтому верим флагам только после входа
	let wasSubscribed = $derived(!!currentUser.value && !!profile.isSubscribed);
	let wasNotified = $derived(!!currentUser.value && !!profile.isSubscribedToNewPosts);
	let subscribed = $derived(subscriptions.isSubscribed(profile.id, wasSubscribed));
	let notified = $derived(subscriptions.isNotified(profile.id, wasNotified));

	/** Настройки аккаунта открываются окном re:DTF; Ctrl/Cmd-клик по ссылке открывает отдельную страницу настроек */
	function openAccountSettings(e?: MouseEvent) {
		if (e && isNewTabClick(e)) return;
		e?.preventDefault();
		openOverlay({ type: 'settings', data: { page: 'account' } });
	}

	// Свой профиль: смена аватарки и обложки (как у DTF: файл, «Настроить» двигает обложку по вертикали)
	let busy = $state(false);
	let editingCover = $state(false);
	let coverY = $state(0);
	let coverInput = $state<HTMLInputElement>();
	let avatarInput = $state<HTMLInputElement>();
	let coverDrag: { startY: number; startValue: number; height: number } | undefined;

	/** Выполняет изменение и перечитывает профиль; при ошибке показывает тост */
	async function changeImages(task: () => Promise<void>, failure: string) {
		busy = true;
		try {
			await task();
			onProfileUpdate?.(await api.getProfile(profile.id));
			currentUser.refresh();
		} catch (e) {
			notify.error(`${failure} (${(e as Error).message})`);
		} finally {
			busy = false;
		}
	}

	function pickImage(kind: 'avatar' | 'cover') {
		return (e: Event & { currentTarget: HTMLInputElement }) => {
			const file = e.currentTarget.files?.[0];
			e.currentTarget.value = '';
			if (!file) return;
			if (kind === 'avatar' && !/^image\/(png|jpeg)$/.test(file.type)) {
				notify.error('Неверный формат изображения. Попробуйте загрузить картинку в .jpg или .png');
				return;
			}
			changeImages(() => api.setProfileImage(profile.id, kind, file), kind === 'cover' ? 'Не удалось загрузить обложку' : 'Не удалось загрузить фотографию');
		};
	}

	function startCoverEdit() {
		coverY = profile.coverY ?? 50;
		editingCover = true;
	}

	async function saveCoverPosition() {
		await changeImages(() => api.setProfileCoverPosition(profile.id, profile.coverRaw, coverY), 'Не удалось сохранить позицию');
		editingCover = false;
	}

	function removeCover() {
		changeImages(() => api.removeProfileCover(profile.id), 'Не удалось удалить обложку');
	}

	function dragStart(e: PointerEvent) {
		// Нажатие на кнопку («Сохранить», «Закрыть») — не перетаскивание: захват указателя съел бы её клик
		if (!editingCover || (e.target as Element).closest('button')) return;
		const layer = e.currentTarget as HTMLElement;
		layer.setPointerCapture(e.pointerId);
		coverDrag = { startY: e.clientY, startValue: coverY, height: layer.getBoundingClientRect().height };
	}

	function dragMove(e: PointerEvent) {
		if (!coverDrag) return;
		const shift = Math.round(((e.clientY - coverDrag.startY) / coverDrag.height) * 100);
		coverY = Math.min(100, Math.max(0, coverDrag.startValue - shift));
	}

	// Вкладка «Комментарии»: грузится при первом открытии, дальше подгружается по мере прокрутки
	let tab = $state<'posts' | 'comments' | 'details'>('posts');
	let detailsPage = $state<DetailsPage>('all');
	// Не $state.raw: оценка комментария меняет его на месте (comments/votes.svelte.ts)
	let comments = $state<Comment[]>([]);
	let commentsCursor: CursorData | undefined;
	let commentsLoaded = $state(false);
	let commentsHasMore = $state(true);
	let loadingComments = $state(false);
	let commentsError = $state<string | null>(null);

	async function loadComments() {
		if (loadingComments || !commentsHasMore) return;
		loadingComments = true;
		commentsError = null;
		try {
			const result = await api.getProfileComments(profile.id, commentsCursor);
			comments = [...comments, ...result.items];
			commentsHasMore = result.items.length > 0 && result.lastId !== undefined;
			commentsCursor = commentsHasMore ? { lastId: result.lastId!, lastSortingValue: result.lastSortingValue ?? 0 } : undefined;
		} catch (e) {
			commentsError = (e as Error).message;
			commentsHasMore = false;
		} finally {
			loadingComments = false;
			commentsLoaded = true;
		}
	}

	function openTab(next: 'posts' | 'comments' | 'details') {
		tab = next;
		if (next === 'comments' && !commentsLoaded) loadComments();
	}

	function openDetails(page: DetailsPage) {
		detailsPage = page;
		openTab('details');
		// На телефоне это отдельный экран: начинаем с его верха
		window.scrollTo(0, 0);
	}

	/** Ссылка на подробности: обычный клик открывает вкладку, Ctrl/Cmd/Shift и средняя кнопка — DTF в новой вкладке */
	function detailsLink(page: DetailsPage) {
		return (e: MouseEvent) => {
			if (isNewTabClick(e)) return;
			e.preventDefault();
			openDetails(page);
		};
	}
</script>

{#snippet sidebarBlock(title: string, count: number | undefined, promise: Promise<ProfileListItem[]>, grid: boolean, limit: number, showAll: string, showAllUrl: string, target: DetailsPage)}
	{#await promise then items}
		{#if items.length > 0}
			<div class="profile-sidebar-block">
				<div class="profile-sidebar-block__title">
					<span>{title}</span>
					{#if count}
						<span class="profile-sidebar-block__counter">{formatNumber(count)}</span>
					{/if}
				</div>

				<div class={['profile-sidebar-list', { 'profile-sidebar-list--grid': grid }]}>
					{#each items.slice(0, limit) as item (item.id)}
						<a
							href={resolve(getProfilePath(item.id) as any)}
							class="profile-sidebar-list__item"
							title={grid ? item.name : undefined}
							onclick={(e) => openProfile(e, item.id)}
						>
							<img src={item.avatarUrl} class="profile-sidebar-list__image" loading="lazy" alt={grid ? item.name : ''} />
							{#if !grid}
								<div class="profile-sidebar-list__label">{item.name}</div>
							{/if}
						</a>
					{/each}
				</div>

				<a href={showAllUrl} target="_blank" rel="noreferrer" class="profile-sidebar-block__show-all" onclick={detailsLink(target)}>{showAll}</a>
			</div>
		{/if}
	{/await}
{/snippet}

<div class={['profile-section', { 'profile-section--details': tab === 'details' }]}>
	{#if isMe}
		<!-- Скрытые поля выбора файла: кнопки обложки и аватарки открывают их -->
		<input bind:this={coverInput} type="file" accept="image/*, video/mp4, .webp" hidden onchange={pickImage('cover')} />
		<input bind:this={avatarInput} type="file" accept="image/png, image/jpeg" hidden onchange={pickImage('avatar')} />

		{#if !profile.coverUrl}
			<div class="profile-cover-upload">
				<Button icon="ui_image" iconSize={16} label="Добавить обложку" disabled={busy} onclick={() => coverInput?.click()} />
			</div>
		{/if}
	{/if}

	<div class="profile-head">
		<div
			class="profile-head__cover"
			style:background-image={profile.coverUrl ? `url(${profile.coverUrl})` : undefined}
			style:background-position="50% {editingCover ? coverY : (profile.coverY ?? 50)}%"
		>
			{#if isMe && profile.coverUrl}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class={['cover-manage', { 'cover-manage--edit': editingCover }]}
					onpointerdown={dragStart}
					onpointermove={dragMove}
					onpointerup={() => (coverDrag = undefined)}
					onpointercancel={() => (coverDrag = undefined)}
				>
					{#if editingCover}
						<Button icon="writing-save" iconSize={16} label="Сохранить" disabled={busy} onclick={saveCoverPosition} />
						<Button icon="ui_close" iconSize={12} label="Закрыть" disabled={busy} onclick={() => (editingCover = false)} />
					{:else}
						<Button icon="ui_image" iconSize={16} label="Сменить обложку" disabled={busy} onclick={() => coverInput?.click()} />
						<Button icon="v_gear" iconSize={18} label="Настроить" disabled={busy} onclick={startCoverEdit} />
						<Button icon="ui_close" iconSize={12} label="Удалить" disabled={busy} onclick={removeCover} />
					{/if}
				</div>
			{/if}
		</div>

		<div class="profile-head__avatar">
			<div class="profile-avatar-wrap">
				<button
					type="button"
					class="profile-avatar"
					style:background-image={profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined}
					aria-label="Открыть аватарку"
					disabled={!profile.avatarMedia} onpointerenter={() => profile.avatarMedia && preloadLightbox()}
					onclick={() => profile.avatarMedia && openLightbox([profile.avatarMedia], 0)}
				></button>
				{#if isMe}
					<button type="button" class="profile-avatar-change" title="Сменить фото" aria-label="Сменить фото" disabled={busy} onclick={() => avatarInput?.click()}>
						<svg height="16" width="16" class="icon" aria-hidden="true"><use href="/icons.svg#ui_photo"></use></svg>
					</button>
				{/if}
			</div>
		</div>

		<div class="profile-head__title">
			<h1 class="profile-title">
				<span class="profile-title__name">{profile.name}</span>
				{#if profile.isPlus}
					<span class="profile-title__badge" title="Plus">
						<svg height="24" width="24" class="icon" aria-hidden="true">
							<use href="/icons.svg#ui_badge_plus"></use>
						</svg>
					</span>
				{/if}
			</h1>
		</div>

		{#if profile.description || isMe}
			<div class="profile-head__description">
				{#if profile.description}
					<div class="profile-description">{profile.description}</div>
				{/if}
				{#if isMe}
					<a class="profile-description__edit" href={resolve('/settings')} onclick={openAccountSettings}>Изменить имя или описание</a>
				{/if}
			</div>
		{/if}

		<div class="profile-head__actions">
			{#if isMe}
				<Button icon="v_gear" iconSize={18} title="Настройки" aria-label="Настройки" onclick={() => openAccountSettings()} />
			{:else}
				<Button
					variant={subscribed ? 'default' : 'blue'}
					icon="v_follow"
					label={subscribed ? 'Вы подписаны' : 'Подписаться'}
					onclick={() => subscriptions.toggle(profile.id, wasSubscribed)}
				/>
				<!-- Колокольчик виден только после подписки -->
				{#if subscribed}
					<Button
						icon={notified ? 'bell_solid' : 'v_bell'}
						title={notified ? 'Не уведомлять о новых постах' : 'Уведомлять о новых постах'}
						aria-label="Уведомления о новых постах"
						aria-pressed={notified}
						onclick={() => subscriptions.toggleNotifications(profile.id, wasNotified)}
					/>
				{/if}
			{/if}
		</div>

		<div class="profile-head__stats profile-stats">
			<div class="profile-stats__row">
				{#if profile.rating}
					<div class={['profile-stats__change', { 'profile-stats__change--positive': profile.rating > 0 }]}>
						{formatRating(profile.rating)}
					</div>
				{/if}
				{#if profile.subscribersCount !== undefined}
					<a href="{externalUrl}/details/subscribers" target="_blank" rel="noreferrer" class="profile-stats__link" onclick={detailsLink('subscribers')}>
						{formatNumber(profile.subscribersCount)}
						{plural(profile.subscribersCount, ['подписчик', 'подписчика', 'подписчиков'])}
					</a>
				{/if}
			</div>
			{#if profile.createdAt}
				<div class="profile-stats__date">На проекте с {formatDate(profile.createdAt)}</div>
			{/if}
			<a href="{externalUrl}/details" target="_blank" rel="noreferrer" class="profile-stats__details-link" onclick={detailsLink('all')}>
				<svg height="16" width="16" class="icon" aria-hidden="true">
					<use href="/icons.svg#ui_info"></use>
				</svg>
				<span>Узнать подробнее</span>
			</a>
		</div>

		<nav class="profile-head__tabs profile-tabs" aria-label="Разделы профиля">
			<div class="profile-tabs__scroll">
				<div class="profile-tabs__content">
					<button type="button" class={['profile-tabs__item', { 'profile-tabs__item--active': tab === 'posts' }]} aria-current={tab === 'posts' ? 'page' : undefined} onclick={() => openTab('posts')}>
						<span class="profile-tabs__label">Статьи</span>
					</button>
					<button type="button" class={['profile-tabs__item', { 'profile-tabs__item--active': tab === 'comments' }]} aria-current={tab === 'comments' ? 'page' : undefined} onclick={() => openTab('comments')}>
						<span class="profile-tabs__label">Комментарии</span>
					</button>
					<button type="button" class={['profile-tabs__item profile-tabs__details', { 'profile-tabs__item--active': tab === 'details' }]} aria-current={tab === 'details' ? 'page' : undefined} onclick={() => openDetails('all')}>
						<span class="profile-tabs__label">Подробнее</span>
					</button>
				</div>
			</div>
		</nav>
	</div>

	{#if tab === 'details'}
		<ProfileDetails
			{profile}
			page={detailsPage}
			{subscribersPromise}
			{subscriptionsPromise}
			onNavigate={openDetails}
			onClose={() => openTab('posts')}
		/>
	{:else}
		<div class="profile-feed">
			{#if tab === 'posts'}
				<div class="profile-feed-sorting">
					{#each SORTINGS as item (item.value)}
						<button
							class={['profile-feed-sorting__button', { 'profile-feed-sorting__button--active': sorting === item.value }]}
							aria-pressed={sorting === item.value}
							onclick={() => onSortingChange(item.value)}
						>
							{item.label}
						</button>
					{/each}
				</div>

				<div class="profile-feed__posts">
					{#each posts as post (post.sourceId + '_' + post.id)}
						<PostCard {post} subscribe={false} />
					{/each}
				</div>

				{#if postsError}
					<p class="profile-feed__status">{postsError}</p>
				{:else if !loadingPosts && posts.length === 0}
					<p class="profile-feed__status">Постов пока нет</p>
				{/if}

				{#if hasMore}
					<div class="profile-feed__more" {@attach loadOnVisible(loadMore)}>
						{#if loadingPosts}<Preloader />{/if}
					</div>
				{/if}
			{:else}
				<div class="profile-comments">
					{#each comments as comment (comment.id)}
						<ProfileComment {comment} />
					{/each}
				</div>

				{#if commentsError}
					<p class="profile-feed__status">{commentsError}</p>
				{:else if commentsLoaded && !loadingComments && comments.length === 0}
					<p class="profile-feed__status">Комментариев пока нет</p>
				{/if}

				{#if commentsHasMore}
					<div class="profile-feed__more" {@attach loadOnVisible(loadComments)}>
						{#if loadingComments}<Preloader />{/if}
					</div>
				{/if}
			{/if}
		</div>

		<aside class="profile-sidebar">
			{@render sidebarBlock('Подписчики', profile.subscribersCount, subscribersPromise, true, 12, 'Показать всех', `${externalUrl}/details/subscribers`, 'subscribers')}
			{@render sidebarBlock('Подписки', profile.subscriptionsCount, subscriptionsPromise, false, 5, 'Показать все', `${externalUrl}/details/subscriptions`, 'subscriptions')}
		</aside>
	{/if}
</div>

<style>
	.profile-section {
		--page-sidebar-offset-top: 44px;
		display: grid;
		gap: 32px 20px;
		width: 100%;
		max-width: calc(var(--content-width) + 320px);
		margin: 0 auto;
		margin-bottom: 12px;
	}

	/* Шапка профиля */
	.profile-head {
		--border-radius: 8px;
		--offset-x: var(--island-offset-x, 20px);
		--offset-y: 24px;
		grid-template-columns: 1fr auto;
		min-width: 0;
		padding: var(--offset-y) var(--offset-x);
		border-radius: var(--border-radius);
		background-color: #fff;
		font-size: 16px;
		line-height: 1.5em;
	}

	.profile-head > * {
		grid-column: span 2;
		min-width: 0;
	}

	.profile-head__cover {
		position: relative;
		height: 280px;
		margin-top: calc(var(--offset-y) * -1);
		margin-left: calc(var(--offset-x) * -1);
		margin-right: calc(var(--offset-x) * -1);
		background: #dedede no-repeat 50% 50% / cover;
	}

	.profile-head__avatar {
		display: flex;
		margin-top: -88px;
	}

	/* Свой профиль: управление обложкой (по наведению) и камера на аватарке */
	.profile-cover-upload {
		--btn-height: 40px;
		--btn-icon-margin-left: 12px;
		--btn-icon-margin-right: -8px;
		display: flex;
		margin-bottom: -8px;
		padding: 12px 16px;
		border-radius: 8px;
		background-color: #fff;
	}

	.cover-manage {
		--btn-height: 40px;
		--btn-icon-margin-left: 12px;
		--btn-icon-margin-right: -8px;
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		visibility: hidden;
		opacity: 0;
		transform: translateY(2px);
		transition: all 0.1s;
		user-select: none;
	}

	.profile-head__cover:hover .cover-manage,
	.cover-manage--edit {
		visibility: visible;
		opacity: 1;
		transform: none;
	}

	.cover-manage--edit {
		background-color: rgba(255, 255, 255, 0.3);
		cursor: move;
		touch-action: none;
	}

	/* На телефоне наведения нет: кнопки обложки всегда на виду, только иконки */
	@media (hover: none) {
		.cover-manage {
			visibility: visible;
			opacity: 1;
			transform: none;
		}
	}

	.profile-avatar-wrap {
		position: relative;
		z-index: 1;
		flex-shrink: 0;
	}

	.profile-avatar-change {
		position: absolute;
		right: 4px;
		bottom: 4px;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 24px;
		padding: 0;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		background-color: #fff;
		box-shadow: 0 2px 1px rgba(0, 0, 0, 0.05);
		color: rgba(0, 0, 0, 0.65);
		cursor: pointer;
		visibility: hidden;
		opacity: 0;
		transform: translateY(2px);
		transition: all 0.1s;
	}

	.profile-avatar-wrap:hover .profile-avatar-change,
	.profile-avatar-change:focus-visible {
		visibility: visible;
		opacity: 1;
		transform: none;
	}

	@media (hover: none) {
		.profile-avatar-change {
			visibility: visible;
			opacity: 1;
			transform: none;
		}
	}

	.profile-avatar {
		--size: 112px;
		--border-width: 4px;
		position: relative;
		z-index: 1;
		flex-shrink: 0;
		width: var(--size);
		padding: 0;
		border: 0;
		overflow: hidden;
		border-radius: 6px;
		background: #dedede no-repeat 50% 50% / cover;
		box-shadow: 0 0 0 var(--border-width) #fff, inset 0 0 0 1px rgba(0, 0, 0, 0.1);
		cursor: zoom-in;
	}

	.profile-avatar:disabled {
		cursor: default;
	}

	.profile-avatar::before {
		content: '';
		display: block;
		padding-top: 100%;
	}

	.profile-head__title {
		margin-top: 8px;
		font-size: 36px;
		line-height: 1.46em;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.profile-title {
		display: flex;
		align-items: center;
		width: 100%;
		min-width: 0;
		font: inherit;
	}

	.profile-title__name {
		flex-shrink: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.profile-title__name:not(:last-child) {
		margin-right: 9px;
	}

	.profile-title__badge {
		display: flex;
		align-items: center;
		margin-top: 4px;
	}

	.profile-head__description {
		margin-top: 4px;
	}

	.profile-description {
		--line-height: 24px;
		--lines-limit: 2;
		max-height: calc(var(--line-height) * var(--lines-limit));
		overflow: hidden;
		overflow-wrap: break-word;
		white-space: pre-wrap;
	}

	.profile-description__edit {
		display: block;
		width: fit-content;
		color: var(--text-link);
	}

	.profile-description + .profile-description__edit {
		margin-top: 8px;
	}

	.profile-description__edit:hover {
		color: #cd192e;
	}

	/* Кнопки действий: подписка и колокольчик у чужого профиля, шестерёнка у своего */
	.profile-head__actions {
		--btn-height: 40px;
		--btn-icon-margin-left: 12px;
		--btn-icon-margin-right: -8px;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
	}

	/* Статистика */
	.profile-head__stats {
		margin-top: 11px;
	}

	.profile-stats {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		/* у DTF у каждой строки статистики отступ снизу 8px */
		padding-bottom: 8px;
	}

	.profile-stats__row {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.profile-stats__change {
		font-weight: 500;
	}

	.profile-stats__change--positive {
		color: var(--color-positive);
	}

	.profile-stats__details-link {
		display: none;
		align-items: center;
		color: var(--text-link);
		font-size: 14px;
		line-height: 1.43em;
		font-weight: 500;
	}

	.profile-stats__details-link .icon {
		flex-shrink: 0;
		margin-top: -1px;
		margin-right: 8px;
	}

	/* Вкладки */
	.profile-head__tabs {
		margin-top: 4px;
		margin-bottom: calc(var(--offset-y) * -1);
		margin-left: calc(var(--offset-x) * -1);
		margin-right: calc(var(--offset-x) * -1);
	}

	.profile-tabs {
		--height: 63px;
		--tab-offset: 12px;
		position: relative;
		height: var(--height);
		font-size: 17px;
	}

	.profile-tabs__scroll {
		overflow: hidden;
		border-radius: 8px;
		white-space: nowrap;
	}

	.profile-tabs__content {
		display: inline-flex;
		vertical-align: top;
		padding-left: var(--offset-x);
		padding-right: var(--offset-x);
	}

	.profile-tabs__item {
		flex-shrink: 0;
		border: 0;
		background: none;
		font: inherit;
		padding: 0 var(--tab-offset);
		color: #4d4d4d;
		cursor: pointer;
	}

	.profile-tabs__item:first-child {
		padding-left: 0;
	}

	.profile-tabs__item--active {
		color: #000;
		pointer-events: none;
	}

	.profile-tabs__label {
		display: flex;
		align-items: baseline;
		height: var(--height);
		line-height: calc(var(--height) + 1px);
	}

	.profile-tabs__item--active .profile-tabs__label {
		position: relative;
	}

	.profile-tabs__item--active .profile-tabs__label::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 3px;
		background-color: var(--color-blue);
	}

	@media (hover: hover) {
		.profile-tabs__item:hover {
			color: var(--color-blue);
		}
	}

	/* Вкладка «Комментарии» */
	.profile-comments {
		margin-top: 20px;
	}

	/* Лента профиля */
	.profile-feed {
		min-width: 0;
	}

	.profile-feed-sorting {
		display: flex;
		gap: 4px;
		margin-bottom: 12px;
	}

	.profile-feed-sorting__button {
		display: flex;
		align-items: center;
		padding: 4px 12px;
		border-radius: 20px;
		color: inherit;
		font: inherit;
		font-size: 16px;
		line-height: 24px;
		white-space: nowrap;
		cursor: pointer;
	}

	.profile-feed-sorting__button--active {
		background: #fff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
	}

	/* Первая карточка — сразу под сортировкой, между карточками — как в ленте */
	.profile-feed__posts > :global(.feed-item:first-child) {
		margin-top: 0;
	}

	.profile-feed__status {
		padding: 24px 0;
		color: var(--text-muted);
		text-align: center;
	}

	.profile-feed__more {
		display: flex;
		justify-content: center;
		min-height: 24px;
		padding-top: 16px;
	}

	/* Сайдбар */
	.profile-sidebar {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		gap: 20px;
		margin-top: var(--page-sidebar-offset-top);
	}

	.profile-sidebar-block {
		padding: 15px 20px 16px;
		background-color: #fff;
		font-size: 16px;
		line-height: 1.5em;
	}

	.profile-sidebar-block__title {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-top: -3px;
		margin-bottom: 16px;
		font-weight: 500;
	}

	.profile-sidebar-block__counter {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 1.43em;
		white-space: nowrap;
	}

	.profile-sidebar-block__show-all {
		display: block;
		margin-top: 16px;
		margin-bottom: -4px;
		color: var(--text-link);
		user-select: none;
	}

	.profile-sidebar-block__show-all:hover {
		color: #cd192e;
	}

	.profile-sidebar-list {
		display: grid;
		gap: 16px;
	}

	.profile-sidebar-list--grid {
		grid-template-columns: repeat(auto-fill, 32px);
		justify-content: space-between;
		gap: 12px;
	}

	.profile-sidebar-list__item {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		word-break: break-word;
	}

	.profile-sidebar-list__image {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		background-color: #dedede;
		object-fit: cover;
	}

	.profile-sidebar-list--grid .profile-sidebar-list__image {
		width: 32px;
		height: 32px;
		border-radius: 8px;
	}

	.profile-sidebar-list__label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (min-width: 640px) {
		.profile-sidebar-block {
			border-radius: 8px;
		}
	}

	@media (min-width: 1000px) {
		.profile-section {
			grid-template-columns: 1fr 300px;
		}

		.profile-cover-upload {
			grid-column: span 2;
			margin-bottom: -20px;
		}

		.profile-head {
			display: grid;
			grid-column: span 2;
		}

		.profile-feed {
			grid-column: 1;
		}

		.profile-sidebar {
			grid-column: 2;
		}

		.profile-head__stats {
			margin-top: 20px;
		}

		/* Кнопки стоят справа в строке заголовка */
		.profile-head__title {
			grid-column: 1;
			margin-right: 20px;
		}

		.profile-head__actions {
			grid-column: 2;
			grid-row: 3;
			align-self: start;
			margin-top: -4px;
		}
	}

	@media (max-width: 999px) {
		.profile-section {
			gap: 20px;
			max-width: var(--content-width);
			margin: 0 auto;
		}

		.profile-head {
			--offset-x: var(--island-offset-x, 16px);
			--offset-y: 16px;
		}

		.profile-head__cover {
			height: auto;
		}

		.profile-head__cover::before {
			content: '';
			display: block;
			padding-top: 32.8125%;
		}

		.profile-head__avatar {
			margin-top: -52px;
		}

		.profile-avatar {
			--size: 72px;
			--border-width: 2px;
		}

		.profile-head__title {
			font-size: 24px;
			line-height: 1.5em;
		}

		.profile-head__description {
			margin-top: 8px;
		}

		.profile-head__stats {
			margin-top: 17px;
			/* на телефоне последняя строка («Узнать подробнее») видна, и отступа под ней нет */
			padding-bottom: 0;
			font-size: 14px;
			line-height: 1.43em;
		}

		.profile-stats__details-link {
			display: flex;
		}

		.profile-tabs__details {
			display: none;
		}

		/* «Подробнее» на телефоне — отдельный экран без шапки профиля */
		.profile-section--details {
			gap: 0;
		}

		.profile-section--details .profile-head {
			display: none;
		}
	}

	@media (max-width: 859px) {
		.profile-feed-sorting {
			padding: 0 20px;
		}
	}

	@media (max-width: 639px) {
		.profile-head {
			--border-radius: 0;
		}

		.cover-manage :global(.btn__label) {
			display: none;
		}

		.cover-manage :global(.btn__icon) {
			margin: 0;
		}

		.profile-head__cover::before {
			padding-top: 40%;
		}
	}
</style>
