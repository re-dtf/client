<script lang="ts">
	import { resolve } from '$app/paths';
	import Dialog from '$lib/components/Dialog.svelte';
	import type { ClientBadge } from '$lib/clientBadge';
	import { notify } from './ui/notify.svelte';

	export type PlusBadgeModal = {
		type: 'plus';
		customUrl?: string;
	};

	export type BadgeModalInfo = ClientBadge | PlusBadgeModal;

	let {
		badge,
		onclose
	}: {
		badge: BadgeModalInfo;
		onclose: () => void;
	} = $props();

	let copied = $state(false);

	async function share() {
		const shareUrl = typeof window !== 'undefined' ? new URL(resolve('/' as any), window.location.href).href : '';
		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share({
					title: 're:DTF — альтернативный клиент DTF',
					text: 'Клиент re:DTF для чтения и комментирования DTF',
					url: shareUrl
				});
				return;
			} catch (e: unknown) {
				if (e instanceof Error && e.name === 'AbortError') {
					return;
				}
			}
		}

		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(shareUrl);
				copied = true;
				notify.success('Ссылка на re:DTF скопирована');
				setTimeout(() => (copied = false), 2500);
			} catch {
				notify.error('Не удалось скопировать ссылку');
			}
		}
	}
</script>

<Dialog label={badge.type === 'plus' ? 'Подписка DTF Plus' : 'Информация о клиенте'} width="400px" onClose={onclose}>
	<div class="badge-modal">
		<button type="button" class="badge-modal__close" aria-label="Закрыть" onclick={onclose}>
			<svg class="icon" width="20" height="20" aria-hidden="true">
				<use href="/icons.svg#v_close"></use>
			</svg>
		</button>

		<div class="badge-modal__hero">
			{#if badge.type === 'redtf'}
				<div class="badge-modal__badge badge-modal__badge--redtf">
					<span>re:</span>
				</div>
			{:else if badge.type === 'android'}
				<div class="badge-modal__badge badge-modal__badge--android">
					<svg class="icon" width="16" height="16" aria-hidden="true">
						<use href="/icons.svg#v_android"></use>
					</svg>
					<span>Android</span>
				</div>
			{:else if badge.type === 'ios'}
				<div class="badge-modal__badge badge-modal__badge--ios">
					<svg class="icon" width="16" height="16" aria-hidden="true">
						<use href="/icons.svg#v_apple"></use>
					</svg>
					<span>iOS</span>
				</div>
			{:else if badge.type === 'plus'}
				<div class="badge-modal__badge badge-modal__badge--plus">
					{#if badge.customUrl}
						<img src={badge.customUrl} width="16" height="16" alt="" />
					{:else}
						<svg class="icon" width="16" height="16" aria-hidden="true">
							<use href="/icons.svg#ui_badge_plus"></use>
						</svg>
					{/if}
					<span>Plus</span>
				</div>
			{/if}
		</div>

		<div class="badge-modal__content">
			{#if badge.type === 'redtf'}
				<p>Этот комментарий написан с клиента re:DTF, которым вы сейчас пользуетесь.</p>
				<p>Кстати, вы можете сделать, чтобы таких комментариев было больше — просто поделитесь ссылкой с друзьями, комментаторами, или своими подписчиками. Мы очень благодарны за любую поддержку</p>
			{:else if badge.type === 'android'}
				<p>Этот комментарий написан с использованием Android приложения DTF.</p>
				<p>Кстати, у re:DTF тоже есть мобильное приложение для Android.</p>
			{:else if badge.type === 'ios'}
				<p>Этот комментарий написан с использованием iOS приложения DTF.</p>
			{:else if badge.type === 'plus'}
				<p>У этого пользователя активна подписка DTF+</p>
				<p>Она даёт возможность выбирать бейдж у профиля и разблокирует некоторые другие функции на DTF.</p>
			{/if}
		</div>

		<div class="badge-modal__actions">
			{#if badge.type === 'redtf'}
				<button type="button" class="btn primary" onclick={share}>
					{copied ? 'Ссылка скопирована' : 'Поделиться ссылкой'}
				</button>
				<button type="button" class="btn secondary" onclick={onclose}>
					Закрыть
				</button>
			{:else if badge.type === 'android'}
				<a
					class="btn primary"
					href="https://github.com/re-dtf/client/releases"
					target="_blank"
					rel="noopener noreferrer"
				>
					Загрузить приложение
				</a>
				<button type="button" class="btn secondary" onclick={onclose}>
					Закрыть
				</button>
			{:else if badge.type === 'plus'}
				<a
					class="btn primary"
					href="https://dtf.ru/plus"
					target="_blank"
					rel="noopener noreferrer"
				>
					Подробнее о Plus
				</a>
				<button type="button" class="btn secondary" onclick={onclose}>
					Закрыть
				</button>
			{:else}
				<button type="button" class="btn secondary" onclick={onclose}>
					Закрыть
				</button>
			{/if}
		</div>
	</div>
</Dialog>

<style>
	.badge-modal {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 16px;
	}

	.badge-modal__close {
		position: absolute;
		top: -12px;
		right: -12px;
		padding: 6px;
		color: var(--text-muted, var(--text-secondary));
		cursor: pointer;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--duration-fast, 0.15s) ease, background-color var(--duration-fast, 0.15s) ease;
	}

	.badge-modal__close:hover {
		color: var(--text-primary);
		background-color: var(--bg-button-hover, rgba(0, 0, 0, 0.05));
	}

	.badge-modal__hero {
		display: flex;
		justify-content: center;
		align-items: center;
		padding-top: 4px;
	}

	.badge-modal__badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		line-height: 1;
		user-select: none;
	}

	.badge-modal__badge .icon {
		display: block;
		flex-shrink: 0;
	}

	.badge-modal__badge--redtf {
		background-color: var(--color-blue);
		color: #fff;
		font-weight: 700;
		font-size: 14px;
	}

	.badge-modal__badge--android,
	.badge-modal__badge--ios,
	.badge-modal__badge--plus {
		background-color: var(--color-gray-10, rgba(0, 0, 0, 0.05));
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08));
	}

	.badge-modal__badge--plus img {
		display: block;
		flex-shrink: 0;
	}

	.badge-modal__content {
		display: flex;
		flex-direction: column;
		gap: 12px;
		font-size: 15px;
		line-height: 22px;
		color: var(--text-primary);
	}

	.badge-modal__content p {
		margin: 0;
	}

	.badge-modal__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
		width: 100%;
		margin-top: 4px;
	}

	.badge-modal__actions :global(.btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		min-height: 36px;
		padding: 0 16px;
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		.badge-modal__actions {
			flex-direction: column;
		}

		.badge-modal__actions :global(.btn) {
			width: 100%;
		}
	}
</style>
