<script lang="ts">
	import { authStorage } from '$lib/storage/auth.svelte';
	import { resolve } from '$app/paths';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';

	function handleLogout(e: Event) {
		e.preventDefault();
		authStorage.logout();
		window.location.reload();
	}

	function openSettings(e: MouseEvent) {
		e.preventDefault();
		const overlays = page.state.overlays || [];
		pushState(resolve('/settings'), { 
			overlays: [...overlays, { id: `settings-${Date.now()}`, type: 'settings', presentation: 'modal' }] 
		});
	}

	function openLogin(e: MouseEvent) {
		e.preventDefault();
		const overlays = page.state.overlays || [];
		pushState(resolve('/login'), { 
			overlays: [...overlays, { id: `login-${Date.now()}`, type: 'login', presentation: 'modal' }] 
		});
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
</script>

<nav class="modern-navbar">
	<div class="container nav-content">
		<a href={resolve('/')} class="logo" onclick={openFeed}>
			<div class="logo-icon"></div>
			reDTF
		</a>
		<div class="links">
			<a href={resolve('/')} class="nav-link" onclick={openFeed}>
				<span class="icon">🏠</span> Лента
			</a>
			<a href={resolve('/settings')} class="nav-link" onclick={openSettings}>
				<span class="icon">⚙️</span> Настройки
			</a>
			<div class="divider"></div>
			{#if authStorage.isAuthenticated}
				<a href={resolve('/')} onclick={handleLogout} class="nav-link logout-btn">Выйти</a>
			{:else}
				<a href={resolve('/login')} class="nav-link login-btn" onclick={openLogin}>Войти</a>
			{/if}
		</div>
	</div>
</nav>

<style>
	.modern-navbar {
		background: rgba(25, 25, 25, 0.95);
		backdrop-filter: blur(10px);
		position: sticky;
		top: 0;
		z-index: 100;
		color: white;
		box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
	}

	.nav-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 70px;
		max-width: 900px;
		margin: 0 auto;
		padding: 0 20px;
	}

	.logo {
		font-size: 22px;
		font-weight: 800;
		color: #ffffff;
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 12px;
		letter-spacing: -0.5px;
	}

	.logo-icon {
		width: 32px;
		height: 32px;
		background: linear-gradient(135deg, #ff4b2b, #ff416c);
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(255, 65, 108, 0.3);
	}

	.links {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nav-link {
		text-decoration: none;
		color: #b3b3b3;
		font-weight: 600;
		padding: 8px 16px;
		border-radius: 20px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.nav-link:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.1);
	}

	.icon {
		font-size: 1.1em;
	}

	.divider {
		width: 1px;
		height: 24px;
		background: rgba(255, 255, 255, 0.2);
		margin: 0 8px;
	}

	.login-btn {
		background: linear-gradient(135deg, #6e8efb, #a777e3);
		color: white;
	}

	.login-btn:hover {
		background: linear-gradient(135deg, #5b7cf2, #9664d9);
		color: white;
		box-shadow: 0 4px 15px rgba(110, 142, 251, 0.3);
	}

	.logout-btn {
		color: #ff4b2b;
	}
	
	.logout-btn:hover {
		background: rgba(255, 75, 43, 0.1);
		color: #ff4b2b;
	}
</style>
