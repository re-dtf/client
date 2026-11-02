<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import Button from '../ui/Button.svelte';

	let {
		text = $bindable(''),
		replying = false,
		editing = false,
		sending = false,
		error = '',
		oncancel,
		onsubmit
	}: {
		/** Черновик живёт у родителя — переживает переезд редактора между комментариями */
		text?: string;
		/** Ответ на комментарий: редактор стоит внутри него, есть «Отмена» */
		replying?: boolean;
		/** Правка своего комментария: другая подпись кнопки */
		editing?: boolean;
		sending?: boolean;
		error?: string;
		oncancel?: () => void;
		onsubmit?: () => void;
	} = $props();

	let focused = $state(false);
	let isEmpty = $derived(!text.trim());
	let submitLabel = $derived(editing ? 'Сохранить' : replying ? 'Ответить' : 'Отправить');
	let placeholder = $derived(replying ? 'Написать ответ...' : 'Написать комментарий...');

	// При открытии ответа сразу ставим курсор в поле
	const focusOnReply: Attachment<HTMLElement> = (node) => {
		if (replying) node.focus();
	};
</script>

<div class="comment-editor-container">
	<div class="comment-editor-container__branches">
		<div class="comment-editor-container__line"></div>
	</div>

	<div class="comment-editor-container__content">
		<div class={['comment-editor', { 'comment-editor--focused': focused }]}>
			<div class={['comment-editor-box', { 'comment-editor-box--empty': isEmpty }]}>
				<div class="comment-editor-box__placeholder" aria-hidden="true">{placeholder}</div>
				<div class="comment-editor-box__content">
					<div
						class="comment-editor-box__input"
						contenteditable="true"
						role="textbox"
						aria-multiline="true"
						aria-label={placeholder}
						tabindex="0"
						bind:textContent={text}
						onfocus={() => (focused = true)}
						onblur={() => (focused = false)}
						{@attach focusOnReply}
					></div>
				</div>

				{#if error}
					<p class="comment-editor-box__error" role="alert">{error}</p>
				{/if}

				<div class="comment-editor-box__footer">
					<!-- ponytail: вложений и донатов в API клиента пока нет -->
					<div class="comment-editor-box__attaches">
						<button type="button" class="comment-editor-box__attach-btn" aria-label="Прикрепить картинку">
							<svg class="icon" width="20" height="20" aria-hidden="true">
								<use href="/icons.svg#v_image"></use>
							</svg>
						</button>
						<button type="button" class="comment-editor-box__attach-btn" aria-label="Прикрепить GIF">
							<svg class="icon" width="20" height="20" aria-hidden="true">
								<use href="/icons.svg#v_gif"></use>
							</svg>
						</button>
						<button type="button" class="comment-editor-box__attach-btn comment-editor-box__attach-btn--donate" aria-label="Донат">
							<svg class="icon" width="20" height="20" aria-hidden="true">
								<use href="/icons.svg#v_rouble"></use>
							</svg>
						</button>
					</div>

					<div class="comment-editor-box__custom-buttons">
						{#if replying}
							<button type="button" class="comment-editor-box__custom-btn" onclick={oncancel}>Отмена</button>
						{/if}
					</div>

					<div class="comment-editor-box__submit">
						<Button variant="blue" disabled={isEmpty || sending} label={submitLabel} onclick={onsubmit} />
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.comment-editor-container {
		display: grid;
		grid-template-columns: auto 1fr;
	}

	/* Ветка слева видна, только когда редактор стоит внутри комментария */
	.comment-editor-container__branches {
		display: flex;
		visibility: hidden;
	}

	.comment-editor-container__line {
		flex-shrink: 0;
		width: var(--gap-branch, 0);
		border-left: 1px solid var(--color-branch);
	}

	.comment-editor-container__line::before {
		content: '';
		display: block;
		box-sizing: content-box;
		width: 12px;
		height: var(--content-offset-top);
		padding-bottom: calc(var(--size-avatar) * 0.5 + var(--offset-avatar-top));
		margin-left: -1px;
		border: solid var(--color-branch);
		border-width: 0 0 1px 1px;
		border-bottom-left-radius: 8px;
	}

	.comment-editor-container__content {
		min-width: 0;
	}

	:global(.comment-item) .comment-editor-container {
		flex-basis: 100%;
		max-width: 100%;
		margin-top: var(--content-offset-bottom);
		margin-bottom: calc(var(--content-offset-bottom) * -1);
	}

	:global(.comment-item) .comment-editor-container__branches {
		visibility: visible;
	}

	:global(.comment-item) .comment-editor-container__content {
		padding-top: 12px;
		padding-bottom: 18px;
	}

	.comment-editor {
		position: relative;
		z-index: 2;
		display: flex;
		min-height: 48px;
		padding: 12px 11px 11px;
		border: 1px solid rgba(0, 0, 0, 0.03);
		border-radius: 10px;
		background-color: #f7f7f7;
		transition: background-color 0.1s linear, border-color 0.1s linear, box-shadow 0.1s linear;
	}

	.comment-editor--focused {
		border-color: var(--color-blue);
		background-color: #fff;
		box-shadow: 0 0 0 3px rgba(70, 131, 217, 0.12);
	}

	.comment-editor-box {
		position: relative;
		width: 100%;
	}

	.comment-editor-box__placeholder {
		display: none;
		position: absolute;
		top: 0;
		left: 0;
		padding: 0 4px;
		color: var(--text-muted);
		font-size: 16px;
		line-height: 22px;
		pointer-events: none;
	}

	.comment-editor-box--empty .comment-editor-box__placeholder {
		display: block;
	}

	.comment-editor-box__content {
		padding: 0 4px;
		font-size: 16px;
		line-height: 22px;
	}

	.comment-editor-box__input {
		position: relative;
		z-index: 5;
		display: inline-block;
		width: 100%;
		padding-bottom: 3px;
		overflow-wrap: break-word;
		outline: 0;
	}

	.comment-editor-box__input:empty {
		display: block;
	}

	.comment-editor-box__error {
		margin: 8px 0 0;
		color: var(--color-negative);
		font-size: 14px;
		line-height: 20px;
	}

	.comment-editor-box__footer {
		display: flex;
		align-items: center;
		margin-top: 12px;
	}

	.comment-editor-box__attaches {
		display: flex;
		align-items: center;
	}

	.comment-editor-box__attach-btn,
	.comment-editor-box__custom-btn {
		color: inherit;
		font: inherit;
		line-height: inherit;
	}

	.comment-editor-box__attach-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		margin-right: 6px;
		border-radius: 32px;
		cursor: pointer;
	}

	/*
	 * в исходной вёрстке картинка и GIF должны были быть зелёной и фиолетовой
	 * (.icon--v_image / .icon--v_gif), но классы иконок не совпадали и цвета не применялись.
	 * Перенесено фактическое поведение: цветной только рубль.
	 */
	.comment-editor-box__attach-btn--donate {
		color: #447;
	}

	.comment-editor-box__custom-buttons {
		margin-left: auto;
		margin-right: 16px;
	}

	.comment-editor-box__custom-btn {
		color: rgba(0, 0, 0, 0.65);
		cursor: pointer;
	}

	.comment-editor-box__submit {
		--btn-height: 40px;
	}

	@media (max-width: 859px) {
		.comment-editor-box__footer {
			margin: 12px -5px -5px;
		}
	}
</style>
