<script lang="ts">
	import { api, ProxyError } from '$lib/api/index.svelte';
	import { openOverlay } from '$lib/navigation';
	import {
		settings,
		getEnabledProxies,
		getPrimaryProxyUrl,
		applyDefaultProxySettings,
		enableCloudflareProxy,
		addCustomProxy,
		DEFAULT_VALTOWN_PROXY_URL
	} from '$lib/storage/settings.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	let { backButton }: { backButton?: Snippet } = $props();

	let loginMethod: 'email' | 'token' = $state('email');

	// Email fields
	let email = $state('');
	let password = $state('');
	let showAdvanced = $state(false);

	// Token fields
	let token = $state('');

	// Proxy choices
	let proxyChoice = $state<'default' | 'custom'>('default');
	let customUrl = $state(getPrimaryProxyUrl() || '');
	let customUrlError = $state('');

	let error = $state('');
	let successMsg = $state('');
	let isLoading = $state(false);
	let isProxyFailure = $state(false);

	let proxies = $derived(settings.value.proxies || []);
	let enabledList = $derived(proxies.filter((p) => p.enabled && Boolean(p.url?.trim())));
	let enabledCount = $derived(enabledList.length);
	let cloudflareProxy = $derived(proxies.find((p) => p.id === 'cloudflare'));
	let canQuickEnableCloudflare = $derived(
		Boolean(cloudflareProxy?.url && !cloudflareProxy?.enabled)
	);

	function openNetworkSettings() {
		openOverlay({ type: 'settings', data: { page: 'network' } });
	}

	function handleApplyChoice(): boolean {
		customUrlError = '';
		if (DEFAULT_VALTOWN_PROXY_URL && proxyChoice === 'default') {
			applyDefaultProxySettings();
			successMsg = 'Стандартные настройки прокси применены';
			return true;
		}
		const trimmed = customUrl.trim();
		if (!trimmed) {
			customUrlError = 'Укажите URL прокси';
			return false;
		}
		try {
			addCustomProxy(trimmed, undefined, true);
			successMsg = 'Свой прокси успешно сохранён';
			return true;
		} catch (err: unknown) {
			customUrlError = err instanceof Error ? err.message : 'Некорректный адрес URL';
			return false;
		}
	}

	function handleQuickEnableCloudflare() {
		enableCloudflareProxy();
		isProxyFailure = false;
		error = '';
		successMsg = 'Резервный Cloudflare прокси включён. Повторите попытку входа.';
	}

	async function handleEmailSubmit(event: Event) {
		event.preventDefault();
		if (getEnabledProxies().length === 0) {
			if (!handleApplyChoice()) {
				error = 'Настройте и включите прокси перед авторизацией.';
				showAdvanced = true;
				return;
			}
		}

		isLoading = true;
		error = '';
		successMsg = '';
		isProxyFailure = false;

		try {
			if (!api.login) throw new Error('Вход по паролю в данный момент недоступен');
			await api.login(email, password);
			goto(resolve('/'));
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Произошла ошибка при авторизации';
			isProxyFailure = err instanceof ProxyError;
			if (isProxyFailure) {
				showAdvanced = true;
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleTokenSubmit(event: Event) {
		event.preventDefault();
		if (getEnabledProxies().length === 0) {
			if (!handleApplyChoice()) {
				error = 'Настройте и включите прокси: обновление токена заблокировано CORS.';
				showAdvanced = true;
				return;
			}
		}

		isLoading = true;
		error = '';
		successMsg = '';
		isProxyFailure = false;

		try {
			if (!api.loginByToken) throw new Error('Вход по токену в данный момент недоступен');
			await api.loginByToken(token.trim());
			goto(resolve('/'));
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Произошла ошибка проверки токена';
			isProxyFailure = err instanceof ProxyError;
			if (isProxyFailure) {
				showAdvanced = true;
			}
		} finally {
			isLoading = false;
		}
	}
</script>

{#snippet proxySection()}
	<div class="advanced-section">
		<button type="button" class="toggle-advanced" onclick={() => (showAdvanced = !showAdvanced)}>
			{showAdvanced ? '▲ Скрыть выбор прокси' : `⚙️ Настройки CORS-прокси (${enabledCount} акт.)`}
		</button>

		{#if showAdvanced}
			<div class="advanced-content">
				<p class="help-text">
					DTF блокирует запросы авторизации из браузера (CORS). Для входа и обновления сессии необходим CORS-прокси.
				</p>

				{#if Boolean(DEFAULT_VALTOWN_PROXY_URL)}
					<div class="proxy-choice-group">
						<label class={['proxy-choice-card', { 'proxy-choice-card--active': proxyChoice === 'default' }]}>
							<span class="custom-radio">
								<input
									type="radio"
									name="proxyChoice"
									value="default"
									checked={proxyChoice === 'default'}
									onchange={() => {
										proxyChoice = 'default';
										handleApplyChoice();
									}}
								/>
								<span class="custom-radio-dot"></span>
							</span>
							<div class="proxy-choice-card__body">
								<div class="proxy-choice-card__header">
									<span class="proxy-choice-card__title">Стандартные настройки</span>
									<span class="badge badge--green">Открытый</span>
								</div>
								<div class="proxy-choice-card__desc">
									Используется открытый публичный прокси. Исходный код доступен для проверки на
									<a
										href="https://www.val.town/x/donnertech/redtf-proxy"
										target="_blank"
										rel="noreferrer"
									>
										Val Town
									</a>.
								</div>
							</div>
						</label>

						<label class={['proxy-choice-card', { 'proxy-choice-card--active': proxyChoice === 'custom' }]}>
							<span class="custom-radio">
								<input
									type="radio"
									name="proxyChoice"
									value="custom"
									checked={proxyChoice === 'custom'}
									onchange={() => {
										proxyChoice = 'custom';
									}}
								/>
								<span class="custom-radio-dot"></span>
							</span>
							<div class="proxy-choice-card__body">
								<div class="proxy-choice-card__header">
									<span class="proxy-choice-card__title">Свой прокси</span>
									<span class="badge badge--gray">Свой</span>
								</div>
								<div class="proxy-choice-card__desc">
									Разверните собственный прокси по
									<a href="https://github.com/re-dtf/proxy" target="_blank" rel="noreferrer">
										инструкции re-dtf/proxy
									</a>.
								</div>
							</div>
						</label>
					</div>
				{/if}

				{#if !DEFAULT_VALTOWN_PROXY_URL || proxyChoice === 'custom'}
					<div class="custom-proxy-box">
						<label for="custom_url_input" class="custom-proxy-label">Адрес вашего прокси:</label>
						<div class="custom-proxy-row">
							<input
								id="custom_url_input"
								type="url"
								placeholder="https://my-proxy.workers.dev"
								bind:value={customUrl}
								class="custom-proxy-input"
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										handleApplyChoice();
									}
								}}
							/>
							<button type="button" class="mini-btn mini-btn--accent" onclick={handleApplyChoice}>
								Сохранить
							</button>
						</div>
						{#if customUrlError}
							<div class="custom-proxy-err">{customUrlError}</div>
						{/if}
						<div class="custom-proxy-hints">
							{#if !DEFAULT_VALTOWN_PROXY_URL}
								В этой сборке публичный прокси не настроен.{' '}
							{/if}
							Разверните собственный прокси по
							<a href="https://github.com/re-dtf/proxy" target="_blank" rel="noreferrer" class="inline-link">
								инструкции re-dtf/proxy
							</a>.
						</div>
					</div>
				{/if}

				<div class="settings-link-row">
					<button type="button" class="inline-link" onclick={openNetworkSettings}>
						Расширенные настройки сети и резервных прокси →
					</button>
				</div>
			</div>
		{/if}
	</div>
{/snippet}

<div class="login-container">
	{#if backButton}
		<div class="back-action">
			{@render backButton()}
		</div>
	{/if}
	<h1>Вход в аккаунт</h1>

	<div class="tabs">
		<button
			type="button"
			class={['tab', { active: loginMethod === 'email' }]}
			onclick={() => {
				loginMethod = 'email';
				error = '';
				successMsg = '';
			}}
		>
			Почта / Пароль
		</button>
		<button
			type="button"
			class={['tab', { active: loginMethod === 'token' }]}
			onclick={() => {
				loginMethod = 'token';
				error = '';
				successMsg = '';
			}}
		>
			По токену
		</button>
	</div>

	{#if successMsg}
		<div class="success-message">{successMsg}</div>
	{/if}

	{#if loginMethod === 'email'}
		<form onsubmit={handleEmailSubmit} class="login-form">
			<div class="form-group">
				<label for="email">Электронная почта</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					disabled={isLoading}
					placeholder="name@example.com"
					autocomplete="email"
				/>
			</div>

			<div class="form-group">
				<label for="password">Пароль</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					disabled={isLoading}
					placeholder="••••••••"
					autocomplete="current-password"
				/>
			</div>

			{@render proxySection()}

			{#if error}
				<div class="error-message">
					<div class="error-text">{error}</div>
					{#if isProxyFailure}
						<div class="error-actions">
							{#if canQuickEnableCloudflare}
								<button
									type="button"
									class="action-btn action-btn--quick"
									onclick={handleQuickEnableCloudflare}
								>
									Включить резервный Cloudflare
								</button>
							{/if}
							<button type="button" class="action-btn" onclick={openNetworkSettings}>
								Открыть настройки сети и прокси →
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<button type="submit" disabled={isLoading} class="submit-btn">
				{isLoading ? 'Вход...' : 'Войти'}
			</button>
		</form>
	{:else}
		<form onsubmit={handleTokenSubmit} class="login-form">
			<div class="help-text info-box">
				Подходит для аккаунтов без пароля (например, вход через соцсети). Пароль не нужен, но обновление
				токена идёт через тот же CORS-прокси, что и вход по паролю.<br /><br />
				1. Войдите на dtf.ru и откройте DevTools (F12) -> Application -> Cookies -> dtf.ru<br />
				2. Скопируйте значение куки <b>auth-refresh-remember</b> целиком (64 символа).
			</div>

			<div class="form-group">
				<label for="device_secret">Токен (auth-refresh-remember)</label>
				<input
					type="text"
					id="device_secret"
					name="auth-token-manual"
					autocomplete="new-password"
					bind:value={token}
					required
					disabled={isLoading}
					placeholder="e1af4e9c…"
				/>
			</div>

			{@render proxySection()}

			{#if error}
				<div class="error-message">
					<div class="error-text">{error}</div>
					{#if isProxyFailure}
						<div class="error-actions">
							{#if canQuickEnableCloudflare}
								<button
									type="button"
									class="action-btn action-btn--quick"
									onclick={handleQuickEnableCloudflare}
								>
									Включить резервный Cloudflare
								</button>
							{/if}
							<button type="button" class="action-btn" onclick={openNetworkSettings}>
								Открыть настройки сети и прокси →
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<button type="submit" disabled={isLoading} class="submit-btn">
				{isLoading ? 'Проверка...' : 'Войти по токену'}
			</button>
		</form>
	{/if}
</div>

<style>
	.login-container {
		max-width: 480px;
		margin: 40px auto;
		background: white;
		padding: 30px;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
		font-size: 15px;
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
		font-weight: 600;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label {
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}

	input[type='email'],
	input[type='password'],
	input[type='text'],
	input[type='url'] {
		padding: 10px 12px;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 14px;
		background: #fff;
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
		border-radius: 6px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
		margin-top: 4px;
	}

	.submit-btn:hover:not(:disabled) {
		background: #d02036;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.advanced-section {
		margin-top: 2px;
	}

	.toggle-advanced {
		background: none;
		border: none;
		color: #555;
		font-size: 13px;
		cursor: pointer;
		padding: 0;
		font-weight: 500;
	}

	.toggle-advanced:hover {
		color: #111;
		text-decoration: underline;
	}

	.advanced-content {
		margin-top: 12px;
		background: #f9f9fb;
		padding: 14px;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.help-text {
		font-size: 12px;
		color: #666;
		margin: 0;
		line-height: 1.45;
	}

	.info-box {
		background: #f0f7ff;
		padding: 12px;
		border-radius: 6px;
		border-left: 3px solid #0066cc;
	}

	.proxy-choice-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.proxy-choice-card {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 6px;
		background: #fff;
		border: 1px solid #e2e4e8;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.proxy-choice-card:hover {
		border-color: #b3ccee;
	}

	.proxy-choice-card--active {
		border-color: #3584e4;
		box-shadow: 0 0 0 1px #3584e4;
	}

	.custom-radio {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.3);
		background: #fff;
		margin-top: 2px;
		flex-shrink: 0;
		transition: border-color 0.15s ease;
	}

	.proxy-choice-card--active .custom-radio {
		border-color: #3584e4;
	}

	.custom-radio input[type='radio'] {
		position: absolute;
		opacity: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		cursor: pointer;
	}

	.custom-radio-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #3584e4;
		opacity: 0;
		transform: scale(0.4);
		transition: all 0.15s ease;
	}

	.proxy-choice-card--active .custom-radio-dot {
		opacity: 1;
		transform: scale(1);
	}

	.proxy-choice-card__body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
	}

	.proxy-choice-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
	}

	.proxy-choice-card__title {
		font-size: 13px;
		font-weight: 600;
		color: #222;
	}

	.badge {
		padding: 1px 6px;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 600;
	}

	.badge--green {
		background: #e8f5e9;
		color: #2e7d32;
	}

	.badge--gray {
		background: #eee;
		color: #666;
	}

	.proxy-choice-card__desc {
		font-size: 11px;
		line-height: 1.35;
		color: #666;
	}

	.proxy-choice-card__desc a {
		color: #3766a9;
		text-decoration: underline;
	}

	.custom-proxy-box {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		border-radius: 6px;
		background: #fff;
		border: 1px dashed #b3ccee;
	}

	.custom-proxy-hints {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 11px;
		color: #666;
	}

	.custom-proxy-label {
		font-size: 12px;
		font-weight: 500;
		color: #444;
	}

	.custom-proxy-row {
		display: flex;
		gap: 6px;
	}

	.custom-proxy-input {
		flex: 1;
		padding: 6px 10px !important;
		font-size: 12px !important;
	}

	.custom-proxy-err {
		font-size: 11px;
		color: #d32f2f;
	}

	.settings-link-row {
		text-align: center;
		margin-top: 4px;
	}

	.inline-link {
		background: none;
		border: none;
		color: #3766a9;
		font-size: 12px;
		cursor: pointer;
		padding: 2px;
	}

	.inline-link:hover {
		text-decoration: underline;
	}

	.mini-btn {
		background: #eee;
		border: none;
		border-radius: 4px;
		padding: 6px 12px;
		font-size: 12px;
		cursor: pointer;
		font-weight: 500;
	}

	.mini-btn:hover {
		background: #ddd;
	}

	.mini-btn--accent {
		background: #3584e4;
		color: #fff;
	}

	.mini-btn--accent:hover {
		background: #2868b2;
	}

	.error-message {
		color: #e52a42;
		background: #ffe6e9;
		padding: 10px 12px;
		border-radius: 6px;
		font-size: 13px;
		line-height: 1.4;
	}

	.error-text {
		word-break: break-word;
	}

	.error-actions {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px dashed rgba(229, 42, 66, 0.3);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.action-btn {
		background: #fff;
		border: 1px solid #e52a42;
		color: #e52a42;
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		text-align: center;
	}

	.action-btn:hover {
		background: #ffe6e9;
	}

	.action-btn--quick {
		background: #3584e4;
		border-color: #3584e4;
		color: #fff;
	}

	.action-btn--quick:hover {
		background: #2868b2;
	}

	.success-message {
		color: #2e7d32;
		background: #e8f5e9;
		padding: 10px 12px;
		border-radius: 6px;
		font-size: 13px;
		margin-bottom: 12px;
	}
</style>
