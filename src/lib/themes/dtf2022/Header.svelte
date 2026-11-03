<script lang="ts">
	import { resolve } from '$app/paths';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { getProfilePath, openFeed, openOverlay, openProfile } from '$lib/navigation';
	import { clickOnKey } from './a11y';
	import AccountMenu from './AccountMenu.svelte';
	import CreateButton from './CreateButton.svelte';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import { notifications } from '$lib/api/notifications.svelte';
	import NotificationsPanel from './NotificationsPanel.svelte';
	import { notificationsPopup } from './notificationsPopup.svelte';
	import { sidebar } from './sidebar.svelte';
	import { settings } from '$lib/storage/settings.svelte';

	let isUserMenuOpen = $state(false);
	let userNode = $state<HTMLElement>();
	let user = $derived(currentUser.value);

	$effect(() => {
		if (authStorage.isAuthenticated) {
			currentUser.load();
			notifications.load();
		} else {
			currentUser.clear();
			notifications.clear();
			isUserMenuOpen = false;
		}
	});

	/** Появление меню профиля, как slide-and-fade у DTF */
	function slideAndFade(_: Element) {
		return { duration: 200, css: (t: number, u: number) => `opacity: ${t}; transform: translateY(${-5 * u}px)` };
	}

	function openLogin() {
		openOverlay({ type: 'login' });
	}

	function closeOnOutsideClick(e: MouseEvent) {
		if (notificationsPopup.open && !(e.target as Element).closest('[data-notifications]')) {
			notificationsPopup.set(false);
		}
		if (isUserMenuOpen && !userNode?.contains(e.target as Node)) {
			isUserMenuOpen = false;
		}
	}
</script>

<svelte:window
	onclick={closeOnOutsideClick}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			notificationsPopup.set(false);
			isUserMenuOpen = false;
		}
	}}
/>

