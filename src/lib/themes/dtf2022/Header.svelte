<script lang="ts">
	import { authStorage } from '$lib/storage/auth.svelte';
	import { resolve } from '$app/paths';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { pushOverlay } from '$lib/overlays';
	import { onMount } from 'svelte';

	let isNotificationsOpen = $state(false);

	function toggleNotifications(e: MouseEvent) {
		e.stopPropagation();
		isNotificationsOpen = !isNotificationsOpen;
	}

	function closeNotifications() {
		isNotificationsOpen = false;
	}

	function openLogin(e: MouseEvent) {
		e.preventDefault();
		if (authStorage.isAuthenticated) {
			pushOverlay('settings', '/settings');
		} else {
			pushOverlay('login', '/login');
		}
	}

	function openFeed(e: MouseEvent) {
		if (page.state.overlays && page.state.overlays.length > 0) {
			e.preventDefault();
			pushState(resolve('/'), { overlays: [] });
			return;
		}

		if (page.url.pathname === resolve('/')) {
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: 'smooth' });
			window.dispatchEvent(new CustomEvent('refreshFeed'));
			return;
		}
	}

	$effect(() => {
		if (isNotificationsOpen) {
			const handleOutsideClick = (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!target.closest('.header-notifications')) {
					closeNotifications();
				}
			};
			window.addEventListener('click', handleOutsideClick);
			return () => window.removeEventListener('click', handleOutsideClick);
		}
	});
</script>

<header class="header">
	<div class="header-container">
		<div class="header-left">
			<div class="header-menu" aria-label="Открыть меню" role="button" tabindex="0">
				<svg width="24" height="24" aria-hidden="true">
					<use href="/icons.svg#v_menu"></use>
				</svg>
			</div>
			<a href={resolve('/')} class="header-logo" onclick={openFeed} aria-label="reDTF Главная">
				<svg class="icon" height="50" width="128">
					<use href="/reIcons.svg#redtf_logo"></use>
				</svg>
			</a>
		</div>

		<div class="header-center mobile-hide">
		</div>

		<div class="header-right mobile-hide">
			<div class="header-notifications" class:header-notifications--active={isNotificationsOpen}>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div class="bell" aria-label="Уведомления" role="button" tabindex="0" onclick={toggleNotifications}>
					<svg class="icon" width="28" height="28" aria-hidden="true">
						<use href="/icons.svg#v_bell"></use>
					</svg>
					{#if authStorage.isAuthenticated}
						<span class="header-notifications__badge">
							0
						</span>
					{/if}
				</div>

				<div class="notifications-panel">
					<div class="notifications">
						<header class="notifications__header">
							<span class="notifications__title">
								Уведомления
							</span>
						</header>
						<div class="notifications__items-container">
							<div class="notifications__loader">
								<div class="loader preloader preloader--default">
									<span class="preloader__dot"></span>
									<span class="preloader__dot"></span>
									<span class="preloader__dot"></span>
								</div>
							</div>
						</div>
						<footer class="notifications__footer">
							<a href={resolve('/notifications' as any)} class="notifications__footer-link t-link-inline">
								Все уведомления
							</a>
						</footer>
					</div>
				</div>
			</div>
			
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="header-user" onclick={openLogin} role="button" tabindex="0">
				<div class="login" aria-label={authStorage.isAuthenticated ? 'Профиль' : 'Войти'}>
					<svg class="icon" width="28" height="28" aria-hidden="true">
						<use href="/icons.svg#v_login"></use>
					</svg>
					<span class="span">
						{authStorage.isAuthenticated ? 'Профиль' : 'Войти'}
					</span>
				</div>
			</div>
		</div>
	</div>
</header>
