<script lang="ts">
	import { api } from '$lib/api/index.svelte';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let isLoading = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();

		isLoading = true;
		error = '';

		try {
			await api.login(email, password);
			goto('/');
		} catch (err: any) {
			error = err.message || 'Произошла ошибка при авторизации';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="login-container">
	<h1>Вход в аккаунт</h1>
	
	<form onsubmit={handleSubmit} class="login-form">
		<div class="form-group">
			<label for="email">Email</label>
			<input type="email" id="email" bind:value={email} required disabled={isLoading} />
		</div>
		
		<div class="form-group">
			<label for="password">Пароль</label>
			<input type="password" id="password" bind:value={password} required disabled={isLoading} />
		</div>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<button type="submit" disabled={isLoading}>
			{isLoading ? 'Вход...' : 'Войти'}
		</button>
	</form>
</div>

<style>
	.login-container {
		max-width: 400px;
		margin: 40px auto;
		background: white;
		padding: 30px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}

	h1 {
		margin-top: 0;
		margin-bottom: 20px;
		font-size: 24px;
		text-align: center;
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

	button {
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

	button:hover:not(:disabled) {
		background: #d41f35;
	}

	button:disabled {
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
</style>
