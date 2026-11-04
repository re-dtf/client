<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Окно поверх страницы, как v-popup у DTF: заголовок с крестиком, тело и подвал с кнопками.
	 * Ширина — Small 480, Medium 520, Large 880. На узких экранах это шторка снизу.
	 */
	let {
		title,
		width = 480,
		onclose,
		children,
		footer
	}: {
		title: string;
		width?: number;
		onclose: () => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- Закрытие кликом по фону; с клавиатуры закрывает Escape -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="popup-overlay" onclick={(e) => e.target === e.currentTarget && onclose()}>
	<div class="popup" role="dialog" aria-modal="true" aria-label={title} style:max-width="{width}px">
		<div class="popup__header">
			{title}
			<button type="button" class="popup__close" aria-label="Закрыть" onclick={onclose}>
				<svg class="icon" width="24" height="24" aria-hidden="true">
					<use href="/icons.svg#v_close"></use>
				</svg>
			</button>
		</div>

		<div class={['popup__body', { 'popup__body--with-footer': footer }]}>
			{@render children()}
		</div>

		{#if footer}
			<div class="popup__footer">
				{@render footer()}
			</div>
		{/if}
	</div>
</div>

<style>
	.popup-overlay {
		position: fixed;
		inset: 0;
		z-index: 999;
		display: flex;
		padding: 36px 16px;
		overflow-x: hidden;
		overflow-y: auto;
		background-color: rgba(0, 0, 0, 0.5);
	}

	.popup {
		width: 100%;
		margin: auto;
		border-radius: 8px;
		background-color: #fff;
		color: #000;
		text-align: left;
	}

	.popup__header {
		position: relative;
		z-index: 1;
		min-height: 65px;
		padding: 20px 56px 16px;
		border-bottom: 1px solid #dedede;
		border-radius: 8px 8px 0 0;
		background-color: #fff;
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
		text-align: center;
	}

	.popup__close {
		position: absolute;
		top: 23px;
		right: 16px;
		color: #000;
		opacity: 0.5;
		cursor: pointer;
	}

	.popup__close:hover {
		opacity: 1;
	}

	.popup__close .icon {
		display: block;
	}

	.popup__body {
		display: flex;
		flex-direction: column;
		padding: 24px 32px 32px;
		border-radius: 0 0 8px 8px;
		line-height: 24px;
	}

	.popup__body--with-footer {
		padding-bottom: 16px;
		border-radius: 0;
	}

	.popup__footer {
		--btn-height: 40px;
		--btn-icon-size: 18px;
		--btn-icon-margin-left: 12px;
		--btn-icon-margin-right: -6px;
		--btn-offset: 14px;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 8px 32px 32px;
	}

	@media (max-width: 859px) {
		.popup-overlay {
			align-items: flex-end;
			padding: 56px 0 0;
		}

		.popup {
			max-width: none !important;
			margin: 0;
			border-radius: 12px 12px 0 0;
		}

		.popup__header {
			min-height: 56px;
			padding-top: 16px;
			padding-bottom: 11px;
			border-radius: 12px 12px 0 0;
		}

		.popup__close {
			top: 18px;
		}

		.popup__body {
			padding: 16px 16px 20px;
		}

		.popup__body--with-footer {
			padding-bottom: 0;
		}

		.popup__footer {
			flex-direction: column-reverse;
			padding: 24px 16px;
		}

		.popup__footer :global(.btn) {
			width: 100%;
		}
	}
</style>
