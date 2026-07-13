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

	function openEditor(e: MouseEvent) {
		e.preventDefault();
		const overlays = page.state.overlays || [];
		pushState(resolve('/write'), { 
			overlays: [...overlays, { id: `editor-${Date.now()}`, type: 'editor', presentation: 'modal' }] 
		});
	}

	function openFeed(e: MouseEvent) {
		if (page.state.overlays && page.state.overlays.length > 0) {
			// Находимся в оверлее (лента жива на фоне) - закрываем все оверлеи
			e.preventDefault();
			pushState(resolve('/'), { overlays: [] });
			return;
		}

		if (page.url.pathname === resolve('/')) {
			// Уже на ленте - просто скроллим наверх
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: 'smooth' });
			window.dispatchEvent(new CustomEvent('refreshFeed'));
			return;
		}
		
		// Иначе (например, прямая ссылка на /post/1) - происходит обычный переход
	}
</script>

<nav class="classic-navbar">
	<div class="container nav-content">
		<a href={resolve('/')} class="logo" onclick={openFeed}>reDTF <span class="badge">classic</span></a>
		<div class="links">
			<a href={resolve('/')} onclick={openFeed}>Лента</a>
			<a href={resolve('/write')} onclick={openEditor} class="write-btn">Написать</a>
			<a href={resolve('/settings')} onclick={openSettings}>Настройки</a>
			{#if authStorage.isAuthenticated}
				<a href={resolve('/')} onclick={handleLogout}>Выйти</a>
			{:else}
				<a href={resolve('/login')} onclick={openLogin}>Войти</a>
			{/if}
		</div>
	</div>
</nav>

<style>
	.classic-navbar {
		background: #ffffff;
		border-bottom: 2px solid #eaeaea;
		position: sticky;
		top: 0;
		z-index: 100;
		font-family: Arial, sans-serif;
	}

	.nav-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 60px;
		max-width: 800px;
		margin: 0 auto;
		padding: 0 20px;
	}

	.logo {
		font-size: 24px;
		font-weight: bold;
		color: #e52a42;
		text-decoration: none;
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.badge {
		font-size: 12px;
		background: #eee;
		color: #666;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.links {
		display: flex;
		gap: 20px;
	}

	.links a {
		text-decoration: none;
		color: #444;
		font-weight: 500;
	}

	.links a:hover {
		color: #e52a42;
		text-decoration: underline;
	}

	.write-btn {
		font-weight: bold !important;
		color: #e52a42 !important;
	}
</style>
