<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { authStorage } from '$lib/storage/auth.svelte';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';

	type Mode = 'selector' | 'email' | 'token' | 'proxy';
	let mode = $state<Mode>('selector');

	// Email form state
	let email = $state('');
	let password = $state('');

	// Token form state
	let token = $state('');

	// Proxy form state
	let proxyUrl = $state(authStorage.proxyUrl || '');

	let isLoading = $state(false);
	let error = $state('');
	let successMsg = $state('');

	function closeModal() {
		history.back();
	}

	function goBackToSelector() {
		mode = 'selector';
		error = '';
		successMsg = '';
	}

	async function handleEmailLogin(e: SubmitEvent) {
		e.preventDefault();
		if (!email || !password) return;
		isLoading = true;
		error = '';
		successMsg = '';
		try {
			if (!api.login) throw new Error('Вход по паролю временно недоступен');
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
			if (!api.loginByToken) throw new Error('Вход по токену временно недоступен');
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
		authStorage.proxyUrl = proxyUrl.trim();
		successMsg = 'Настройки прокси сохранены';
		error = '';
	}

	function useDefaultProxy() {
		const defaultProxy = import.meta.env.VITE_AUTH_PROXY_URL || 'https://dtf-proxy.re-dtf.workers.dev';
		proxyUrl = defaultProxy;
		authStorage.proxyUrl = defaultProxy;
		successMsg = 'Установлен встроенный прокси';
		error = '';
	}
</script>

<div class="modal-window login-modal">
	<!-- обложка окна входа (котик) -->
	<div class="login-modal__cover">
		<svg class="icon icon--site_logo" width="100" height="16">
			<use href="/reIcons.svg#redtf_black_logo"></use>
		</svg>
	</div>

	<div class="login-modal__content">
		<!-- закрыть окно -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-window__close" onclick={closeModal} role="button" tabindex="0">
			<svg height="24" width="24" class="icon icon--close">
				<use href="/icons.svg#v_close"></use>
			</svg>
		</div>

		<div class="auth">
			{#if mode !== 'selector'}
				<div class="auth-form__controls">
					<button class="auth__back" onclick={goBackToSelector}>
						<div class="auth__back-container">
							<svg height="20" width="20" class="icon">
								<use href="/icons.svg#v_arrow_left"></use>
							</svg>
							<div><span>Назад</span></div>
						</div>
					</button>
				</div>
			{/if}

			<div class="auth-form">
				<!-- заголовок -->
				<div class="auth-form__title">
					{mode === 'proxy' ? 'Настройки прокси' : 'Вход в аккаунт'}
				</div>

				{#if error}
					<div class="auth-error">{error}</div>
				{/if}
				{#if successMsg}
					<div class="auth-success">{successMsg}</div>
				{/if}

				{#if mode === 'selector'}
					<div class="auth-form__content auth-form__content--selector">
						<div class="auth-content">
							<Button class="auth-button" icon="v_email" label="Почта" onclick={() => { mode = 'email'; error = ''; successMsg = ''; }} />
							<Button class="auth-button" icon="v_lock_full" label="Токен" onclick={() => { mode = 'token'; error = ''; successMsg = ''; }} />
							<Button class="auth-button" icon="v_gear" label="Настройки прокси" onclick={() => { mode = 'proxy'; error = ''; successMsg = ''; }} />
						</div>
					</div>
				{:else if mode === 'email'}
					<form class="auth-form__content auth-form__content--email" onsubmit={handleEmailLogin}>
						<Input type="email" placeholder="Почта" minlength="0" pattern="." name="email" bind:value={email} required disabled={isLoading} />
						<Input type="password" placeholder="Пароль" minlength="0" pattern="." name="password" bind:value={password} required disabled={isLoading} />
						<Button type="submit" variant="blue" fullWidth disabled={isLoading} label={isLoading ? 'Загрузка...' : 'Войти'} data-layout-mobile="icon,label" data-layout-desktop="icon,label" />
					</form>
				{:else if mode === 'token'}
					<form class="auth-form__content auth-form__content--token" onsubmit={handleTokenLogin}>
						<Input type="text" id="device_secret" autocomplete="new-password" placeholder="Токен" minlength="0" pattern="." name="auth-token-manual" bind:value={token} required disabled={isLoading} />
						<Button type="submit" variant="blue" fullWidth disabled={isLoading} label={isLoading ? 'Загрузка...' : 'Войти'} data-layout-mobile="icon,label" data-layout-desktop="icon,label" />
					</form>
				{:else if mode === 'proxy'}
					<form class="auth-form__content auth-form__content--proxy" onsubmit={handleSaveProxy}>
						<Input type="url" id="proxy" placeholder="Ссылка на прокси" minlength="0" pattern="." name="proxy-url" bind:value={proxyUrl} required />
						<Button type="button" fullWidth style="margin-bottom: 1rem; margin-top: -0.5rem;" onclick={useDefaultProxy} label="Использовать встроенный" data-layout-mobile="icon,label" data-layout-desktop="icon,label" />
						<Button type="submit" variant="blue" fullWidth label="Сохранить" data-layout-mobile="icon,label" data-layout-desktop="icon,label" />
					</form>
				{/if}

				<div class="auth-form__footer">
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<a href="#proxy" onclick={(e) => { e.preventDefault(); mode = 'proxy'; error = ''; successMsg = ''; }}><span>О прокси</span></a>
					<a target="_blank" rel="noreferrer" href="https://dtf.ru/?modal=auth/signup/email"><span>Регистрация</span></a>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 999;
    display: flex;
    padding: 36px 16px;
    overflow-x: hidden;
    overflow-y: auto;
}

.modal-window {
    width: 100%;
    max-width: 880px;
    margin: auto;
}

.modal-window__close {
    z-index: 1;
    position: absolute;
    cursor: pointer;
    color: var(--text-primary);
    opacity: 0.5;
    right: 0;
    top: 0;
    padding: 16px;
}

.modal-window__close:hover {
    opacity: 1;
}

.login-modal {
    max-width: 640px;
    display: grid;
    grid-template-columns: 212px 1fr;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    overflow: hidden;
}

@media (max-width: 640px) {
    .login-modal {
        grid-template-columns: 1fr;
    }
    .login-modal__cover {
        display: none;
    }
}

.login-modal__cover {
    background-image: url("https://leonardo.osnova.io/356f8b87-e803-86ab-2875-f11915f78a7e/-/format/webp/");
    border-radius: 8px 0 0 8px;
    background-color: var(--bg-ac-modal);
    background-repeat: no-repeat;
    background-position: 50% 50%;
    background-size: cover;
    padding: 25px 30px;
}

.login-modal__content {
    border-radius: 0 8px 8px 0;
    background-color: var(--bg-modal);
    padding: 30px;
    position: relative;
    display: flex;
    flex-direction: column;
}

.auth {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 24px 50px 24px 50px;
    margin: -30px;
    min-height: 600px;
    position: relative;
}

.auth-form {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

.auth__back {
    margin: 18px 20px;
    display: inline-flex;
    align-items: center;
    font-size: 16px;
    line-height: 1.3em;
    color: var(--text-primary);
    opacity: 0.5;
    cursor: pointer;
}

.auth__back-container {
    display: flex;
    align-items: center;
}

.auth__back-container .icon {
    margin-right: 10px;
}

.auth-form__controls {
    background: var(--bg-modal);
    z-index: 9;
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    border-radius: 0 8px 0 0;
}

.auth-form__title {
    font-size: 24px;
    line-height: 36px;
    margin-bottom: 16px;
    margin-top: 114px;
    font-weight: 500;
}

.auth-form__footer {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
}

.auth-form__footer a {
    font-size: 16px;
    font-weight: 700;
    color: #3766a9;
    cursor: pointer;
}

.auth-content {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 16px;
    column-gap: 12px;
}

@media (max-width: 480px) {
    .auth-content {
        grid-template-columns: 1fr;
    }
}

.auth-button {
    --icon-size: 24px;
    --offset: 16px;
}

.auth-error {
    color: #e52a42;
    background: #ffe6e9;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
}

.auth-success {
    color: #2e7d32;
    background: #e8f5e9;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
}
</style>
