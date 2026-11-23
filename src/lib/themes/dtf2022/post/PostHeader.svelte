<script lang="ts">
	import type { ContentControls, Post } from '$lib/api/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { openExternalUrl } from '$lib/capacitor';
	import { closeOverlay, getPostPath, getPostShareUrl, getProfilePath, openOverlay, openPost, openProfile } from '$lib/navigation';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { api } from '$lib/api/index.svelte';
	import { type AuthorAction, authorMenuItems, authorZoneMenu, ensureLogin, hidePost, isAnotherDtfUser, markPostDeleted, profileContextMenu, runAuthorAction, subscriptions } from '../actions.svelte';
	import ComplaintDialog from '../ComplaintDialog.svelte';
	import ConfirmPopup from '../ui/ConfirmPopup.svelte';
	import Popover from '../ui/Popover.svelte';
	import PlusBadge from '../ui/PlusBadge.svelte';
	import { notify } from '../ui/notify.svelte';
	import { formatFullDate, formatTime } from '../format';
	import { animatedAvatar } from '$lib/actions/animatedAvatar.svelte';

	let {
		post,
		variant = 'card',
		subscribe = false,
		onoverlaychange
	}: {
		post: Pick<Post, 'id' | 'sourceId' | 'author' | 'subsite' | 'createdAt' | 'isPinned' | 'isDraft'>;
		/** card — карточка в ленте и встроенный пост, page — страница поста */
		variant?: 'card' | 'page';
		/** Кнопка «Подписаться» справа */
		subscribe?: boolean;
		onoverlaychange?: (open: boolean) => void;
	} = $props();

	// В личном блоге подсайт — это сам автор, второй раз имя не показываем
	let isPersonalBlog = $derived(!!post.subsite && post.subsite.id === post.author.id);
	let showSubscribe = $derived(
		subscribe && !!post.subsite && post.subsite.id !== currentUser.value?.id && !subscriptions.isSubscribed(post.subsite.id, post.subsite.isSubscribed)
	);

	// Скрыть пост и заблокировать может только вошедший, скрыть автора у себя — любой
	let menuOpen = $state(false);
	let complaining = $state(false);
	let confirmingDelete = $state(false);
	let copyingToDraft = $state(false);
	let controlsState = $state<{ postId: number; value: ContentControls }>();
	let controls = $derived(controlsState?.postId === post.id ? controlsState.value : undefined);
	// Черновик виден только автору: время не ведёт на страницу, меню «⋯» выключено (на действия с черновиком сервер отвечает ошибкой)
	let draft = $derived(post.isDraft === true);
	let others = $derived(isAnotherDtfUser(post.sourceId, post.author.id));
	let isOwnDtf = $derived(!draft && post.sourceId === 'dtf' && authStorage.isAuthenticated && !others);
	const notifyOverlay = () => onoverlaychange?.(menuOpen || complaining || confirmingDelete);
	const setMenuOpen = (v: boolean) => {
		menuOpen = v;
		notifyOverlay();
		if (v && isOwnDtf && controlsState?.postId !== post.id) {
			const targetId = post.id;
			api.getContentControls(post.id)
				.then((value) => (controlsState = { postId: targetId, value }))
				.catch(() => {
					if (controlsState?.postId === targetId) controlsState = undefined;
				});
		}
	};
	const setComplaining = (v: boolean) => {
		complaining = v;
		notifyOverlay();
	};
	const setConfirmingDelete = (v: boolean) => {
		confirmingDelete = v;
		notifyOverlay();
	};
	let menuItems = $derived([
		{ value: 'copy' as const, label: 'Копировать ссылку', icon: 'v_link', group: 'content' },
		...(post.sourceId === 'dtf' ? [{ value: 'open_dtf' as const, label: 'Открыть на DTF', icon: 'v_external', group: 'content' }] : []),
		...(isOwnDtf && controls?.editEntry ? [{ value: 'copy_to_draft' as const, label: copyingToDraft ? 'Копирование…' : 'Скопировать в черновики', icon: 'v_pen', group: 'content' }] : []),
		...(others && currentUser.value ? [{ value: 'hide_post' as const, label: 'Скрыть пост', icon: 'v_eye', hint: 'Пост пропадёт из всех ваших лент на DTF' }] : []),
		...(others ? authorMenuItems(post.author) : []),
		...(others ? [{ value: 'complain' as const, label: 'Пожаловаться', icon: 'v_flag', group: 'moderation' }] : []),
		...(isOwnDtf && controls?.remove ? [{ value: 'delete_post' as const, label: 'Удалить', icon: 'v_delete', group: 'moderation' }] : [])
	]);
	let showMenu = $derived(menuItems.length > 0);

	async function copyLink() {
		const url = getPostShareUrl(post);
		try {
			await navigator.clipboard.writeText(url);
			notify.success('Ссылка скопирована');
		} catch {
			notify.error('Не удалось скопировать ссылку');
		}
	}

	async function deletePost() {
		await api.deletePost(post.id);
		markPostDeleted(post);
		notify.success('Пост удалён');
		if (variant === 'page') {
			if (page.state.overlays?.length) closeOverlay();
			else goto(resolve('/'), { replace: true });
		}
	}

	async function copyToDraft() {
		if (copyingToDraft) return;
		copyingToDraft = true;
		try {
			const postId = await api.copyPostToDraft(post.id);
			notify.success('Черновик создан');
			openOverlay({ type: 'editor', data: { postId } });
		} catch (e) {
			notify.error(e instanceof Error ? e.message : 'Не удалось создать черновик');
		} finally {
			copyingToDraft = false;
		}
	}

	function selectMenuItem(item: 'open_dtf' | 'copy' | 'hide_post' | 'complain' | 'copy_to_draft' | 'delete_post' | AuthorAction) {
		if (item.endsWith('_author')) {
			runAuthorAction(item as AuthorAction, post.author);
		} else if (item === 'open_dtf') {
			openExternalUrl(`https://dtf.ru/${post.id}`);
		} else if (item === 'copy') {
			copyLink();
		} else if (item === 'hide_post') {
			hidePost(post);
		} else if (item === 'complain') {
			setComplaining(ensureLogin());
		} else if (item === 'copy_to_draft') {
			copyToDraft();
		} else if (item === 'delete_post') {
			setConfirmingDelete(true);
		}
	}
