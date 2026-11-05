<script lang="ts">
	import { analyzeError } from '$lib/api/errorInfo';
	import { openOverlay } from '$lib/navigation';
	import Button from './ui/Button.svelte';
	import Popup from './ui/Popup.svelte';

	let {
		error,
		onretry,
		onclose
	}: {
		error: unknown;
		onretry?: () => void;
		onclose?: () => void;
	} = $props();

	let info = $derived(analyzeError(error));
	let retrying = $state(false);
	let copied = $state(false);

	function handleClose() {
		onclose?.();
	}

	async function handleRetry() {
		if (retrying) return;
		retrying = true;
		try {
			await onretry?.();
			handleClose();
		} finally {
			retrying = false;
		}
	}

	function openSettings() {
		handleClose();
		openOverlay({ type: 'settings' });
	}

	async function copyDetails() {
		const text = [
			`[reDTF Error Report]`,
			`Тип: ${info.kind} (${info.badge})`,
			`Заголовок: ${info.title}`,
			`URL: ${info.technicalDetails.url || 'N/A'}`,
			`Статус: ${info.technicalDetails.status ?? 'N/A'}`,
			`Время: ${info.technicalDetails.timestamp}`,
			`Сообщение: ${info.technicalDetails.rawMessage}`
		].join('\n');

		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch {
			// Игнорируем ошибку буфера обмена
		}
	}
</script>

