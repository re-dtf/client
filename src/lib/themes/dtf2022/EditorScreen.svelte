<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import Editor from '$lib/components/editor/Editor.svelte';
	import { Button, Popover } from './ui';
	import Select from './ui/Select.svelte';
	import PostCard from './post/PostCard.svelte';

	// windowed и barExtra — точки расширения для форков: класс на корне и место в панели рядом с кнопкой закрытия
	let { session, windowed = false, barExtra }: { session: any; windowed?: boolean; barExtra?: Snippet } = $props();

	onMount(() => {
		session.init();
	});

	onDestroy(() => {
		session.destroy();
	});

	const commentOptions = [
		{ value: 'everyone', label: 'Комментарии: всем' },
		{ value: 'only_subscribers', label: 'Комментарии: подписчикам' },
		{ value: 'only_plus', label: 'Комментарии: с плюсом' },
		{ value: 'nobody', label: 'Комментарии: отключены' }
	];

	const subsiteOptions = $derived(session.subsites.map((s: any) => ({ value: s.value, label: s.label })));

	// 0 — заглушка «Загрузка…» / «Нет версий»: выбирать её нельзя
	const historyItems = $derived(
		session.loadingHistory || session.historyVersions.length === 0
			? [{ value: 0, label: session.loadingHistory ? 'Загрузка…' : 'Нет сохранённых версий' }]
			: session.historyVersions.map((v: any) => ({ value: v.id, label: formatDate(v.dateCreated) }))
	);

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Enter в заголовке переносит курсор в текст, а не добавляет строку
	function titleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		session.editorInstance?.caret.setToFirstBlock('start');
	}
</script>

