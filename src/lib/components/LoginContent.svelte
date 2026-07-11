<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	let { backButton } = $props<{ backButton?: Snippet }>();

	let loginMethod: 'email' | 'token' = $state('email');

	// Email fields
	let email = $state('');
	let password = $state('');
	let proxyUrl = $state(authStorage.proxyUrl || '');
	let showAdvanced = $state(false);

	// Token fields
	let token = $state('');

	let error = $state('');
	let isLoading = $state(false);

	$effect(() => {
		authStorage.proxyUrl = proxyUrl;
	});

	async function handleEmailSubmit(event: Event) {
		event.preventDefault();
		isLoading = true;
		error = '';

		try {
			if (!api.login) throw new Error('Вход по паролю в данный момент недоступен');
			await api.login(email, password);
			goto('/');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Произошла ошибка при авторизации';
			if (error.includes('Failed to fetch') || error.includes('CORS')) {
				error = 'Пожалуйста, укажите рабочий URL прокси сервера в настройках ниже, либо войдите по токену.';
				showAdvanced = true;
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleTokenSubmit(event: Event) {
		event.preventDefault();
		isLoading = true;
		error = '';

		try {
			if (!api.loginByToken) throw new Error('Вход по токену в данный момент недоступен');
			await api.loginByToken(token.trim());
			goto('/');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Произошла ошибка проверки токена';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="login-container">
	{#if backButton}
		<div class="back-action">
			{@render backButton()}
		</div>
	{/if}
	<h1>Вход в аккаунт</h1>

	<div class="tabs">
		<button class="tab" class:active={loginMethod === 'email'} onclick={() => { loginMethod = 'email'; error = ''; }}>
			По Email (Прокси)
		</button>
		<button class="tab" class:active={loginMethod === 'token'} onclick={() => { loginMethod = 'token'; error = ''; }}>
			По Токену (Прямой)
		</button>
	</div>
	
	{#if loginMethod === 'email'}
		<form onsubmit={handleEmailSubmit} class="login-form">
			<div class="form-group">
				<label for="email">Email</label>
				<input type="email" id="email" bind:value={email} required disabled={isLoading} />
			</div>
			
			<div class="form-group">
				<label for="password">Пароль</label>
				<input type="password" id="password" bind:value={password} required disabled={isLoading} />
			</div>

			<div class="advanced-section">
				<button type="button" class="toggle-advanced" onclick={() => showAdvanced = !showAdvanced}>
					{showAdvanced ? 'Скрыть настройки CORS-прокси' : '⚙️ Настройки CORS-прокси'}
				</button>
				
				{#if showAdvanced}
					<div class="advanced-content">
						<p class="help-text">В связи с CORS-блокировкой запросов входа от DTF, логин по паролю возможен только через прокси. Вы можете воспользоваться официальным прокси, или развернуть свой: https://github.com/re-dtf/proxy.</p>
						<div class="form-group">
							<label for="proxy">URL Прокси</label>
							<input type="url" id="proxy" bind:value={proxyUrl} placeholder="https://auth-proxy.example.workers.dev" required disabled={isLoading} />
							<div class="help-text" style="margin-top: 5px;">
								Вы можете использовать <button type="button" class="link-button" onclick={() => {
									if (confirm('Использовать прокси от автора проекта?')) {
										proxyUrl = import.meta.env.VITE_AUTH_PROXY_URL || 'https://dtf-proxy.re-dtf.workers.dev';
									}
								}}>прокси от автора проекта</button>
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<button type="submit" disabled={isLoading} class="submit-btn">
				{isLoading ? 'Вход...' : 'Войти'}
			</button>
		</form>
	{:else}
		<form onsubmit={handleTokenSubmit} class="login-form">
			<div class="help-text info-box">
				Вход по токену работает напрямую с API DTF без использования серверов-прокси (100% безопасно).<br/><br/>
				1. Зайдите на официальный сайт dtf.ru<br/>
				2. Откройте DevTools (F12) -> Application -> Local Storage<br/>
				3. Скопируйте значение ключа <b>osnova-aid</b> или <b>auth-refresh-token</b> целиком.<br/>
				<em>(Вы можете вставить как сырой токен, так и JSON из поля auth-refresh-token)</em>
			</div>

			<div class="form-group">
				<label for="device_secret">Токен (osnova-aid / auth-refresh-token)</label>
				<input type="text" id="device_secret" name="auth-token-manual" autocomplete="new-password" bind:value={token} required disabled={isLoading} placeholder={'Например: {"token":"...","expTimestamp":...}'} />
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<button type="submit" disabled={isLoading} class="submit-btn">
				{isLoading ? 'Проверка...' : 'Войти по токену'}
			</button>
		</form>
	{/if}
</div>

<style>
	.login-container {
		width: 100%;
		max-width: 450px;
		background: white;
		padding: 30px;
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0,0,0,0.15);
		max-height: 90vh;
		overflow-y: auto;
		box-sizing: border-box;
	}

	.back-action {
		margin-bottom: 20px;
	}

	h1 {
		margin-top: 0;
		margin-bottom: 20px;
		font-size: 24px;
		text-align: center;
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid #ddd;
		margin-bottom: 20px;
	}

	.tab {
		flex: 1;
		background: none;
		border: none;
		padding: 10px;
		font-size: 16px;
		cursor: pointer;
		color: #666;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}

	.tab:hover {
		background: #f9f9f9;
	}

	.tab.active {
		color: #e52a42;
		border-bottom-color: #e52a42;
		font-weight: 500;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	label {
		font-weight: 500;
		font-size: 14px;
		color: #333;
	}

	input {
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 16px;
	}

	input:focus {
		outline: none;
		border-color: #e52a42;
	}

	.submit-btn {
		background: #e52a42;
		color: white;
		border: none;
		padding: 12px;
		border-radius: 4px;
		font-size: 16px;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
		margin-top: 10px;
	}

	.submit-btn:hover:not(:disabled) {
		background: #d41f35;
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error-message {
		color: #e52a42;
		background: #ffe6e9;
		padding: 10px;
		border-radius: 4px;
		font-size: 14px;
	}

	.advanced-section {
		margin-top: 5px;
		border-top: 1px dashed #ddd;
		padding-top: 10px;
	}

	.toggle-advanced {
		background: none;
		border: none;
		color: #666;
		font-size: 13px;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.toggle-advanced:hover {
		color: #333;
	}

	.advanced-content {
		margin-top: 15px;
		background: #f9f9f9;
		padding: 15px;
		border-radius: 4px;
	}

	.help-text {
		font-size: 13px;
		color: #555;
		margin-top: 0;
		margin-bottom: 10px;
		line-height: 1.4;
	}

	.info-box {
		background: #f0f7ff;
		padding: 12px;
		border-radius: 4px;
		border-left: 3px solid #0066cc;
	}

	.link-button {
		background: none;
		border: none;
		padding: 0;
		color: #1976d2;
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
		display: inline;
	}

	.link-button:hover {
		color: #1565c0;
	}
</style>
