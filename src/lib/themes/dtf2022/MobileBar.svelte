<script lang="ts">
	import { resolve } from '$app/paths';
	import { openFeed, openOverlay } from '$lib/navigation';
	import { authStorage } from '$lib/storage/auth.svelte';

	function openAccount() {
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
			<a href={resolve('/')} class="mobile-bar__link" aria-label="Главная" onclick={openFeed}>
				<svg height="28" width="28" class="icon" aria-hidden="true">
					<use href="/icons.svg#v_home"></use>
				</svg>
			</a>
		</div>
		<!-- ponytail: мессенджера и уведомлений в API клиента пока нет -->
		<div class="mobile-bar__link-wrapper">
			<button class="mobile-bar__link" aria-label="Сообщения">
				<svg height="28" width="28" class="icon" aria-hidden="true">
					<use href="/icons.svg#v_messenger"></use>
				</svg>
			</button>
		</div>
		<div class="mobile-bar__link-wrapper">
			<button class="mobile-bar__link" aria-label="Уведомления">
				<svg height="28" width="28" class="icon" aria-hidden="true">
					<use href="/icons.svg#v_bell"></use>
				</svg>
			</button>
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
		background-color: #fff;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
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

	@media (max-width: 719px) {
		.mobile-bar-container {
			display: block;
		}
	}
</style>
