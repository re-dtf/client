<script lang="ts">
	import { resolve } from '$app/paths';
	import { pushOverlay } from '$lib/overlays';
	import { authStorage } from '$lib/storage/auth.svelte';

	function openLogin() {
		if (authStorage.isAuthenticated) {
			pushOverlay('settings', '/settings');
		} else {
			pushOverlay('login', '/login');
		}
	}
</script>

<div class="mobile-bar-container">
	<div class="mobile-bar">
		<div class="mobile-bar__feed mobile-bar__link-wrapper">
			<a href={resolve('/')} class="mobile-bar__link" aria-label="Главная">
				<svg height="28" width="28" class="mobile-bar__icon icon icon--home" aria-hidden="true">
					<use href="/icons.svg#v_home"></use>
				</svg>
			</a>
		</div>
		<div class="mobile-bar__messenger mobile-bar__link-wrapper">
			<a href={resolve('/messages' as any)} class="mobile-bar__link" aria-label="Сообщения">
				<svg height="28" width="28" class="mobile-bar__icon icon icon--messenger" aria-hidden="true">
					<use href="/icons.svg#v_messenger"></use>
				</svg>
			</a>
		</div>
		<div class="mobile-bar__notifications mobile-bar__link-wrapper">
			<a href={resolve('/notifications' as any)} class="mobile-bar__link" aria-label="Уведомления">
				<svg height="28" width="28" class="mobile-bar__icon icon icon--bell" aria-hidden="true">
					<use href="/icons.svg#v_bell"></use>
				</svg>
			</a>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="mobile-bar__profile" onclick={openLogin} role="button" tabindex="0">
			<div class="mobile-bar__link" aria-label="Профиль">
				<svg height="28" width="28" class="icon icon--login mobile-bar__account-anon">
					<use href="/icons.svg#v_login"></use>
				</svg>
			</div>
		</div>
	</div>
</div>
