<script lang="ts">
	import { authStorage } from '$lib/storage/auth.svelte';
	import { resolve } from '$app/paths';

	function handleLogout(e: Event) {
		e.preventDefault();
		authStorage.logout();
		window.location.reload();
	}
</script>

<nav class="classic-navbar">
	<div class="container nav-content">
		<a href={resolve('/')} class="logo">reDTF <span class="badge">classic</span></a>
		<div class="links">
			<a href={resolve('/')}>Лента</a>
			<a href={resolve('/settings')}>Настройки</a>
			{#if authStorage.isAuthenticated}
				<a href={resolve('/')} onclick={handleLogout}>Выйти</a>
			{:else}
				<a href={resolve('/login')}>Войти</a>
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
</style>