<header class={['header', { 'header--hidden-mobile': settings.value.disableMobileTopBar }]}>
	<div class="header-container">
		<div class="header-left">
			<div
				class="header-menu"
				aria-label="Открыть меню"
				aria-expanded={sidebar.open}
				role="button"
				tabindex="0"
				onclick={() => sidebar.toggle()}
				onkeydown={clickOnKey}
			>
				<svg width="24" height="24" aria-hidden="true">
					<use href="/icons.svg#v_menu"></use>
				</svg>
			</div>
			<a href={resolve('/')} class="header-logo" aria-label="re:DTF — на главную" onclick={openFeed}>
				<svg class="icon" height="50" width="128" aria-hidden="true">
					<use href="/reIcons.svg#redtf_logo"></use>
				</svg>
			</a>
		</div>

		<!-- От 1180px кнопка у правого края колонки текста, уже — слева от колокольчика -->
		<div class="header-center">
			<div class="header-create header-create--column">
				<CreateButton />
			</div>
		</div>

		<div class="header-right">
			<div class="header-create header-create--side">
				<CreateButton />
			</div>

			<div
				class={['header-notifications', { 'header-notifications--active': notificationsPopup.open }]}
				data-notifications
			>
				<div
					class="bell"
					aria-label="Уведомления"
					aria-expanded={notificationsPopup.open}
					role="button"
					tabindex="0"
					onclick={() => notificationsPopup.toggle()}
					onkeydown={clickOnKey}
				>
					<svg class="icon" width="28" height="28" aria-hidden="true">
						<use href="/icons.svg#v_bell"></use>
					</svg>
					{#if notifications.unread > 0}
						<span class="header-notifications__badge">{notifications.unread}</span>
					{/if}
				</div>

				<div class="notifications-panel">
					<NotificationsPanel />
				</div>
			</div>

			{#if authStorage.isAuthenticated}
				<div class="header-profile" bind:this={userNode}>
					<!-- Как у DTF: аватар ведёт в профиль, меню открывает стрелка с отступом справа -->
					<a
						class="header-profile__avatar"
						href={user ? resolve(getProfilePath(user.id) as any) : undefined}
						aria-label="Мой профиль"
						onclick={(e) => {
							isUserMenuOpen = false;
							if (user) openProfile(e, user.id);
						}}
					>
						<div class="header-profile__avatar-image" style:background-image={user?.avatarUrl ? `url('${user.avatarUrl}')` : undefined}></div>
					</a>
					<button
						type="button"
						class="header-profile__toggle"
						aria-label="Меню профиля"
						aria-haspopup="menu"
						aria-expanded={isUserMenuOpen}
						onclick={() => (isUserMenuOpen = !isUserMenuOpen)}
					>
						<svg class="icon" width="20" height="20" aria-hidden="true">
							<use href="/icons.svg#v_chevron_down"></use>
						</svg>
					</button>

					{#if isUserMenuOpen}
						<div class="header-profile__menu" role="menu" transition:slideAndFade>
							<AccountMenu {user} onclose={() => (isUserMenuOpen = false)} />
						</div>
					{/if}
				</div>
			{:else}
				<div class="header-user" aria-label="Войти" role="button" tabindex="0" onclick={openLogin} onkeydown={clickOnKey}>
					<div class="login">
						<svg class="icon" width="28" height="28" aria-hidden="true">
							<use href="/icons.svg#v_login"></use>
						</svg>
						<span class="login__label">Войти</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		left: 0;
		width: 100%;
		max-width: 100vw;
		height: var(--header-height);
		background-color: var(--bg-header);
		z-index: 100;
	}

	.header-container {
		display: grid;
		grid-template-columns: var(--sidebar-left-width) 1fr var(--sidebar-right-width);
		height: 100%;
		width: 100%;
	}

	.header-left,
	.header-right {
		display: flex;
		align-items: center;
		align-self: stretch;
	}

	.header-right {
		justify-content: flex-end;
	}

	.header-center {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.header-create {
		display: flex;
		align-items: center;
	}

	.header-create--column {
		width: 100%;
		max-width: var(--content-width);
		justify-content: flex-end;
	}

	.header-create--side {
		margin-right: 16px;
	}

	@media (min-width: 1180px) {
		.header-create--side {
			display: none;
		}
	}

	@media (max-width: 1179px) {
		.header-create--column {
			display: none;
		}
	}

	.header-menu {
		width: 24px;
		height: 24px;
		padding-left: 20px;
		box-sizing: content-box;
		cursor: pointer;
	}

	.header-menu:hover {
		opacity: 0.6;
	}

	.header-logo {
		padding-left: 15px;
		display: flex;
	}

	/* Уведомления */
	.header-notifications {
		display: flex;
		position: relative;
		align-self: stretch;
	}

	.header-notifications:hover .icon {
		fill: var(--color-accent);
	}

	.header-notifications--active .icon {
		transform: rotate(10deg);
		fill: var(--color-accent);
	}

	.header-notifications--active .bell::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 50%;
		margin-left: -8px;
		border-left: 7px solid transparent;
		border-right: 7px solid transparent;
		border-bottom: 7px solid #fff;
	}

	.bell {
		display: flex;
		align-items: center;
		padding: 0 16px;
		cursor: pointer;
	}

	.header-notifications__badge {
		position: absolute;
		left: 50%;
		top: 15%;
		min-width: 12px;
		padding: 3px 5px;
		border-radius: 4px;
		background-color: #e62e3b;
		color: #fff;
		font-size: 12px;
		line-height: 1em;
	}

	.notifications-panel {
		display: none;
		position: absolute;
		top: 100%;
		right: -5px;
		width: 430px;
		background: #fff;
		color: #000;
		box-shadow: 0 3px 5px 0 rgba(116, 116, 116, 0.25);
		z-index: 2;
		font-size: 13px;
	}

	.header-notifications--active .notifications-panel {
		display: block;
	}

	/* Вход */
	.header-user {
		display: flex;
		position: relative;
		cursor: pointer;
		align-self: stretch;
		margin-right: 40px;
		padding-left: 16px;
	}

	.header-user:hover {
		fill: var(--color-accent);
		color: var(--color-accent);
	}

	/* Профиль: аватар и стрелка меню (navigation-user-profile) */
	.header-profile {
		--offset-left: 16px;
		--offset-right: 40px;

		display: flex;
		position: relative;
		align-self: stretch;
	}

	.header-profile__avatar {
		display: flex;
		align-items: center;
		padding-left: var(--offset-left);
	}

	.header-profile__avatar-image {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #dedede 50% 50% / cover no-repeat;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	.header-profile__avatar:hover .header-profile__avatar-image {
		opacity: 0.9;
	}

	/* Кликабельна и стрелка, и отступ справа от неё */
	.header-profile__toggle {
		display: flex;
		align-items: center;
		padding-left: 4px;
		padding-right: var(--offset-right);
		cursor: pointer;
	}

	.header-profile__toggle:hover {
		opacity: 0.6;
	}

	.header-profile__menu {
		position: absolute;
		top: calc(100% - 2px);
		right: var(--offset-right);
		width: 300px;
		max-height: calc(100vh - var(--header-height) - 12px);
		overflow-y: auto;
		border-radius: 8px;
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.06),
			0 0 1px rgba(0, 0, 0, 0.25);
	}

	@media (max-width: 859px) {
		.header-profile {
			--offset-right: 20px;
		}
	}

	.login {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.login__label {
		font-weight: 500;
		font-size: 16px;
		line-height: 16px;
	}

	@media (max-width: 768px) {
		.header-container {
			display: flex;
			justify-content: space-between;
		}

		.header-center {
			display: none;
		}
	}

	@media (max-width: 719px) {
		.header--hidden-mobile {
			display: none;
		}

		.header-menu,
		.header-logo {
			padding-left: 16px;
		}

		.header-logo .icon {
			width: 95px;
		}

		/* Колокольчик и профиль уходят в мобильную строку, «Создать» остаётся значком */
		.header-notifications,
		.header-profile,
		.header-user {
			display: none;
		}
	}
</style>
