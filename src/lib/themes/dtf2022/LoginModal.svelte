<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { closeOverlay } from '$lib/navigation';
	import { settings, DEFAULT_PROXY_URL } from '$lib/storage/settings.svelte';
	import { clickOnKey } from './a11y';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';

	type Mode = 'selector' | 'email' | 'token' | 'proxy';
	let mode = $state<Mode>('selector');
	let pendingMode = $state<'email' | 'token' | null>(null);

	let email = $state('');
	let password = $state('');
	let token = $state('');
	let proxyUrl = $state(settings.value.proxyUrl);

	let isLoading = $state(false);
	let error = $state('');
	let successMsg = $state('');

	function setMode(next: Mode) {
		mode = next;
		error = '';
		successMsg = '';
	}

	function chooseMethod(method: 'email' | 'token') {
		if (!settings.value.proxyUrl?.trim()) {
			pendingMode = method;
			setMode('proxy');
		} else {
			pendingMode = null;
			setMode(method);
		}
	}

	function goBack() {
		pendingMode = null;
		setMode('selector');
	}

	function closeModal() {
		closeOverlay();
	}

	async function handleEmailLogin(e: SubmitEvent) {
		e.preventDefault();
		if (!email || !password) return;
		isLoading = true;
		error = '';
		successMsg = '';
		try {
			await api.login(email, password);
			closeModal();
		} catch (err: any) {
			error = err?.message || 'Ошибка авторизации по почте';
			if (error.includes('Failed to fetch') || error.includes('CORS')) {
				error = 'Запрос заблокирован CORS. Настройте прокси-сервер в разделе «Настройки прокси».';
			}
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
		try {
			await api.loginByToken(token.trim());
			closeModal();
		} catch (err: any) {
			error = err?.message || 'Неверный токен авторизации';
		} finally {
			isLoading = false;
		}
	}

	function handleSaveProxy(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = proxyUrl.trim();
		if (!trimmed) {
			error = 'Укажите URL прокси';
			return;
		}
		settings.patch({ proxyUrl: trimmed });
		if (pendingMode) {
			const next = pendingMode;
			pendingMode = null;
			setMode(next);
		} else {
			successMsg = 'Настройки прокси сохранены';
			error = '';
		}
	}

	function useDefaultProxy() {
		proxyUrl = DEFAULT_PROXY_URL;
		error = '';
	}
</script>

<div class="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
	<!-- обложка окна входа (котик) -->
	<div class="login-modal__cover">
		<svg class="icon" width="100" height="16" aria-hidden="true">
			<use href="/reIcons.svg#redtf_black_logo"></use>
		</svg>
	</div>

	<div class="login-modal__content">
		<div class="login-modal__close" aria-label="Закрыть" role="button" tabindex="0" onclick={closeModal} onkeydown={clickOnKey}>
			<svg height="24" width="24" class="icon" aria-hidden="true">
				<use href="/icons.svg#v_close"></use>
			</svg>
		</div>

		<div class="auth">
			{#if mode !== 'selector'}
				<div class="auth__controls">
					<button class="auth__back" onclick={goBack}>
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
					{mode === 'proxy' ? 'Настройки прокси' : 'Вход в аккаунт'}
				</div>

				{#if error}
					<div class="auth__message auth__message--error" role="alert">{error}</div>
				{/if}
				{#if successMsg}
					<div class="auth__message auth__message--success" role="status">{successMsg}</div>
				{/if}

				{#if mode === 'selector'}
					<div class="auth__methods">
						<Button icon="v_email" label="Почта" onclick={() => chooseMethod('email')} />
						<Button icon="v_lock_full" label="Токен" onclick={() => chooseMethod('token')} />
						<Button icon="v_gear" label="Настройки прокси" onclick={() => { pendingMode = null; setMode('proxy'); }} />
					</div>
				{:else if mode === 'email'}
					<form onsubmit={handleEmailLogin}>
						<Input type="email" placeholder="Почта" name="email" autocomplete="email" bind:value={email} required disabled={isLoading} />
						<Input type="password" placeholder="Пароль" name="password" autocomplete="current-password" bind:value={password} required disabled={isLoading} />
						<Button type="submit" variant="blue" fullWidth disabled={isLoading} label={isLoading ? 'Загрузка...' : 'Войти'} />
					</form>
				{:else if mode === 'token'}
					<form onsubmit={handleTokenLogin}>
						<p class="auth__hint">
							Для аккаунтов без пароля. Откройте dtf.ru, затем DevTools (F12) → Application → Cookies и скопируйте значение
							<b>auth-refresh-remember</b> целиком. Обновление токена идёт через прокси, как и вход по почте.
						</p>
						<Input type="text" placeholder="Токен (auth-refresh-remember)" name="auth-token-manual" autocomplete="off" bind:value={token} required disabled={isLoading} />
						<Button type="submit" variant="blue" fullWidth disabled={isLoading} label={isLoading ? 'Загрузка...' : 'Войти'} />
					</form>
				{:else if mode === 'proxy'}
					<form onsubmit={handleSaveProxy}>
						<p class="auth__hint">
							DTF блокирует запросы авторизации из браузера (CORS). Прокси необходим для входа и обновления сессии. Вы можете использовать встроенный прокси или развернуть собственный по инструкции в <a target="_blank" rel="noreferrer" href="https://github.com/re-dtf/proxy">re-dtf/proxy</a>.
						</p>
						<Input type="url" placeholder="Ссылка на прокси" name="proxy-url" bind:value={proxyUrl} required />
						<div class="auth__default-proxy">
							{#if DEFAULT_PROXY_URL}
								<a
									href="#default-proxy"
									class="auth__default-proxy-link"
									onclick={(e) => {
										e.preventDefault();
										useDefaultProxy();
									}}
								>
									Использовать встроенный
								</a>
							{:else}
								<span
									class="auth__default-proxy-link auth__default-proxy-link--disabled"
									title="Встроенный прокси недоступен в этой сборке, используйте свой"
								>
									Встроенный прокси недоступен
								</span>
							{/if}
						</div>
						<Button
							type="submit"
							variant="blue"
							fullWidth
							label={pendingMode ? 'Продолжить' : 'Сохранить'}
						/>
					</form>
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

	.login-modal__cover {
		padding: 25px 30px;
		border-radius: 8px 0 0 8px;
		background: var(--bg-ac-modal) url('https://leonardo.osnova.io/356f8b87-e803-86ab-2875-f11915f78a7e/-/format/webp/') no-repeat 50% 50% / cover;
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
		z-index: 1;
		padding: 16px;
		color: var(--text-primary);
		opacity: 0.5;
		cursor: pointer;
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
		right: 0;
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
	}

	.auth__back-container {
		display: flex;
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
		margin: 0 0 16px;
		font-size: 14px;
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

	.auth__default-proxy {
		margin-top: -6px;
		margin-bottom: 16px;
	}

	.auth__default-proxy-link {
		color: var(--text-link);
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
	}

	.auth__default-proxy-link:hover:not(.auth__default-proxy-link--disabled) {
		opacity: 0.8;
	}

	.auth__default-proxy-link--disabled {
		color: var(--text-disabled);
		font-size: 15px;
		font-weight: 400;
		cursor: not-allowed;
		user-select: none;
	}

	.auth__footer {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 16px;
	}

	.auth__footer a {
		color: var(--text-link);
		font-size: 16px;
		font-weight: 400;
	}

	/* Сообщения формы — в исходной вёрстке их нет */
	.auth__message {
		margin-bottom: 16px;
		padding: 10px 14px;
		border-radius: 6px;
		font-size: 14px;
	}

	.auth__message--error {
		color: var(--color-danger-text);
		background: var(--color-danger-bg);
	}

	.auth__message--success {
		color: var(--color-success-text);
		background: var(--color-success-bg);
	}

	/* Мобильная версия — в исходной вёрстке её нет */
	@media (max-width: 640px) {
		.login-modal {
			grid-template-columns: 1fr;
		}

		.login-modal__cover {
			display: none;
		}

		.login-modal__content {
			border-radius: 8px;
		}

		.auth__controls {
			border-radius: 8px 8px 0 0;
		}
	}
</style>
