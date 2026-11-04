<script lang="ts">
	import { resolve } from '$app/paths';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { getProfilePath, openOverlay, openProfile } from '$lib/navigation';
	import type { CurrentUser } from '$lib/api/types';

	let { user, onclose }: { user: CurrentUser | null; onclose: () => void } = $props();

	// Пункты меню DTF на десктопе (default-view.vue → itemGroupsDesktop).
	// «Создать сообщество» не добавлен — в re:DTF нет создания сообществ
	const ITEMS: { icon: string; label: string; url?: string; action?: () => void }[] = [
		{ icon: 'v_pen', label: 'Черновики', url: 'https://dtf.ru/u/me/drafts' },
		{ icon: 'v_rouble', label: 'Донаты', url: 'https://dtf.ru/u/me/donates' },
		{ icon: 'v_gear', label: 'Настройки', action: () => openOverlay({ type: 'settings' }) },
		{ icon: 'v_logout', label: 'Выйти', action: () => authStorage.logout() }
	];

	function openMyProfile(e: MouseEvent) {
		if (!user) return;
		openProfile(e, user.id);
		onclose();
	}

	function select(action?: () => void) {
		action?.();
		onclose();
	}
</script>

<div class="account-menu-root">
	<div class="account-menu">
		<p class="account-menu__title">Мой профиль</p>

		{#if user}
			<a class="account-menu__user-card" href={resolve(getProfilePath(user.id) as any)} onclick={openMyProfile}>
				<div class="user-card">
					<div class="user-card__avatar" style:background-image={user.avatarUrl ? `url('${user.avatarUrl}')` : undefined}></div>
					<span class="user-card__text">{user.name}</span>
				</div>
			</a>
		{/if}

		<div class="account-menu__items-group">
			{#each ITEMS as item (item.label)}
				<div class="account-menu__item-wrapper">
					{#if item.url}
						<a class="account-menu__item" href={item.url} target="_blank" rel="noopener noreferrer" onclick={onclose}>
							<svg class="icon account-menu__item-icon" width="24" height="24" aria-hidden="true">
								<use href="/icons.svg#{item.icon}"></use>
							</svg>
							<span class="account-menu__item-label">{item.label}</span>
						</a>
					{:else}
						<button type="button" class="account-menu__item" onclick={() => select(item.action)}>
							<svg class="icon account-menu__item-icon" width="24" height="24" aria-hidden="true">
								<use href="/icons.svg#{item.icon}"></use>
							</svg>
							<span class="account-menu__item-label">{item.label}</span>
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.account-menu-root {
		background: var(--bg-card);
		color: var(--text-primary);
		font-size: 17px;
		line-height: 26px;
	}

	.account-menu {
		padding: 12px 6px 8px 6px;
	}

	.account-menu__title {
		margin-bottom: 8px;
		padding: 0 10px;
		font-size: 15px;
		line-height: 24px;
		font-weight: 500;
	}

	.account-menu__items-group {
		margin-top: 8px;
	}

	.account-menu__item-wrapper {
		padding: 4px 0;
	}

	.account-menu__user-card,
	.account-menu__item {
		display: block;
		border-radius: 8px;
		color: var(--text-primary);
	}

	.account-menu__item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 8px 10px;
		/* кнопки («Настройки», «Выйти») по умолчанию не наследуют шрифт — иначе они мельче ссылок */
		font: inherit;
		font-weight: 400;
		cursor: pointer;
	}

	.account-menu__user-card:hover,
	.account-menu__item:hover {
		background: var(--bg-card-hover);
	}

	.account-menu__item-icon {
		flex-shrink: 0;
		margin-right: 16px;
	}

	.account-menu__item-label {
		text-align: left;
	}

	.user-card {
		display: flex;
		align-items: center;
		padding: 8px 10px;
	}

	.user-card__avatar {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		margin-right: 12px;
		border-radius: 50%;
		background: var(--bg-card-hover) 50% 50% / cover no-repeat;
		box-shadow: inset 0 0 0 1px var(--border-avatar);
	}

	.user-card__text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