</script>

{#if complaining}
	<ComplaintDialog onsubmit={(reasonId) => api.complain('post', post.id, reasonId)} onclose={() => setComplaining(false)} />
{/if}

{#if confirmingDelete}
	<ConfirmPopup
		title="Удалить пост?"
		message="Пост будет удалён без возможности восстановления."
		errorMessage="Не удалось удалить пост"
		onconfirm={deletePost}
		onclose={() => setConfirmingDelete(false)}
	/>
{/if}

<div class={['post-header', { 'post-header--card': variant === 'card' }]}>
	<div class="post-header__info" {@attach authorZoneMenu(() => post.subsite ?? post.author)}>
		{#if post.subsite}
			{@const subsite = post.subsite}
			<div class="post-header__item post-header-subsite">
				<a href={resolve(getProfilePath(subsite.id) as any)} onclick={(e) => openProfile(e, subsite.id)} {@attach profileContextMenu(subsite)}>
					<div class="post-header-subsite__avatar" {@attach animatedAvatar(subsite.avatarUrl)}>
						{#if subsite.avatarUrl}
							<img src={subsite.avatarUrl} alt="" />
						{/if}
					</div>
					<div class="post-header-subsite__name">{subsite.name}</div>
				</a>
			</div>
		{/if}

		{#if !isPersonalBlog}
			<div class="post-header__item post-header-author">
				<a
					class="post-header-author__name"
					href={resolve(getProfilePath(post.author.id) as any)}
					onclick={(e) => openProfile(e, post.author.id)}
					{@attach profileContextMenu(post.author)}
				>
					{post.author.name}
				</a>
				{#if variant === 'page' && post.author.isPlus}
					<div class="post-header-author__badge">
						<PlusBadge author={post.author} size={20} />
					</div>
				{/if}
			</div>
		{/if}

		{#snippet times()}
			{#if variant === 'page'}
				<!-- Как у DTF: на узких экранах время в дате не показываем -->
				<time class="time time--full" datetime={post.createdAt} title={formatFullDate(post.createdAt)}>
					{formatTime(post.createdAt, true)}
				</time>
				<time class="time time--short" datetime={post.createdAt} title={formatFullDate(post.createdAt)}>
					{formatTime(post.createdAt, false)}
				</time>
			{:else}
				<time class="time" datetime={post.createdAt} title={formatFullDate(post.createdAt)}>
					{formatTime(post.createdAt)}
				</time>
			{/if}
		{/snippet}

		{#if draft}
			<div class="post-header__item post-header-time">{@render times()}</div>
		{:else}
			<a class="post-header__item post-header-time" href={resolve(getPostPath(post) as any)} onclick={(e) => openPost(e, post)}>{@render times()}</a>
		{/if}

		{#if post.isPinned}
			<div class="post-header__item post-header-pin" title="Закреплено">
				<svg class="icon" width="11" height="11" aria-hidden="true">
					<use href="#ui_pin"></use>
				</svg>
			</div>
		{/if}
	</div>

	{#if showSubscribe}
		<div class="spacer"></div>

		<div class="post-header__item post-header__subscribe">
			<button
				type="button"
				class="subscribe-button"
				title="Подписаться"
				aria-label="Подписаться"
				onclick={() => post.subsite && subscriptions.toggle(post.subsite.id, post.subsite.isSubscribed)}
			>
				<span class="subscribe-button__icon">
					<svg height="20" width="20" class="icon" aria-hidden="true">
						<use href="#v_follow"></use>
					</svg>
				</span>
				<span class="subscribe-button__label">Подписаться</span>
			</button>
		</div>
	{/if}

	{#if showMenu}
		{#if !showSubscribe}<div class="spacer"></div>{/if}

		<div class="post-header__item post-header__etc">
			<Popover
				bind:open={() => menuOpen, setMenuOpen}
				items={menuItems}
				onselect={selectMenuItem}
				width="max-content"
				label="Действия с постом"
			>
				<button type="button" class="post-header__etc-button" title="Больше" disabled={draft} aria-expanded={menuOpen} onclick={() => setMenuOpen(!menuOpen)}>
					<svg class="icon" width="16" height="20" aria-hidden="true">
						<use href="#v_etc"></use>
					</svg>
				</button>
			</Popover>
		</div>
	{/if}
</div>

<style>
	.post-header {
		display: flex;
		align-items: center;
		height: 32px;
		margin-bottom: 12px;
		font-size: 15px;
		line-height: 22px;
	}

	.post-header--card {
		height: 40px;
		margin-bottom: 10px;
		padding: 16px var(--island-offset-x, 16px) 0;
	}

	.post-header__info {
		display: flex;
		align-items: baseline;
		min-width: 0;
	}

	.post-header__info:not(:last-child) {
		margin-right: 8px;
	}

	.post-header__item {
		min-width: 0;
		white-space: nowrap;
	}

	.post-header__item:not(:last-child) {
		margin-right: 14px;
	}

	.spacer {
		flex: 1;
	}

	/* Как .etc_control у DTF: серая, при наведении чёрная */
	.post-header__etc {
		display: flex;
		align-items: center;
		margin-left: 14px;
	}

	.post-header__etc-button {
		position: relative;
		display: flex;
		align-items: center;
		color: var(--text-muted);
		cursor: pointer;
	}

	.post-header__etc-button::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 32px;
		height: 32px;
		transform: translate(-50%, -50%);
	}

	@media (pointer: coarse), (max-width: 859px) {
		.post-header__etc-button::after {
			width: 44px;
			height: 44px;
		}
	}

	.post-header__etc-button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.post-header__etc-button[aria-expanded='true'] {
		color: var(--text-primary);
	}

	/* Подсайт */
	.post-header-subsite {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		font-weight: 500;
	}

	.post-header-subsite a {
		display: block;
		min-width: 0;
		max-width: 100%;
	}

	.post-header-subsite__avatar {
		position: absolute;
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		margin-right: 8px;
		overflow: hidden;
		border-radius: 6px;
	}

	.post-header-subsite__avatar img {
		width: 22px;
		height: 22px;
	}

	.post-header-subsite__name {
		max-width: 200px;
		margin-left: 30px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Автор */
	.post-header-author {
		display: flex;
		align-items: center;
	}

	.post-header-author__name {
		min-width: 0;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.post-header-author__badge {
		display: flex;
		margin-left: 5px;
	}

	/* Время и закреп */
	.post-header-time {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		min-width: 0;
		color: var(--text-muted);
	}

	.time {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.time--short {
		display: none;
	}

	.post-header-pin {
		position: relative;
		display: flex;
		flex-shrink: 0;
		color: var(--text-muted);
	}

	/* Подписка */
	.post-header__subscribe {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.subscribe-button {
		--offset: 8px;
		position: relative;
		display: flex;
		align-items: center;
		color: var(--text-link);
		font-size: 14px;
		white-space: nowrap;
		cursor: pointer;
	}

	@media (pointer: coarse), (max-width: 859px) {
		.subscribe-button::after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: max(100%, 44px);
			height: 44px;
			transform: translate(-50%, -50%);
		}
	}

	.subscribe-button__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.subscribe-button__icon:not(:only-child) {
		margin-left: calc(var(--offset) * 0.75);
		margin-right: calc(var(--offset) * -0.5);
	}

	.subscribe-button__label {
		padding: 0 0 0 var(--offset);
		margin: 0 auto;
		font-weight: 500;
		line-height: 21px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (min-width: 860px) {
		.post-header__item:not(:last-child) {
			margin-right: 24px;
		}
	}

	@media (max-width: 859px) {
		.post-header {
			margin-bottom: 8px;
		}

		.post-header--card {
			margin-bottom: 12px;
		}

		.post-header__info {
			overflow: hidden;
		}

		.post-header-subsite__name {
			max-width: 112px;
		}

		.time--full {
			display: none;
		}

		.time--short {
			display: block;
		}
	}

	@media (max-width: 639px) {
		.post-header-subsite {
			flex-shrink: 1;
		}

		.post-header-author {
			flex-shrink: 2;
		}

		.subscribe-button__icon:not(:only-child) {
			margin: 0;
		}

		.subscribe-button__label {
			display: none;
		}
	}

	@media (hover: hover) {
		.post-header__etc-button:not(:disabled):hover {
			color: var(--text-primary);
		}

		a.post-header-time:hover {
			color: var(--text-link);
		}
	}
</style>
