<script lang="ts">
	import { resolve } from '$app/paths';
	import { openFeed, openNotifications, openOverlay } from '$lib/navigation';
	import { notifications } from '$lib/api/notifications.svelte';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { haptics } from '$lib/haptics';

	function handleFeed(e: MouseEvent) {
		haptics.tick();
		openFeed(e);
	}

	function handleNotifications(e: MouseEvent) {
		haptics.tick();
		openNotifications(e);
	}

	function openAccount() {
		haptics.tick();
		if (authStorage.isAuthenticated) {
			openOverlay({ type: 'settings' });
		} else {
			openOverlay({ type: 'login' });
		}
	}
</script>

<nav class="mobile-bar-container" aria-label="Навигация">
	<div class="mobile-bar">
		<div class="mobile-bar__link-wrapper">
			<a href={resolve('/')} class="mobile-bar__link" aria-label="Главная" onclick={handleFeed}>
				<svg height="28" width="28" class="icon" aria-hidden="true">
					<use href="/icons.svg#v_home"></use>
				</svg>
			</a>
		</div>
		<!-- TODO: мессенджер у DTF по подписке, на аккаунте без неё его запросы не снять -->
		<div class="mobile-bar__link-wrapper">
			<button class="mobile-bar__link" aria-label="Сообщения" onclick={() => haptics.tick()}>
				<svg height="28" width="28" class="icon" aria-hidden="true">
					<use href="/icons.svg#v_messenger"></use>
				</svg>
			</button>
		</div>
		<div class="mobile-bar__link-wrapper">
			<!-- На мобильном вместо попапа — страница уведомлений -->
			<a href={resolve('/notifications')} class="mobile-bar__link mobile-bar__notifications" aria-label="Уведомления" onclick={handleNotifications}>
				<svg height="28" width="28" class="icon" aria-hidden="true">
					<use href="/icons.svg#v_bell"></use>
				</svg>
				{#if notifications.unread > 0}
					<span class="mobile-bar__badge">{notifications.unread}</span>
				{/if}
			</a>
		</div>
		<div>
			<button class="mobile-bar__link" aria-label={authStorage.isAuthenticated ? 'Настройки' : 'Войти'} onclick={openAccount}>
				<svg height="28" width="28" class="icon" aria-hidden="true">
					<use href="/icons.svg#v_login"></use>
				</svg>
			</button>
		</div>
	</div>
</nav>

<style>
	.mobile-bar-container {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 100;
	}

	.mobile-bar {
		--touch-zone-size: calc(var(--mobile-bar-height-raw) - 2px * 2);
		--padding-x: calc(24px - (var(--touch-zone-size) - 28px) / 2);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: var(--bg-card);
		border-top: 1px solid var(--border-subtle-2);
		padding: 0 var(--padding-x) env(safe-area-inset-bottom);
		height: var(--mobile-bar-height);
	}

	.mobile-bar__link-wrapper {
		position: relative;
	}

	.mobile-bar__link {
		display: flex;
		height: var(--touch-zone-size);
		width: var(--touch-zone-size);
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: inherit;
		cursor: pointer;
	}

	.mobile-bar__notifications {
		position: relative;
	}

	.mobile-bar__badge {
		position: absolute;
		left: 50%;
		top: 18%;
		min-width: 12px;
		padding: 3px 5px;
		border-radius: 4px;
		background-color: var(--color-badge);
		color: var(--text-on-accent);
		font-size: 12px;
		line-height: 1em;
	}

	@media (max-width: 719px) {
		.mobile-bar-container {
			display: block;
		}
	}
</style>
