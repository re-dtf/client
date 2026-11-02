<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { CommentMedia, GifResult, UploadResult } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import { getLeonardoUrl } from '$lib/api/utils';
	import Button from '../ui/Button.svelte';
	import Preloader from '../ui/Preloader.svelte';
	import { notify } from '../ui/notify.svelte';
	import DonateAttacher from './DonateAttacher.svelte';
	import { formatDonation } from './donation';
	import GifPicker from './GifPicker.svelte';

	let {
		text = $bindable(''),
		media = $bindable([]),
		donation = $bindable(0),
		paymentLink = '',
		replying = false,
		editing = false,
		sending = false,
		error = '',
		oncancel,
		onsubmit
	}: {
		/** Черновик живёт у родителя — переживает переезд редактора между комментариями */
		text?: string;
		/** Вложения: картинки и гифки */
		media?: CommentMedia[];
		/** Сумма доната, ₽; больше нуля — комментарий появится после оплаты */
		donation?: number;
		/** Ссылка на оплату после «Отправить» с донатом */
		paymentLink?: string;
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
	let isEmpty = $derived(!text.trim() && media.length === 0);
	let submitLabel = $derived(editing ? 'Сохранить' : donation > 0 ? `Оплатить ${formatDonation(donation)}` : replying ? 'Ответить' : 'Отправить');
	let placeholder = $derived(replying ? 'Написать ответ...' : 'Написать комментарий...');

	/** Вложение из ответа загрузчика: те же поля, что у media комментария */
	function mediaOf(upload: UploadResult): CommentMedia {
		const { uuid, width = 0, height = 0, size = 0, type = '', color } = upload;
		return { type: type === 'movie' ? 'movie' : 'image', data: { uuid, width, height, size, type, color } };
	}

	let uploading = $state(false);
	let fileInput = $state<HTMLInputElement>();

	async function upload(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;

		uploading = true;
		try {
			media = [...media, mediaOf(await api.uploadMedia(file))];
		} catch (err) {
			notify.error((err as Error).message);
		} finally {
			uploading = false;
		}
	}

	let gifsOpen = $state(false);

	function addGif(gif: GifResult) {
		media = [...media, gif.media];
		gifsOpen = false;
	}

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

				{#if donation > 0}
					<div class="donate-attachment">
						<div class="donate-attachment__sum">{formatDonation(donation)}</div>
						<button type="button" class="donate-attachment__remove" aria-label="Убрать донат" onclick={() => (donation = 0)}>
							<svg class="icon" width="16" height="16" aria-hidden="true">
								<use href="/icons.svg#v_close"></use>
							</svg>
						</button>
					</div>
				{/if}

				{#if media.length > 0 || uploading}
					<div class="comment-editor-box__media">
						{#each media as item, index (item.data.uuid + index)}
							<div class="comment-editor-box__media-item">
								<img src={getLeonardoUrl(item.data.uuid, { width: 160 })} alt="" />
								<button type="button" class="comment-editor-box__media-remove" aria-label="Убрать вложение" onclick={() => (media = media.filter((_, i) => i !== index))}>×</button>
							</div>
						{/each}
						{#if uploading}<Preloader />{/if}
					</div>
				{/if}

				{#if paymentLink}
					<p class="comment-editor-box__payment">
						Комментарий появится после оплаты: <a href={paymentLink} target="_blank" rel="noopener noreferrer">перейти к оплате</a>
					</p>
				{/if}

				{#if error}
					<p class="comment-editor-box__error" role="alert">{error}</p>
				{/if}

				<div class="comment-editor-box__footer">
						<div class="comment-editor-box__attaches">
						<input bind:this={fileInput} type="file" accept="image/*" hidden onchange={upload} />
						<button type="button" class="comment-editor-box__attach-btn comment-editor-box__attach-btn--image" aria-label="Прикрепить картинку" disabled={uploading} onclick={() => fileInput?.click()}>
							<svg class="icon" width="20" height="20" aria-hidden="true">
								<use href="/icons.svg#v_image"></use>
							</svg>
						</button>
						<button type="button" class="comment-editor-box__attach-btn comment-editor-box__attach-btn--gif" aria-label="Прикрепить GIF" aria-expanded={gifsOpen} onclick={() => (gifsOpen = true)}>
							<svg class="icon" width="20" height="20" aria-hidden="true">
								<use href="/icons.svg#v_gif"></use>
							</svg>
						</button>
						{#if !editing}
							<DonateAttacher attached={donation > 0} onattach={(amount) => (donation = amount)} />
						{/if}
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

{#if gifsOpen}
	<GifPicker onpick={addGif} onclose={() => (gifsOpen = false)} />
{/if}

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

	.comment-editor-box__media {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}

	.comment-editor-box__media-item {
		position: relative;
		height: 72px;
	}

	.comment-editor-box__media-item img {
		display: block;
		height: 100%;
		border-radius: 6px;
	}

	.comment-editor-box__media-remove {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background-color: rgba(0, 0, 0, 0.6);
		color: #fff;
		line-height: 20px;
		cursor: pointer;
	}

	.comment-editor-box__payment {
		margin: 8px 0 0;
		font-size: 14px;
		line-height: 20px;
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

	/* Цвета иконок вложений — как у DTF */
	.comment-editor-box__attach-btn--image {
		color: #2ea83a;
	}

	.comment-editor-box__attach-btn--gif {
		color: #6f77c3;
	}

	@media (hover: hover) {
		.comment-editor-box__attach-btn:hover {
			background-color: #f2f2f2;
		}
	}

	/* Прикреплённый донат: фиолетовая плашка с суммой над панелью */
	.donate-attachment {
		display: flex;
		align-items: center;
		width: fit-content;
		height: 24px;
		margin-top: 8px;
		padding-left: 12px;
		padding-right: 6px;
		border-radius: 5px;
		background: #447;
		box-shadow: 0 1px 2px rgba(68, 68, 119, 0.28), inset 0 -1px 0 rgba(0, 0, 0, 0.12);
	}

	.donate-attachment__sum {
		color: #fff;
		font-size: 12px;
		font-weight: 500;
		line-height: 18px;
	}

	.donate-attachment__remove {
		margin-left: 5px;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
	}

	.donate-attachment__remove .icon {
		display: block;
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
