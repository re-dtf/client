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
		background: rgba(0, 0, 0, 0.5);
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
		background: #fff;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
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
		cursor: pointer;
		transition: background-color var(--duration-base);
	}

	.dialog :global(.btn.primary) {
		background: #1976d2;
		color: #fff;
	}

	.dialog :global(.btn.primary:hover) {
		background: #1565c0;
	}

	.dialog :global(.btn.secondary) {
		border-color: #ccc;
		background: #fff;
		color: #333;
	}

	.dialog :global(.btn.secondary:hover) {
		background: #f0f0f0;
	}

	.dialog :global(.btn.danger) {
		background: transparent;
		color: #d32f2f;
	}

	.dialog :global(.btn.danger:hover) {
		background: #ffebee;
	}
</style>
