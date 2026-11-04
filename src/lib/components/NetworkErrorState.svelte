<script lang="ts">
	import { analyzeError } from '$lib/api/errorInfo';
	import { openOverlay } from '$lib/navigation';
	import ThemeLoader from '$lib/themes/ThemeLoader.svelte';
	import NetworkErrorModal from '$lib/themes/dtf2022/NetworkErrorModal.svelte';

	let {
		error,
		onretry,
		title
	}: {
		error: unknown;
		onretry?: () => void;
		title?: string;
	} = $props();

	let info = $derived(analyzeError(error));
	let showModal = $state(false);
	let retrying = $state(false);

	async function handleRetry() {
		if (retrying) return;
		retrying = true;
		try {
			await onretry?.();
		} finally {
			retrying = false;
		}
	}

	function openSettings() {
		openOverlay({ type: 'settings' });
	}
</script>

<div class="error-island" role="alert">
	<div class="error-island__content">
		<div class={['error-island__icon-box', `error-island__icon-box--${info.badgeType}`]}>
			<svg class="icon icon--warning" width="32" height="32" aria-hidden="true">
				<use href="/icons.svg#notify_warning"></use>
			</svg>
		</div>
		<div class="error-island__text">
			<span class={['error-island__badge', `error-island__badge--${info.badgeType}`]}>
				{info.badge}
			</span>
			<h2 class="error-island__title">{title || info.title}</h2>
			<p class="error-island__subtitle">{info.subtitle}</p>
		</div>
	</div>

	<div class="error-island__actions">
		{#if onretry}
			<button
				type="button"
				class="error-btn error-btn--primary"
				disabled={retrying}
				onclick={handleRetry}
			>
				<svg class="icon" width="18" height="18" aria-hidden="true">
					<use href="/icons.svg#v_refresh"></use>
				</svg>
				<span>{retrying ? 'Повторяем...' : 'Повторить попытку'}</span>
			</button>
		{/if}
		<button type="button" class="error-btn" onclick={() => (showModal = true)}>
			<span>Подробнее</span>
		</button>
		<button type="button" class="error-btn" onclick={openSettings}>
			<svg class="icon" width="18" height="18" aria-hidden="true">
				<use href="/icons.svg#v_gear"></use>
			</svg>
			<span>Настройки</span>
		</button>
	</div>
</div>

{#if showModal}
	<ThemeLoader componentName="NetworkErrorModal" {error} onretry={handleRetry} onclose={() => (showModal = false)}>
		<NetworkErrorModal {error} onretry={handleRetry} onclose={() => (showModal = false)} />
	</ThemeLoader>
{/if}

<style>
	.error-island {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: var(--content-width, 640px);
		margin: 32px auto;
		padding: 28px 24px;
		border-radius: 8px;
		background: var(--bg-card, #fff);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		border: 1px solid rgba(0, 0, 0, 0.06);
		text-align: left;
	}

	.error-island__content {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.error-island__icon-box {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #fff4e5;
		color: #e65100;
	}

	.error-island__icon-box--error {
		background: #ffebee;
		color: #d32f2f;
	}

	.error-island__icon-box--info {
		background: #e3f2fd;
		color: #1976d2;
	}

	.error-island__text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}

	.error-island__badge {
		display: inline-block;
		padding: 2px 7px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		background: #ffe0b2;
		color: #b24100;
	}

	.error-island__badge--error {
		background: #ffcdd2;
		color: #b71c1c;
	}

	.error-island__badge--info {
		background: #bbdefb;
		color: #0d47a1;
	}

	.error-island__title {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		line-height: 24px;
		color: var(--text-primary, #000);
	}

	.error-island__subtitle {
		margin: 0;
		font-size: 14px;
		line-height: 20px;
		color: var(--text-muted, #757575);
	}

	.error-island__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.error-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 40px;
		padding: 0 16px;
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		background: var(--bg-button, #fff);
		color: var(--text-primary, #000);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		user-select: none;
		transition: background 0.15s ease, box-shadow 0.15s ease;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.error-btn:hover {
		background: #f5f5f5;
	}

	.error-btn--primary {
		border: none;
		background: var(--bg-submit-button, #4683d9);
		color: var(--text-submit-button, #fff);
		box-shadow: 0 1px 2px rgba(70, 131, 217, 0.4);
	}

	.error-btn--primary:hover {
		background: var(--bg-submit-button--hover, #437cce);
	}

	.error-btn:disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	@media (max-width: 639px) {
		.error-island {
			margin: 16px 12px;
			padding: 20px 16px;
		}

		.error-island__actions {
			flex-direction: column;
		}

		.error-btn {
			width: 100%;
		}
	}
</style>
