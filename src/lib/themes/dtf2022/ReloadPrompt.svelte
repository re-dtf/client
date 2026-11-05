<script lang="ts">
	import { pwa } from '$lib/pwa.svelte';
</script>

{#if pwa.needRefresh}
	<aside
		class="pwa-prompt"
		role="alert"
		aria-live="polite"
		data-pwa-prompt
	>
		<div class="pwa-prompt__content">
			<span class="pwa-prompt__title">Доступно обновление</span>
			<span class="pwa-prompt__version">
				{#if pwa.newVersion && pwa.newVersion !== pwa.currentVersion}
					Версия <strong class="pwa-prompt__badge">{pwa.newVersion}</strong> (текущая: {pwa.currentVersion})
				{:else}
					Новая сборка ({pwa.currentVersion})
				{/if}
			</span>
			<a
				href={pwa.changesUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="pwa-prompt__link"
			>
				Посмотреть изменения на GitHub &nearr;
			</a>
		</div>

		<div class="pwa-prompt__actions">
			<button
				type="button"
				class="pwa-prompt__btn pwa-prompt__btn--primary"
				onclick={() => pwa.update()}
			>
				Обновить
			</button>
			<button
				type="button"
				class="pwa-prompt__btn pwa-prompt__btn--secondary"
				onclick={() => pwa.dismiss()}
			>
				Отложить
			</button>
		</div>
	</aside>
{/if}

<style>
	/* Базовая структура и заглушка оформления. Дизайн можно переписать под тему dtf2022 */
	.pwa-prompt {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 280px;
		max-width: 360px;
		padding: 16px;
		border-radius: 8px;
		background: var(--island-bg, #ffffff);
		color: var(--main-text, #000000);
		border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		font-family: inherit;
		box-sizing: border-box;
	}

	.pwa-prompt__content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.pwa-prompt__title {
		font-weight: 600;
		font-size: 14px;
		line-height: 1.3;
	}

	.pwa-prompt__version {
		font-size: 13px;
		color: var(--secondary-text, #666666);
		line-height: 1.4;
	}

	.pwa-prompt__badge {
		font-weight: 600;
		color: var(--accent, #1693e5);
	}

	.pwa-prompt__link {
		font-size: 12px;
		color: var(--accent, #1693e5);
		text-decoration: none;
		margin-top: 2px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		width: fit-content;
	}

	.pwa-prompt__link:hover {
		text-decoration: underline;
	}

	.pwa-prompt__actions {
		display: flex;
		gap: 8px;
	}

	.pwa-prompt__btn {
		flex: 1;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: opacity 0.15s ease;
	}

	.pwa-prompt__btn:hover {
		opacity: 0.9;
	}

	.pwa-prompt__btn--primary {
		background: var(--accent, #1693e5);
		color: #ffffff;
	}

	.pwa-prompt__btn--secondary {
		background: var(--secondary-bg, rgba(0, 0, 0, 0.06));
		color: var(--main-text, #000000);
	}

	@media (max-width: 640px) {
		.pwa-prompt {
			left: 16px;
			right: 16px;
			bottom: 72px; /* Выше мобильного бара */
			max-width: none;
		}
	}
</style>
