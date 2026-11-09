<script lang="ts">
	import { api, ProxyError } from '$lib/api/index.svelte';
	import { closeOverlay, openOverlay, pushSubstate, popSubstate, resetSubstates } from '$lib/navigation';
	import { isNative } from '$lib/capacitor';
	import {
		settings,
		getEnabledProxies,
		getPrimaryProxyUrl,
		applyDefaultProxySettings,
		enableCloudflareProxy,
		addCustomProxy,
		DEFAULT_VALTOWN_PROXY_URL
	} from '$lib/storage/settings.svelte';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';

	const COVER_IMAGE = 'https://leonardo.osnova.io/356f8b87-e803-86ab-2875-f11915f78a7e/-/format/webp/';

	type Mode = 'selector' | 'email' | 'token' | 'proxy';
	type ProxyStep = 'choice' | 'custom_input';

	let mode = $state<Mode>('selector');
	let pendingMode = $state<'email' | 'token' | null>(null);

	let email = $state('');
	let password = $state('');
	let token = $state('');

	let proxyStep = $state<ProxyStep>('choice');
	let proxyChoice = $state<'default' | 'custom'>('default');
	let customUrlInput = $state('');

	let isLoading = $state(false);
	let error = $state('');
	let successMsg = $state('');
	let isProxyFailure = $state(false);

	let proxies = $derived(settings.value.proxies || []);
	let enabledList = $derived(proxies.filter((p) => p.enabled && Boolean(p.url?.trim())));
	let enabledCount = $derived(enabledList.length);
	let cloudflareProxy = $derived(proxies.find((p) => p.id === 'cloudflare'));
	let canQuickEnableCloudflare = $derived(
		Boolean(cloudflareProxy?.url && !cloudflareProxy?.enabled)
	);

	function performGoBack() {
		if (mode === 'proxy' && proxyStep === 'custom_input' && DEFAULT_VALTOWN_PROXY_URL) {
			proxyStep = 'choice';
			error = '';
			return;
		}
		pendingMode = null;
		mode = 'selector';
		error = '';
		successMsg = '';
		isProxyFailure = false;
	}

	function goBack() {
		if (!popSubstate()) {
			performGoBack();
		}
	}

	function setMode(next: Mode) {
		const wasSelector = mode === 'selector';
		mode = next;
		error = '';
		successMsg = '';
		isProxyFailure = false;
		if (next === 'proxy') {
			if (DEFAULT_VALTOWN_PROXY_URL) {
				proxyStep = 'choice';
				const hasCustomActive = proxies.some((p) => !p.isPreset && p.enabled);
				proxyChoice = hasCustomActive ? 'custom' : 'default';
			} else {
				// Если в сборке нет открытого прокси — пропускаем выбор и сразу открываем ввод
				proxyStep = 'custom_input';
			}
			customUrlInput = getPrimaryProxyUrl() || '';
		}
		if (next !== 'selector' && wasSelector) {
			pushSubstate(performGoBack);
		}
	}

	function chooseMethod(method: 'email' | 'token') {
		if (!isNative() && getEnabledProxies().length === 0) {
			pendingMode = method;
			setMode('proxy');
		} else {
			pendingMode = null;
			setMode(method);
		}
	}

	function closeModal() {
		closeOverlay();
	}

	function openNetworkSettings() {
		closeModal();
		openOverlay({ type: 'settings', data: { page: 'network' } });
	}

	function handleApplyDefaultProxy() {
		applyDefaultProxySettings();
		const valtown = (settings.value.proxies || []).find((p) => p.id === 'valtown');
		if (!valtown?.url?.trim()) {
			error = 'URL открытого прокси не задан в сборке. Укажите свой прокси или перейдите в настройки сети.';
			return;
		}
		if (pendingMode) {
			const next = pendingMode;
			pendingMode = null;
			resetSubstates();
			setMode(next);
		} else {
			successMsg = 'Стандартные настройки прокси применены';
			resetSubstates();
			mode = 'selector';
		}
	}

	function handleSaveCustomProxy(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = customUrlInput.trim();
		if (!trimmed) {
			error = 'Укажите URL прокси';
			return;
		}
		try {
			addCustomProxy(trimmed, undefined, true);
			customUrlInput = '';
			if (pendingMode) {
				const next = pendingMode;
				pendingMode = null;
				resetSubstates();
				setMode(next);
			} else {
				successMsg = 'Свой прокси сохранён';
				resetSubstates();
				mode = 'selector';
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Некорректный адрес URL';
		}
	}

	function handleQuickEnableCloudflare() {
		enableCloudflareProxy();
		isProxyFailure = false;
		error = '';
		successMsg = 'Резервный Cloudflare прокси включён. Повторите попытку входа.';
	}

	async function handleEmailLogin(e: SubmitEvent) {
		e.preventDefault();
		if (!email || !password) return;
		isLoading = true;
		error = '';
		successMsg = '';
		isProxyFailure = false;
		try {
			await api.login(email, password);
			closeModal();
		} catch (err: any) {
			error = err?.message || 'Ошибка авторизации по почте';
			isProxyFailure = err instanceof ProxyError;
		} finally {
			isLoading = false;
		}
	}

	async function handleTokenLogin(e: SubmitEvent) {
		e.preventDefault();
		if (!token.trim()) return;
		isLoading = true;
		error = '';
		successMsg = '';
		isProxyFailure = false;
		try {
			await api.loginByToken(token.trim());
			closeModal();
		} catch (err: any) {
			error = err?.message || 'Неверный токен авторизации';
			isProxyFailure = err instanceof ProxyError;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
	<!-- обложка окна входа (котик) -->
	<div class="login-modal__cover" style:background-image="url('{COVER_IMAGE}')">
		<svg class="icon" width="100" height="16" aria-hidden="true">
			<use href="/reIcons.svg#redtf_black_logo"></use>
		</svg>
	</div>

	<div class="login-modal__content">
		<button
			class="login-modal__close"
			type="button"
			aria-label="Закрыть"
			onclick={closeModal}
		>
			<svg height="24" width="24" class="icon" aria-hidden="true">
				<use href="/icons.svg#v_close"></use>
			</svg>
		</button>

		<div class="auth">
			{#if mode !== 'selector'}
				<div class="auth__controls">
					<button class="auth__back" type="button" onclick={goBack}>
						<span class="auth__back-container">
							<svg height="20" width="20" class="icon" aria-hidden="true">
								<use href="/icons.svg#v_arrow_left"></use>
							</svg>
							<span>Назад</span>
						</span>
					</button>
				</div>
			{/if}

			<div class="auth__form">
				<div class="auth__title" id="login-modal-title">
					{#if mode === 'proxy'}
						{proxyStep === 'custom_input' ? (DEFAULT_VALTOWN_PROXY_URL ? 'Свой CORS-прокси' : 'Настройка прокси') : 'Настройки прокси'}
					{:else}
						Вход в аккаунт
					{/if}
				</div>

				{#if error}
					<div class="auth__message auth__message--error" role="alert">
						<div class="auth__error-text">{error}</div>
						{#if isProxyFailure}
							<div class="auth__error-help">
								<div class="auth__error-btns">
									{#if canQuickEnableCloudflare}
										<button
											type="button"
											class="auth__action-btn auth__action-btn--quick"
											onclick={handleQuickEnableCloudflare}
										>
											Включить резервный Cloudflare
										</button>
									{/if}
									<button
										type="button"
										class="auth__action-btn"
										onclick={openNetworkSettings}
									>
										Открыть настройки и включить резервный →
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				{#if successMsg}
					<div class="auth__message auth__message--success" role="status">{successMsg}</div>
				{/if}

				{#if mode === 'selector'}
					<div class="auth__methods">
						<Button icon="v_email" label="Почта" onclick={() => chooseMethod('email')} />
						<Button icon="v_lock_full" label="Токен" onclick={() => chooseMethod('token')} />
						{#if !isNative()}
							<Button
								icon="v_gear"
								label="Настройки прокси"
								onclick={() => {
									pendingMode = null;
									setMode('proxy');
								}}
							/>
						{/if}
					</div>
				{:else if mode === 'email'}
					<form onsubmit={handleEmailLogin} method="post">
						<Input
							type="email"
							id="email"
							placeholder="Почта"
							name="email"
							autocomplete="username"
							spellcheck="false"
							autocapitalize="none"
							autocorrect="off"
							bind:value={email}
							required
							disabled={isLoading}
						/>
						<Input
							type="password"
							id="password"
							placeholder="Пароль"
							name="password"
							autocomplete="current-password"
							bind:value={password}
							required
							disabled={isLoading}
						/>

						<Button
							type="submit"
							variant="blue"
							fullWidth
							disabled={isLoading || (!isNative() && enabledCount === 0)}
							label={isLoading ? 'Загрузка...' : 'Войти'}
						/>
					</form>
				{:else if mode === 'token'}
					<form onsubmit={handleTokenLogin}>
						<p class="auth__hint">
							Для аккаунтов без пароля. Откройте dtf.ru, затем DevTools (F12) → Application → Cookies и
							скопируйте значение <b>auth-refresh-remember</b> целиком. Обновление токена идёт через прокси.
						</p>
						<Input
							type="text"
							placeholder="Токен (auth-refresh-remember)"
							name="auth-token-manual"
							autocomplete="off"
							spellcheck="false"
							bind:value={token}
							required
							disabled={isLoading}
						/>

						<Button
							type="submit"
							variant="blue"
							fullWidth
							disabled={isLoading || (!isNative() && enabledCount === 0)}
							label={isLoading ? 'Загрузка...' : 'Войти'}
						/>
					</form>
				{:else if mode === 'proxy'}
					{#if proxyStep === 'choice'}
						<div class="auth__proxy-flow">
							<p class="auth__hint">
								DTF блокирует запросы авторизации из браузера (CORS). Прокси используется только для входа по паролю и обновления сессии.
							</p>

							<div class="proxy-minimal-options">
								<label class={['p-opt', { 'p-opt--active': proxyChoice === 'default' }]}>
									<span class="p-opt__radio">
										<input
											type="radio"
											name="proxyChoice"
											value="default"
											checked={proxyChoice === 'default'}
											onchange={() => (proxyChoice = 'default')}
										/>
										<span class="p-opt__radio-dot"></span>
									</span>
									<div class="p-opt__body">
										<div class="p-opt__row">
											<span class="p-opt__label">Стандартные настройки</span>
											<a
												href="https://www.val.town/x/donnertech/redtf-proxy"
												target="_blank"
												rel="noreferrer"
												class="p-opt__link"
												onclick={(e) => e.stopPropagation()}
											>
												код на Val Town
											</a>
										</div>
										<span class="p-opt__hint">Открытый публичный прокси</span>
									</div>
								</label>

								<label class={['p-opt', { 'p-opt--active': proxyChoice === 'custom' }]}>
									<span class="p-opt__radio">
										<input
											type="radio"
											name="proxyChoice"
											value="custom"
											checked={proxyChoice === 'custom'}
											onchange={() => (proxyChoice = 'custom')}
										/>
										<span class="p-opt__radio-dot"></span>
									</span>
									<div class="p-opt__body">
										<div class="p-opt__row">
											<span class="p-opt__label">Свой прокси</span>
											<a
												href="https://github.com/re-dtf/proxy"
												target="_blank"
												rel="noreferrer"
												class="p-opt__link"
												onclick={(e) => e.stopPropagation()}
											>
												инструкция
											</a>
										</div>
										<span class="p-opt__hint">Собственный сервер по инструкции</span>
									</div>
								</label>
							</div>

							<div class="auth__proxy-actions">
								{#if proxyChoice === 'default'}
									<Button
										type="button"
										variant="blue"
										fullWidth
										label={pendingMode ? 'Продолжить' : 'Сохранить'}
										onclick={handleApplyDefaultProxy}
									/>
								{:else}
									<Button
										type="button"
										variant="blue"
										fullWidth
										label="Далее →"
										onclick={() => {
											proxyStep = 'custom_input';
											error = '';
											pushSubstate(performGoBack);
										}}
									/>
								{/if}
							</div>

							<div class="auth__network-link-box">
								<button type="button" class="auth__network-link" onclick={openNetworkSettings}>
									Расширенные настройки сети →
								</button>
							</div>
						</div>
					{:else if proxyStep === 'custom_input'}
						<form onsubmit={handleSaveCustomProxy} class="auth__proxy-custom-form">
							{#if Boolean(DEFAULT_VALTOWN_PROXY_URL)}
								<p class="auth__hint">
									Укажите адрес вашего CORS-прокси (например, на Val Town или Cloudflare Workers). Свой можно развернуть по инструкции <a href="https://github.com/re-dtf/proxy" target="_blank" rel="noreferrer">re-dtf/proxy</a>:
								</p>
							{:else}
								<p class="auth__hint">
									DTF блокирует запросы авторизации из браузера (CORS). В этой сборке публичный прокси не настроен, поэтому для входа требуется указать собственный сервер. Свой можно развернуть по инструкции <a href="https://github.com/re-dtf/proxy" target="_blank" rel="noreferrer">re-dtf/proxy</a>:
								</p>
							{/if}
							<Input
								type="url"
								placeholder="https://my-proxy.workers.dev"
								name="custom-proxy-url"
								bind:value={customUrlInput}
								required
								disabled={isLoading}
							/>
							<div class="auth__proxy-actions">
								<Button
									type="submit"
									variant="blue"
									fullWidth
									disabled={isLoading || !customUrlInput.trim()}
									label={pendingMode ? 'Продолжить' : 'Сохранить'}
								/>
							</div>
							{#if Boolean(DEFAULT_VALTOWN_PROXY_URL)}
								<div class="auth__network-link-box">
									<button
										type="button"
										class="auth__network-link"
										onclick={() => {
											proxyStep = 'choice';
											error = '';
										}}
									>
										← Вернуться к выбору
									</button>
								</div>
							{:else}
								<div class="auth__network-link-box">
									<button type="button" class="auth__network-link" onclick={openNetworkSettings}>
										Расширенные настройки сети →
									</button>
								</div>
							{/if}
						</form>
					{/if}
				{/if}

				<div class="auth__footer">
					<a target="_blank" rel="noreferrer" href="https://dtf.ru/?modal=auth/signup/email">Регистрация</a>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.login-modal {
		display: grid;
		grid-template-columns: 212px 1fr;
		width: 100%;
		max-width: 640px;
		margin: auto;
	}

	/* Обложка статичная со светлым фоном — логотип не менять, он всегда чёрный даже в тёмной теме */
	.login-modal__cover {
		padding: 25px 30px;
		border-radius: 8px 0 0 8px;
		background-color: var(--bg-ac-modal);
		background-repeat: no-repeat;
		background-position: 50% 50%;
		background-size: cover;
		color: #000;
	}

	.login-modal__cover .icon {
		/* Не менять: логотип на обложке всегда чёрный независимо от темы */
		color: #000;
		fill: #000;
	}

	.login-modal__content {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 30px;
		border-radius: 0 8px 8px 0;
		background-color: var(--bg-modal);
	}

	.login-modal__close {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 10;
		padding: 16px;
		color: var(--text-primary);
		opacity: 0.5;
		cursor: pointer;
		background: none;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity var(--duration-base);
	}

	.login-modal__close:hover {
		opacity: 1;
	}

	.auth {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 600px;
		margin: -30px;
		padding: 24px 50px;
	}

	.auth__controls {
		position: absolute;
		top: 0;
		left: 0;
		right: 56px;
		z-index: 9;
		display: flex;
		border-radius: 0 8px 0 0;
		background: var(--bg-modal);
	}

	.auth__back {
		display: inline-flex;
		align-items: center;
		margin: 18px 20px;
		color: var(--text-primary);
		font-size: 16px;
		line-height: 1.3em;
		opacity: 0.5;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		transition: opacity var(--duration-base);
	}

	.auth__back:hover {
		opacity: 1;
	}

	.auth__back-container {
		display: flex;
		align-items: center;
	}

	.auth__back-container .icon {
		margin-right: 10px;
	}

	.auth__form {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	.auth__title {
		margin-top: 114px;
		margin-bottom: 16px;
		font-size: 24px;
		line-height: 36px;
		font-weight: 500;
	}

	.auth__methods {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 16px 12px;
	}

	.auth__hint {
		margin: 0 0 12px;
		font-size: 13px;
		line-height: 1.4;
		color: var(--text-secondary);
	}

	.auth__hint a {
		color: var(--text-link);
		text-decoration: underline;
	}

	.auth__hint a:hover {
		opacity: 0.8;
	}

	.auth__proxy-flow {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.proxy-minimal-options {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.p-opt {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		border-radius: 8px;
		cursor: pointer;
		border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
		background: var(--bg-secondary, #fbfbfb);
		transition: all 0.12s ease;
	}

	.p-opt:hover {
		background: var(--bg-card-hover, #fff);
		border-color: var(--border-focus, #c4d7ed);
	}

	.p-opt--active {
		background: var(--bg-nav-tab-active, #f4f8fe);
		border-color: var(--color-blue, #3584e4);
	}

	.p-opt__radio {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid var(--border-checkbox, rgba(0, 0, 0, 0.28));
		background: var(--bg-card, #fff);
		flex-shrink: 0;
		transition: border-color 0.15s ease;
	}

	.p-opt--active .p-opt__radio {
		border-color: var(--color-blue, #3584e4);
	}

	.p-opt__radio input[type='radio'] {
		position: absolute;
		opacity: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		cursor: pointer;
	}

	.p-opt__radio-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #3584e4;
		opacity: 0;
		transform: scale(0.4);
		transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.p-opt--active .p-opt__radio-dot {
		opacity: 1;
		transform: scale(1);
	}

	.p-opt__body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.p-opt__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.p-opt__label {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.p-opt__link {
		font-size: 12px;
		color: var(--text-link);
		text-decoration: underline;
	}

	.p-opt__link:hover {
		opacity: 0.8;
	}

	.p-opt__hint {
		font-size: 12px;
		color: var(--text-secondary, #777);
	}

	.auth__proxy-custom-form {
		display: flex;
		flex-direction: column;
	}

	.auth__proxy-custom-form :global(.field) {
		margin-bottom: 8px;
	}

	.auth__proxy-actions {
		margin-top: 0;
	}

	.auth__network-link-box {
		text-align: center;
		margin-top: 6px;
	}

	.auth__network-link {
		background: none;
		border: none;
		color: var(--text-link);
		font-size: 13px;
		cursor: pointer;
		padding: 4px;
	}

	.auth__network-link:hover {
		text-decoration: underline;
	}

	.auth__footer {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 20px;
	}

	.auth__footer a {
		color: var(--text-link);
		font-size: 16px;
		font-weight: 400;
	}

	.auth__message {
		margin-bottom: 14px;
		padding: 10px 14px;
		border-radius: 6px;
		font-size: 13px;
		line-height: 1.4;
	}

	.auth__message--error {
		color: var(--color-danger-text);
		background: var(--color-danger-bg);
	}

	.auth__message--success {
		color: var(--color-success-text);
		background: var(--color-success-bg);
	}

	.auth__error-text {
		word-break: break-word;
	}

	.auth__error-help {
		margin-top: 10px;
		padding-top: 8px;
		border-top: 1px dashed rgba(229, 42, 66, 0.3);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.auth__error-btns {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.auth__action-btn {
		background: var(--bg-button, #fff);
		border: 1px solid var(--color-danger, #e52a42);
		color: var(--color-danger, #e52a42);
		border-radius: 6px;
		padding: 7px 12px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		text-align: center;
		transition: all 0.15s ease;
	}

	.auth__action-btn:hover {
		background: var(--color-danger-bg, #ffe6e9);
	}

	.auth__action-btn--quick {
		background: var(--color-blue, #3584e4);
		border-color: var(--color-blue, #3584e4);
		color: var(--text-submit-button, #fff);
	}

	.auth__action-btn--quick:hover {
		background: var(--bg-submit-button--hover, #2868b2);
	}

	/* Мобильный экран: на весь экран по аналогии с настройками */
	@media (max-width: 719px) {
		.login-modal {
			position: fixed;
			inset: 0;
			width: auto;
			height: auto;
			max-width: none;
			margin: 0;
			border-radius: 0;
			box-shadow: none;
			grid-template-columns: 1fr;
			display: flex;
			flex-direction: column;
			background: var(--bg-modal, #fff);
			padding-top: env(safe-area-inset-top, 0px);
			padding-bottom: env(safe-area-inset-bottom, 0px);
			padding-left: env(safe-area-inset-left, 0px);
			padding-right: env(safe-area-inset-right, 0px);
			overflow: hidden;
			z-index: 100;
		}

		.login-modal__cover {
			display: none;
		}

		.login-modal__content {
			flex: 1;
			min-height: 0;
			display: flex;
			flex-direction: column;
			padding: 0;
			border-radius: 0;
			position: relative;
			overflow: hidden;
			background: transparent;
		}

		.login-modal__close {
			top: env(safe-area-inset-top, 0px);
			right: 0;
			padding: 12px 16px;
			opacity: 0.8;
			z-index: 20;
		}

		.auth__controls {
			top: env(safe-area-inset-top, 0px);
			left: 0;
			right: 56px;
			height: 48px;
			align-items: center;
			background: transparent;
			z-index: 15;
		}

		.auth__back {
			margin: 0;
			padding: 12px 16px;
			font-size: 15px;
			opacity: 0.8;
		}

		.auth__back-container .icon {
			margin-right: 6px;
		}

		.auth {
			flex: 1;
			min-height: 0;
			margin: 0;
			padding: 48px 20px calc(24px + env(safe-area-inset-bottom, 0px));
			overflow-y: auto;
			overscroll-behavior: contain;
			-webkit-overflow-scrolling: touch;
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
			max-width: 480px;
			width: 100%;
			margin-left: auto;
			margin-right: auto;
			box-sizing: border-box;
		}

		.auth__form {
			flex-grow: 0;
			display: flex;
			flex-direction: column;
			margin: auto 0;
		}

		.auth__title {
			margin-top: 0;
			margin-bottom: 20px;
			font-size: 24px;
			line-height: 32px;
			font-weight: 500;
		}

		.auth__methods {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.auth__footer {
			margin-top: 24px;
			margin-bottom: 8px;
		}
	}
</style>
