<script lang="ts">
	import { mediaSheet } from '$lib/mediaSheet.svelte';
	import { fade } from 'svelte/transition';
	import { reducedMotion } from '$lib/motion';

	const ms = (n: number) => (reducedMotion() ? 0 : n);
	const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	let isGif = $derived(mediaSheet.current?.isGif ?? false);
</script>

<svelte:window onkeydown={(e) => mediaSheet.current && e.key === 'Escape' && mediaSheet.close()} />

{#if mediaSheet.current}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="media-sheet-overlay"
		onclick={(e) => e.target === e.currentTarget && mediaSheet.close()}
		in:fade={{ duration: ms(150) }}
		out:fade={{ duration: ms(100) }}
	>
		<div class="media-sheet" role="dialog" aria-modal="true" aria-label={isGif ? 'Действия с GIF' : 'Действия с видео'}>
			<div class="media-sheet__header">
				<span class="media-sheet__title">{isGif ? 'GIF' : 'Видео'}</span>
			</div>
			<div class="media-sheet__actions">
				<button type="button" class="media-sheet__action" onclick={() => mediaSheet.download()}>
					<svg class="icon" width="20" height="20" aria-hidden="true">
						<use href="/icons.svg#ui_download"></use>
					</svg>
					<span>{isGif ? 'Сохранить GIF' : 'Сохранить видео'}</span>
				</button>
				<button type="button" class="media-sheet__action" onclick={() => mediaSheet.copy()}>
					<svg class="icon" width="20" height="20" aria-hidden="true">
						<use href="/icons.svg#v_link"></use>
					</svg>
					<span>Копировать ссылку</span>
				</button>
				{#if canShare}
					<button type="button" class="media-sheet__action" onclick={() => mediaSheet.share()}>
						<svg class="icon" width="20" height="20" aria-hidden="true">
							<use href="/icons.svg#v_share"></use>
						</svg>
						<span>Поделиться</span>
					</button>
				{/if}
			</div>
			<div class="media-sheet__footer">
				<button type="button" class="media-sheet__cancel" onclick={() => mediaSheet.close()}>
					Отмена
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.media-sheet-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 0;
		background-color: var(--modal-backdrop, rgba(0, 0, 0, 0.6));
		touch-action: none;
	}

	.media-sheet {
		width: 100%;
		max-width: 440px;
		margin: 0;
		padding: 12px 16px max(16px, env(safe-area-inset-bottom, 16px));
		border-radius: 16px 16px 0 0;
		background-color: var(--bg-card, #ffffff);
		box-shadow: var(--shadow-dropdown, 0 -2px 16px rgba(0, 0, 0, 0.15));
		color: var(--text-primary, #000000);
		user-select: none;
	}

	.media-sheet__header {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px 0 12px;
	}

	.media-sheet__title {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-muted, #595959);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.media-sheet__actions {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.media-sheet__action {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 16px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--text-primary, #000000);
		font-size: 16px;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		transition: background-color var(--duration-base, 150ms) ease;
	}

	.media-sheet__action:active {
		background-color: var(--bg-card-active, rgba(0, 0, 0, 0.08));
	}

	.media-sheet__action .icon {
		display: block;
		flex-shrink: 0;
		color: var(--text-primary, #000000);
	}

	.media-sheet__footer {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
	}

	.media-sheet__cancel {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 12px 16px;
		border: 0;
		border-radius: 8px;
		background: var(--bg-secondary, #f5f5f5);
		color: var(--text-primary, #000000);
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--duration-base, 150ms) ease;
	}

	.media-sheet__cancel:active {
		background-color: var(--bg-card-active, rgba(0, 0, 0, 0.08));
	}
</style>
