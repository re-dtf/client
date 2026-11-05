<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import type { SourceState } from '$lib/api/sources/types';
	import { startBioVerification, verifyBioAuth, cleanupHangingBio, isPendingCleanupValidForCurrentUser } from '$lib/api/sources/bio-auth';
	import { sourceStorage } from '$lib/storage/sources.svelte';
	import { onMount } from 'svelte';

	let { source, onComplete, onCancel }: {
		source: SourceState;
		onComplete: () => void;
		onCancel: () => void;
	} = $props();

	let step = $state<'initial' | 'challenge' | 'verifying' | 'success' | 'error'>('initial');
	let errorMsg = $state('');
	let currentAttempt = $state(0);
	let maxAttempts = $state(0);
	let isCancelled = false;
	let abortController = new AbortController();

	onMount(() => {
		startProcess();
		return () => {
			isCancelled = true;
			abortController.abort();
			if (step !== 'success' && sourceStorage.pendingBioCleanup) {
				cleanupHangingBio(true).catch(console.error);
			}
		};
	});

	async function startProcess() {
		errorMsg = '';
		try {
			const pendingCleanup = sourceStorage.pendingBioCleanup;
			let canResume = false;
			if (pendingCleanup && pendingCleanup.sourceId === source.manifest.id) {
				canResume = await isPendingCleanupValidForCurrentUser();
			}

			if (canResume) {
				step = 'verifying';
				await runVerification();
			} else {
				step = 'challenge';
				await startBioVerification(source, abortController.signal);
				if (isCancelled) return;
				step = 'verifying';
				await runVerification();
			}
		} catch (e: any) {
			if (isCancelled) return;
			step = 'error';
			errorMsg = e.message;
		}
	}

	async function runVerification() {
		await verifyBioAuth(source, (attempt, max) => {
			currentAttempt = attempt;
			maxAttempts = max;
			return isCancelled;
		});
		if (isCancelled) return;
		step = 'success';
		setTimeout(() => {
			if (!isCancelled) onComplete();
		}, 2000);
	}

	async function handleCancel() {
		isCancelled = true;
		abortController.abort();
		onCancel();
	}

	async function restartCompletely() {
		if (sourceStorage.pendingBioCleanup) {
			await cleanupHangingBio(true).catch(console.error);
			if (sourceStorage.pendingBioCleanup) {
				step = 'error';
				errorMsg = 'Не удалось очистить профиль. Проверьте интернет или удалите код вручную.';
				return;
			}
		}
		step = 'initial';
		currentAttempt = 0;
		maxAttempts = 0;
		isCancelled = false;
		abortController = new AbortController();
		startProcess();
	}
</script>

<Dialog label="Авторизация через re:connect" width="400px" flush>
	<div class="modal-header">
		<h3>Авторизация через re:connect</h3>
	</div>
	
	<div class="modal-body">
		{#if step === 'initial'}
			<p>Подготовка...</p>
		{:else if step === 'challenge'}
			<div class="loading-step">
				<div class="spinner"></div>
				<p>Генерация проверочного кода и добавление в профиль DTF...</p>
			</div>
		{:else if step === 'verifying'}
			<div class="loading-step">
				<div class="spinner"></div>
				<p>Ожидание подтверждения от сервера...</p>
				{#if maxAttempts > 0}
					<span class="attempt-info">Попытка {currentAttempt} из {maxAttempts}</span>
				{/if}
				<p class="warning">Не закрывайте это окно. Процесс может занять до минуты.</p>
			</div>
		{:else if step === 'success'}
			<div class="success-step">
				<div class="success-icon">✓</div>
				<p>Успешная авторизация!</p>
				<p class="sub-text">Профиль DTF восстановлен.</p>
			</div>
		{:else if step === 'error'}
			<div class="error-step">
				<p class="error-text">{errorMsg}</p>
			</div>
		{/if}
	</div>

	<div class="modal-footer">
		{#if step === 'error'}
			<button class="btn secondary" onclick={restartCompletely}>Начать заново</button>
			<button class="btn primary" onclick={startProcess}>Повторить попытку</button>
		{/if}
		{#if step !== 'success'}
			<button class="btn danger" onclick={handleCancel}>Отмена</button>
		{/if}
	</div>
</Dialog>

<style>
	.modal-header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #eee);
	}

	.modal-header h3 {
		margin: 0;
		font-size: 18px;
		color: var(--text-primary, #333);
	}

	.modal-body {
		padding: 24px 20px;
		min-height: 150px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
	}

	.loading-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.attempt-info {
		font-size: 13px;
		color: var(--text-muted, #666);
		background: var(--bg-secondary, #f0f0f0);
		padding: 4px 8px;
		border-radius: 4px;
	}

	.warning {
		font-size: 12px;
		color: var(--color-dislike, #e65100);
		margin-top: 8px;
	}

	.success-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.success-icon {
		width: 48px;
		height: 48px;
		background: var(--color-positive, #4caf50);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		font-weight: bold;
	}

	.sub-text {
		font-size: 13px;
		color: var(--text-muted, #666);
		margin: 0;
	}

	.error-step {
		color: var(--color-danger-text, #d32f2f);
		background: var(--color-danger-bg, #ffebee);
		padding: 16px;
		border-radius: 6px;
	}

	.error-text {
		margin: 0;
		font-size: 14px;
	}

	.modal-footer {
		padding: 12px 20px;
		border-top: 1px solid var(--border-color, #eee);
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.spinner {
		border: 3px solid var(--border-subtle, #f3f3f3);
		border-top: 3px solid var(--color-blue, #1976d2);
		border-radius: 50%;
		width: 32px;
		height: 32px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