<div class={['writing', { 'writing--window': windowed }]}>
	<div class="writing__bar">
		<button type="button" class="writing__close" aria-label="Закрыть редактор" onclick={session.goBack}>
			<svg class="icon" width="24" height="24" aria-hidden="true">
				<use href="/icons.svg#v_close"></use>
			</svg>
		</button>

		{@render barExtra?.()}

		<span class="writing__status" aria-live="polite">{session.saveMessage}</span>

		{#if session.postId}
			<Popover
				bind:open={() => session.showHistory, (open) => !open && session.showHistory && session.toggleHistory()}
				items={historyItems}
				onselect={(id) => id && session.loadVersion(id)}
				width={220}
				label="История черновика"
			>
				<button type="button" class="writing__icon-button" aria-label="История изменений" onclick={session.toggleHistory}>
					<svg class="icon" width="24" height="24" aria-hidden="true">
						<use href="/icons.svg#v_history"></use>
					</svg>
				</button>
			</Popover>
		{/if}

		<div class="writing__publish">
			<Button variant="blue" label="Опубликовать" disabled={session.isSaving} onclick={session.publish} />
		</div>
	</div>

	<div class="writing__settings">
		{#if subsiteOptions.length > 0}
			<div class="writing__subsite">
				<Select bind:value={session.selectedSubsiteId} options={subsiteOptions} placeholder="Выберите подсайт" searchable />
			</div>
		{/if}

		<div class="writing__comments">
			<!-- Сессия читает право из события выбора, поэтому значение отдаём в том же виде -->
			<Select
				bind:value={
					() => session.commentPermission,
					(value) => session.updateCommentPermission({ target: { value } } as unknown as Event)
				}
				options={commentOptions}
				placeholder="Кто может комментировать"
			/>
		</div>

		<label class="writing__adult">
			<input type="checkbox" bind:checked={session.isAdult} />
			<span class={['ui-checkbox', { 'ui-checkbox--checked': session.isAdult }]}></span>
			18+
		</label>
	</div>

	<div class="writing__body">
		<textarea class="writing__title" rows="1" placeholder="Заголовок" bind:value={session.title} onkeydown={titleKeydown}></textarea>

		<Editor bind:editorInstance={session.editorInstance} initialData={session.initialData} onChange={session.queueSave} />

		{#if session.repostOf}
			<div class="writing__repost">
				<PostCard post={session.repostOf} embed subscribe={false} />
			</div>
		{/if}
	</div>
</div>

<style>
	/* В 2023 редактор открывался на всю страницу (vuePopupFullpage), поверх всего остального */
	.writing {
		position: fixed;
		inset: 0;
		z-index: 1;
		display: flex;
		flex-direction: column;
		overflow-x: hidden;
		overflow-y: auto;
		background-color: var(--bg-card);
		color: var(--text-primary);
	}

	.writing__bar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
		min-height: 56px;
		padding: 8px 16px;
		box-sizing: border-box;
		border-bottom: 1px solid var(--border-color);
		background-color: var(--bg-card);
	}

	.writing__close,
	.writing__icon-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 8px;
		color: var(--text-primary);
		opacity: 0.5;
		cursor: pointer;
	}

	.writing__close:hover,
	.writing__icon-button:hover {
		opacity: 1;
	}

	.writing__status {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		color: var(--text-muted);
		font-size: 14px;
		text-align: right;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.writing__publish {
		--btn-height: 40px;
		--btn-offset: 20px;
	}

	.writing__settings {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px 20px;
		width: 100%;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 16px 16px 0;
		box-sizing: border-box;
	}

	/* Два селектора и «18+» должны помещаться в колонку 608px (640 минус поля) в одну строку */
	.writing__subsite {
		flex: 0 1 220px;
		min-width: 160px;
	}

	.writing__comments {
		flex: 0 1 280px;
		min-width: 200px;
	}

	.writing__adult {
		position: relative;
		display: flex;
		align-items: center;
		font-size: 16px;
		cursor: pointer;
	}

	/* Настоящий input остаётся для клавиатуры и экранных читалок, рисуется .ui-checkbox */
	.writing__adult input {
		position: absolute;
		opacity: 0;
	}

	/* ui-checkbox из CSS DTF: 17px + рамка, галочка двумя границами */
	.ui-checkbox {
		position: relative;
		box-sizing: content-box;
		display: inline-block;
		width: 17px;
		height: 17px;
		margin-right: 0.4em;
		border: 1px solid var(--border-checkbox);
		border-top-color: var(--border-checkbox-top);
		border-radius: 4px;
		vertical-align: text-bottom;
	}

	.ui-checkbox:hover {
		border-color: var(--border-checkbox-hover);
	}

	.ui-checkbox--checked::before {
		content: '';
		position: absolute;
		top: 24%;
		left: 20%;
		width: 8px;
		height: 4px;
		border-bottom: 2px solid var(--text-primary);
		border-left: 2px solid var(--text-primary);
		transform: rotate(-45deg);
	}

	.writing__adult input:focus-visible + .ui-checkbox {
		outline: 2px solid var(--color-blue);
		outline-offset: 2px;
	}

	.writing__body {
		width: 100%;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 16px 16px 120px;
		box-sizing: border-box;
	}

	/* Исходный пост только для контекста: по нему нельзя ни кликнуть, ни проголосовать */
	.writing__repost {
		pointer-events: none;
	}

	.writing__title {
		display: block;
		width: 100%;
		min-height: 44px;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 32px;
		font-weight: 500;
		line-height: 40px;
		outline: none;
		resize: none;
		overflow: hidden;
		field-sizing: content;
	}

	.writing__title::placeholder {
		color: var(--text-placeholder);
	}

	@media (max-width: 859px) {
		.writing__body {
			padding-left: 0;
			padding-right: 0;
		}

		.writing__title {
			padding: 0 15px;
			box-sizing: border-box;
			font-size: 26px;
			line-height: 34px;
		}
	}

	/*
	 * Стили блоков редактора из основного CSS DTF (март 2023): правила `.writing …` и `.ce-*`.
	 * Саму оболочку страницы в архиве не сохранили, она восстановлена по соседним частям темы.
	 */
	.writing :global(.editor-container) {
		min-height: 300px;
		padding: 0;
		background: transparent;
		border-radius: 0;
	}

	.writing :global(.ce-block__content),
	.writing :global(.ce-toolbar__content) {
		max-width: none;
	}

	.writing :global(.codex-editor__redactor) {
		margin-right: 0;
	}

	.writing :global(.ce-paragraph) {
		font-size: 17px;
		line-height: 26px;
	}

	.writing :global(.ce-redactor b),
	.writing :global(.ce-redactor strong) {
		font-weight: 700;
	}

	.writing :global(.ce-redactor i),
	.writing :global(.ce-redactor em) {
		font-style: italic;
	}

	.writing :global(.ce-redactor a) {
		padding-bottom: 0;
		border-bottom: 1px solid var(--border-link);
		color: var(--text-link);
	}

	.writing :global(.ce-paragraph::before),
	.writing :global(.ce-header::before),
	.writing :global(.cdx-input::before),
	.writing :global(.cdx-gallery__caption::before),
	.writing :global(.cdx-image__caption::before),
	.writing :global(.ce-quote--text::before),
	.writing :global(.ce-quote--author::before),
	.writing :global(.ce-quote--job::before),
	.writing :global(.cdx-image-form__button) {
		color: var(--text-placeholder) !important;
	}

	.writing :global(h2.ce-header),
	.writing :global(h3.ce-header),
	.writing :global(h4.ce-header) {
		font-size: 27px;
	}

	.writing :global(.marked-text) {
		padding: 0.09em 0;
		background: var(--bg-editor-dragover);
	}

	.writing :global(.cdx-image-form),
	.writing :global(.cdx-gallery__select-file) {
		border: 2px dashed var(--border-editor-dragover);
	}

	.writing :global(.cdx-gallery__select-file) {
		color: var(--text-placeholder);
	}

	.writing :global(.cdx-image--backgrounded) {
		background: var(--bg-editor-dragover-preview);
	}

	@media (max-width: 859px) {
		.writing :global(.ce-toolbar__content) {
			padding: 1px !important;
		}

		.writing :global(.ce-block__content) {
			padding: 1px 15px !important;
			word-break: break-word;
		}
	}
</style>
