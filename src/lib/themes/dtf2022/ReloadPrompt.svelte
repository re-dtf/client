<script lang="ts">
	import { pwa } from '$lib/pwa.svelte';
	import { isNative, openExternalUrl } from '$lib/capacitor';
	import { shellUpdater } from '$lib/capacitor/updater.svelte';

	function handleLinkClick(e: MouseEvent) {
		if (isNative()) {
			e.preventDefault();
			openExternalUrl(pwa.changesUrl);
		}
	}
</script>

{#if pwa.needRefresh || (isNative() && shellUpdater.hasUpdate)}
	<aside
		class="pwa-prompt"
		role="alert"
		aria-live="polite"
		data-pwa-prompt
	>
		<div class="pwa-prompt__content">
			<span class="pwa-prompt__title">
				{#if isNative() && shellUpdater.hasUpdate}
					Доступно обновление приложения
				{:else if isNative()}
					Доступно обновление интерфейса
				{:else}
					Доступно обновление
				{/if}
			</span>
			<span class="pwa-prompt__version">
				{#if isNative() && shellUpdater.hasUpdate}
					Новая версия приложения: <strong class="pwa-prompt__badge">{shellUpdater.availableBuild ? `сборка ${shellUpdater.availableBuild}` : (shellUpdater.availableVersion ? `v${shellUpdater.availableVersion}` : '')}</strong>
				{:else if pwa.newVersion && pwa.newVersion !== pwa.currentVersion}
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
				onclick={handleLinkClick}
			>
				Посмотреть изменения на GitHub &nearr;
			</a>
		</div>

		<div class="pwa-prompt__actions">
			{#if isNative() && shellUpdater.hasUpdate}
				<button
					type="button"
					class="pwa-prompt__btn pwa-prompt__btn--primary"
					onclick={() => shellUpdater.downloadApk()}
				>
					Скачать APK
				</button>
			{:else}
				<button
					type="button"
					class="pwa-prompt__btn pwa-prompt__btn--primary"
					onclick={() => pwa.update()}
				>
					Обновить
				</button>
			{/if}
			<button
				type="button"
				class="pwa-prompt__btn pwa-prompt__btn--secondary"
				onclick={() => {
					if (isNative()) shellUpdater.dismiss();
					pwa.dismiss();
				}}
			>
				Отложить
			</button>
		</div>
	</aside>
{/if}

<style>
	/* Базовая структура и оформление плашки обновления PWA / новой сборки */
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
		background: var(--bg-card, #ffffff);
		color: var(--text-primary, #000000);
		border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
		box-shadow: var(--shadow-toast, 0 4px 20px rgba(0, 0, 0, 0.15));
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
		color: var(--text-primary, inherit);
	}

	.pwa-prompt__version {
		font-size: 13px;
		color: var(--text-secondary, #666666);
		line-height: 1.4;
	}

	.pwa-prompt__badge {
		font-weight: 600;
		color: var(--color-accent, #1693e5);
	}

	.pwa-prompt__link {
		font-size: 12px;
		color: var(--text-link, var(--color-accent, #1693e5));
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
		font-family: inherit;
		cursor: pointer;
		border: none;
		transition: opacity 0.15s ease, background-color var(--duration-base);
	}

	.pwa-prompt__btn:hover {
		opacity: 0.9;
	}

	.pwa-prompt__btn--primary {
		background: var(--color-blue, var(--color-accent, #1693e5));
		color: var(--text-submit-button, #ffffff);
	}

	.pwa-prompt__btn--secondary {
		background: var(--bg-button, var(--bg-secondary, rgba(0, 0, 0, 0.06)));
		color: var(--text-primary, #000000);
		border: 1px solid var(--border-color, transparent);
	}

	.pwa-prompt__btn--secondary:hover {
		background: var(--bg-button-hover, var(--bg-card-hover, rgba(0, 0, 0, 0.08)));
	}

	@media (max-width: 640px) {
		.pwa-prompt {
			left: 16px;
			right: 16px;
			bottom: calc(var(--mobile-bar-height, 50px) + 16px);
			max-width: none;
		}
	}
</style>
