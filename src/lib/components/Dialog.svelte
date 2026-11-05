<script lang="ts">
	import type { Snippet } from 'svelte';
	import { backdropShow, modalShow, modalHide } from '$lib/components/overlays/modalMotion';

	/*
	 * Диалог с локальным состоянием (подтверждение, ход процесса): подложка, окно и кнопки .btn.
	 * Не путать с оверлеями навигации: те открывает openOverlay, а рисует ModalShell.
	 * Есть onClose — работают Escape и клик по подложке; нет — окно закрывается только своими кнопками.
	 */
	let { label, width = '500px', flush = false, onClose, children }: {
		label: string;
		width?: string;
		/** Без внутренних отступов: содержимое рисует их само (шапка и подвал с границами) */
		flush?: boolean;
		onClose?: () => void;
		children: Snippet;
	} = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose?.()} />

<div
	class="backdrop"
	role="presentation"
	out:modalHide|global
	{@attach (el) => {
		backdropShow(el);
		modalShow(el);
	}}
	onclick={(e) => e.target === e.currentTarget && onClose?.()}
>
	<div class={['dialog', { flush }]} style:max-width={width} role="dialog" aria-modal="true" aria-label={label}>
		{@render children()}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		overflow-x: hidden;
		background: var(--modal-backdrop, rgba(0, 0, 0, 0.5));
	}

	.dialog {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
		max-height: 90vh;
		padding: 24px;
		overflow-y: auto;
		border-radius: 12px;
		background: var(--bg-modal, var(--bg-card, #fff));
		color: var(--text-primary, inherit);
		border: 1px solid var(--border-subtle, transparent);
		box-shadow: var(--shadow-popup, 0 4px 24px rgba(0, 0, 0, 0.15));
	}

	.dialog.flush {
		gap: 0;
		padding: 0;
	}

	/* Кнопки диалогов источников: одинаковые во всех */
	.dialog :global(.btn) {
		padding: 8px 16px;
		border: 1px solid transparent;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: background-color var(--duration-base), border-color var(--duration-base), color var(--duration-base);
	}

	.dialog :global(.btn.primary) {
		background: var(--color-blue, #1976d2);
		color: var(--text-submit-button, #fff);
	}

	.dialog :global(.btn.primary:hover) {
		background: var(--bg-submit-button--hover, #1565c0);
	}

	.dialog :global(.btn.secondary) {
		border-color: var(--border-color, #ccc);
		background: var(--bg-button, #fff);
		color: var(--text-primary, #333);
	}

	.dialog :global(.btn.secondary:hover) {
		background: var(--bg-button-hover, #f0f0f0);
	}

	.dialog :global(.btn.danger) {
		background: transparent;
		color: var(--color-danger, #d32f2f);
	}

	.dialog :global(.btn.danger:hover) {
		background: var(--color-danger-bg, #ffebee);
	}
</style>