<Popup title="Ошибка подключения" width={540} onclose={handleClose}>
	<div class="network-error">
		<div class="network-error__hero">
			<div class={['network-error__icon-wrap', `network-error__icon-wrap--${info.badgeType}`]}>
				<svg class="icon icon--warning" width="36" height="36" aria-hidden="true">
					<use href="/icons.svg#notify_warning"></use>
				</svg>
			</div>
			<div class="network-error__lead">
				<span class={['network-error__badge', `network-error__badge--${info.badgeType}`]}>
					{info.badge}
				</span>
				<h3 class="network-error__title">{info.title}</h3>
				<p class="network-error__subtitle">{info.subtitle}</p>
			</div>
		</div>

		<div class="network-error__desc">
			{info.description}
		</div>

		{#if info.suggestions.length > 0}
			<div class="network-error__section">
				<div class="network-error__section-title">Что можно сделать:</div>
				<ul class="network-error__suggestions">
					{#each info.suggestions as suggestion, i}
						<li class="network-error__suggestion-item">
							<span class="network-error__step-num">{i + 1}</span>
							<span class="network-error__step-text">{suggestion}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<details class="network-error__details">
			<summary class="network-error__summary">
				<span>Технические подробности</span>
				<svg class="icon details-arrow" width="14" height="14" aria-hidden="true">
					<use href="/icons.svg#ui_arrow_down"></use>
				</svg>
			</summary>
			<div class="network-error__debug">
				<div class="network-error__debug-row">
					<span class="network-error__debug-label">Адрес:</span>
					<span class="network-error__debug-val">{info.technicalDetails.url || 'api.dtf.ru'}</span>
				</div>
				{#if info.technicalDetails.status}
					<div class="network-error__debug-row">
						<span class="network-error__debug-label">HTTP-код:</span>
						<span class="network-error__debug-val">{info.technicalDetails.status}</span>
					</div>
				{/if}
				<div class="network-error__debug-row">
					<span class="network-error__debug-label">Время:</span>
					<span class="network-error__debug-val">{info.technicalDetails.timestamp}</span>
				</div>
				<div class="network-error__debug-raw">
					<code>{info.technicalDetails.rawMessage}</code>
				</div>
				<button type="button" class="network-error__copy-btn" onclick={copyDetails}>
					<svg class="icon" width="16" height="16" aria-hidden="true">
						<use href="/icons.svg#{copied ? 'v_tick' : 'v_copy'}"></use>
					</svg>
					<span>{copied ? 'Скопировано в буфер' : 'Скопировать отчёт об ошибке'}</span>
				</button>
			</div>
		</details>
	</div>

	{#snippet footer()}
		<Button icon="v_gear" iconSize={18} label="Настройки" onclick={openSettings} />
		{#if onretry}
			<Button
				variant="blue"
				icon="v_refresh"
				iconSize={18}
				label={retrying ? 'Повторяем...' : 'Повторить попытку'}
				disabled={retrying}
				onclick={handleRetry}
			/>
		{/if}
	{/snippet}
</Popup>

<style>
	:global(.popup__footer) {
		--btn-height: 40px;
		--btn-icon-size: 18px;
		--btn-icon-margin-left: 12px;
		--btn-icon-margin-right: -6px;
		--btn-offset: 14px;
	}

	.network-error {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.network-error__hero {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.network-error__icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--bg-coin, #fff4e5);
		color: var(--color-dislike, #e65100);
	}

	.network-error__icon-wrap--error {
		background: var(--color-danger-bg, #ffebee);
		color: var(--color-danger-text, #d32f2f);
	}

	.network-error__icon-wrap--info {
		background: var(--bg-highlight, #e3f2fd);
		color: var(--color-blue, #1976d2);
	}

	.network-error__lead {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}

	.network-error__badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		background: var(--bg-coin, #ffe0b2);
		color: var(--color-dislike, #b24100);
	}

	.network-error__badge--error {
		background: var(--color-danger-bg, #ffcdd2);
		color: var(--color-danger-text, #b71c1c);
	}

	.network-error__badge--info {
		background: var(--bg-highlight, #bbdefb);
		color: var(--color-blue, #0d47a1);
	}

	.network-error__title {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		line-height: 24px;
		color: var(--text-primary, #000);
	}

	.network-error__subtitle {
		margin: 0;
		font-size: 13px;
		line-height: 18px;
		color: var(--text-muted, #757575);
	}

	.network-error__desc {
		font-size: 14px;
		line-height: 21px;
		color: var(--text-secondary, #333);
	}

	.network-error__section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		border-radius: 8px;
		background: var(--bg-secondary, #f7f9fa);
		border: 1px solid var(--border-color, #ebeff2);
	}

	.network-error__section-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary, #000);
	}

	.network-error__suggestions {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.network-error__suggestion-item {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		font-size: 13px;
		line-height: 18px;
		color: var(--text-secondary, #444);
	}

	.network-error__step-num {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		margin-top: 1px;
		border-radius: 50%;
		background: var(--bg-tertiary, #e0e5eb);
		color: var(--text-primary, #4a5568);
		font-size: 11px;
		font-weight: 700;
	}

	.network-error__step-text {
		flex: 1;
	}

	.network-error__details {
		border-radius: 6px;
		background: var(--bg-secondary, #fafafa);
		border: 1px solid var(--border-color, #eee);
		overflow: hidden;
	}

	.network-error__summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-muted, #666);
		cursor: pointer;
		user-select: none;
	}

	.network-error__summary:hover {
		color: var(--text-primary, #000);
	}

	.details-arrow {
		transition: transform 0.2s ease;
	}

	.network-error__details[open] .details-arrow {
		transform: rotate(180deg);
	}

	.network-error__debug {
		padding: 12px;
		border-top: 1px solid var(--border-color, #eee);
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 12px;
	}

	.network-error__debug-row {
		display: flex;
		gap: 8px;
	}

	.network-error__debug-label {
		color: var(--text-muted, #888);
		min-width: 65px;
	}

	.network-error__debug-val {
		font-family: monospace;
		color: var(--text-primary, #111);
		word-break: break-all;
	}

	.network-error__debug-raw {
		margin-top: 4px;
		padding: 8px;
		background: var(--bg-card, #fff);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 4px;
		overflow-x: auto;
	}

	.network-error__debug-raw code {
		font-family: monospace;
		font-size: 11px;
		color: var(--color-danger, #c62828);
		white-space: pre-wrap;
		word-break: break-all;
	}

	.network-error__copy-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		align-self: flex-start;
		margin-top: 6px;
		padding: 6px 10px;
		border: 1px solid var(--border-color, #d0d7de);
		border-radius: 6px;
		background: var(--bg-button, #fff);
		color: var(--text-primary, #24292f);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.network-error__copy-btn:hover {
		background: var(--bg-button-hover, #f3f4f6);
	}

	@media (max-width: 859px) {
		.network-error__hero {
			gap: 12px;
		}

		.network-error__icon-wrap {
			width: 44px;
			height: 44px;
		}

		.network-error__title {
			font-size: 16px;
		}
	}
</style>
