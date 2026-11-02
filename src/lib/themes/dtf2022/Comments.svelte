<script lang="ts">
	import { tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { api } from '$lib/api/index.svelte';
	import { CommentsLogic } from '$lib/components/Comments/commentsLogic.svelte';
	import { ensureLogin } from './actions.svelte';
	import { formatNumber, plural } from './format';
	import Popover from './ui/Popover.svelte';
	import Preloader from './ui/Preloader.svelte';
	import CommentEditor from './comments/CommentEditor.svelte';
	import CommentItem from './comments/CommentItem.svelte';
	import { commentKey, flattenComments } from './comments/flatten';

	let {
		postId,
		sourceId = 'dtf',
		commentsCount = 0
	}: { postId: number; sourceId?: string; commentsCount?: number } = $props();

	const SORTINGS = [
		{ value: 'hotness', label: 'Лучшие' },
		{ value: 'date', label: 'Последние' }
	];

	const logic = new CommentsLogic(() => postId, () => sourceId);

	/** Свёрнутые ветки: ключи комментариев, чьи ответы скрыты */
	const collapsed = new SvelteSet<string>();
	let rows = $derived(flattenComments(logic.comments, logic.maxVisualDepth, collapsed));

	let replyTo = $state<string | null>(null);
	/** Редактор под комментарием правит его, а не отвечает */
	let editMode = $state(false);
	let draft = $state('');
	let sending = $state(false);
	let sendError = $state('');
	let sortingOpen = $state(false);
	/** Подсветка ветки: линия line у подряд идущих комментариев from..to */
	let highlight = $state<{ line: number; from: number; to: number } | null>(null);

	let title = $derived(
		commentsCount > 0 ? `${formatNumber(commentsCount)} ${plural(commentsCount, ['комментарий', 'комментария', 'комментариев'])}` : 'Комментарии'
	);

	function setSorting(value: string) {
		if (value === logic.sorting) return;
		logic.sorting = value;
		collapsed.clear();
		logic.loadComments(true);
	}

	function reply(key: string) {
		if (editMode) draft = '';
		replyTo = key;
		editMode = false;
		sendError = '';
	}

	function edit(key: string, content: string) {
		replyTo = key;
		editMode = true;
		draft = content;
		sendError = '';
	}

	function cancel() {
		if (editMode) draft = '';
		replyTo = null;
		editMode = false;
		sendError = '';
	}

	/** Новый комментарий, ответ или правка; после отправки показываем результат */
	async function submit() {
		const text = draft.trim();
		if (!text || sending || sourceId !== 'dtf' || !ensureLogin()) return;

		sending = true;
		sendError = '';
		try {
			const target = replyTo ? logic.allCommentsMap.get(replyTo) : undefined;
			let key = replyTo ?? '';
			if (editMode && target) {
				logic.updateComment(await api.editComment(target.id, postId, text));
			} else {
				const created = await api.addComment(postId, text, target?.id);
				logic.addComment(created);
				key = commentKey(created);
			}
			draft = '';
			replyTo = null;
			editMode = false;
			await tick();
			document.getElementById(`comment-${key}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		} catch (e) {
			sendError = (e as Error).message;
		} finally {
			sending = false;
		}
	}

	function highlightBranch(index: number, line: number | null) {
		if (line === null) {
			highlight = null;
			return;
		}
		// Ветка тянется вверх и вниз, пока у соседних комментариев есть линия с тем же номером
		let from = index;
		let to = index;
		while (from > 0 && rows[from - 1].lines.length > line) from--;
		while (to < rows.length - 1 && rows[to + 1].lines.length > line) to++;
		highlight = { line, from, to };
	}

	function collapseBranch(owner: string) {
		highlight = null;
		collapsed.add(owner);
		const node = document.getElementById(`comment-${owner}`);
		if (node && node.getBoundingClientRect().top < 0) node.scrollIntoView({ block: 'start' });
	}
</script>

{#snippet editor()}
	<CommentEditor bind:text={draft} replying editing={editMode} {sending} error={sendError} oncancel={cancel} onsubmit={submit} />
{/snippet}

<section class="comments-section" id="comments" aria-label="Комментарии">
	<div class="comments-wrapper">
		<div class="comments-header">
			<h2 class="comments-header__title">{title}</h2>

			<div class="comments-header__actions">
				<Popover bind:open={sortingOpen} items={SORTINGS} selected={logic.sorting} onselect={setSorting} label="Сортировка комментариев">
					<button
						type="button"
						class="comments-header__action"
						aria-label="Сортировка"
						aria-expanded={sortingOpen}
						onclick={() => (sortingOpen = !sortingOpen)}
					>
						<svg class="icon" width="20" height="20" aria-hidden="true">
							<use href="/icons.svg#v_block_set"></use>
						</svg>
					</button>
				</Popover>
				<!-- ponytail: подписки на комментарии в API клиента пока нет -->
				<button type="button" class="comments-header__action comments-header__action--bell" title="Подписаться на комментарии">
					<svg class="icon" width="20" height="20" aria-hidden="true">
						<use href="/icons.svg#v_bell"></use>
					</svg>
				</button>
			</div>
		</div>

		<div class="comments-reply-area">
			{#if replyTo}
				<button type="button" class="comment-fake-form" onclick={cancel}>
					<span class="comment-fake-form__text">Написать комментарий...</span>
					<span class="comment-fake-form__buttons" aria-hidden="true">
						<span class="comment-fake-form__button">
							<svg class="icon" width="20" height="20"><use href="/icons.svg#v_image"></use></svg>
						</span>
						<span class="comment-fake-form__button comment-fake-form__button--gif">
							<svg class="icon" width="20" height="20"><use href="/icons.svg#v_gif"></use></svg>
						</span>
						<span class="comment-fake-form__button">
							<svg class="icon" width="20" height="20"><use href="/icons.svg#v_rouble"></use></svg>
						</span>
					</span>
				</button>
			{:else}
				<CommentEditor bind:text={draft} {sending} error={sendError} onsubmit={submit} />
			{/if}
		</div>

		{#if logic.comments.length === 0 && logic.loading}
			<div class="comments-status"><Preloader /></div>
		{:else if logic.comments.length === 0 && !logic.error}
			<p class="comments-status">Комментариев пока нет</p>
		{/if}

		<div class="comments-list">
			{#each rows as row, index (row.key)}
				<CommentItem
					{row}
					highlightedLine={highlight && index >= highlight.from && index <= highlight.to ? highlight.line : -1}
					replying={replyTo === row.key}
					onreply={() => reply(row.key)}
					onedit={() => edit(row.key, row.comment.content)}
					onlinehover={(line) => highlightBranch(index, line)}
					onlineclick={collapseBranch}
					onexpand={() => collapsed.delete(row.key)}
					{editor}
				/>
			{/each}
		</div>

		{#if logic.error}
			<p class="comments-status comments-status--error">{logic.error}</p>
		{/if}

		<div class="comments-more" bind:this={logic.observerElement}>
			{#if logic.loading && logic.comments.length > 0}
				<Preloader />
			{/if}
		</div>
	</div>
</section>

<style>
	.comments-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 1020px;
		/* внутри обёртки PostContent (блок, а не flex) — центрируем сами */
		margin: 28px auto 0;
		padding: 32px 0;
		background-color: #fff;
	}

	.comments-wrapper {
		width: 100%;
		margin-left: auto;
		margin-right: auto;
	}

	/* Шапка */
	.comments-header {
		display: flex;
		align-items: center;
		margin-top: 2px;
		margin-bottom: 14px;
	}

	.comments-header__title {
		margin-right: auto;
		font-size: 20px;
		line-height: 1.4em;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.comments-header__actions {
		display: grid;
		grid-auto-flow: column;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
		margin-right: 18px;
	}

	.comments-header__action {
		color: inherit;
		cursor: pointer;
		user-select: none;
	}

	.comments-header__action .icon {
		display: block;
	}

	.comments-header__action--bell .icon {
		transform-origin: 50% 0;
		transition: transform 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.5);
	}

	/* Форма комментария */
	.comments-reply-area {
		margin-top: 28px;
		margin-bottom: 10px;
	}

	.comment-fake-form {
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		height: 48px;
		padding: 0 17px 0 15px;
		border: 1px solid rgba(0, 0, 0, 0.03);
		border-radius: 10px;
		background-color: #f7f7f7;
		color: inherit;
		font: inherit;
		text-align: inherit;
		cursor: pointer;
	}

	.comment-fake-form__text {
		color: rgba(0, 0, 0, 0.65);
		line-height: 1.5em;
	}

	.comment-fake-form__buttons {
		display: flex;
		align-items: center;
	}

	.comment-fake-form__button:not(:last-child) {
		margin-right: 14px;
	}

	.comment-fake-form__button .icon {
		display: block;
	}

	/* Статусы — в исходной вёрстке их нет */
	.comments-status {
		display: flex;
		justify-content: center;
		padding: 24px 0;
		color: var(--text-muted);
	}

	.comments-status--error {
		color: var(--color-negative);
	}

	.comments-more {
		display: flex;
		justify-content: center;
		min-height: 24px;
		padding-top: 16px;
	}

	@media (min-width: 640px) {
		.comments-section {
			border-radius: 8px;
		}

		.comments-wrapper {
			width: 600px;
		}
	}

	@media (min-width: 720px) {
		.comment-fake-form__button--gif {
			display: none;
		}
	}

	@media (min-width: 1560px) {
		.comments-wrapper {
			width: 640px;
		}
	}

	@media (max-width: 859px) {
		.comments-section {
			margin-top: 20px;
			padding: 20px 0;
		}

		.comments-header {
			margin-top: 0;
			margin-bottom: 2px;
		}

		.comments-header__actions {
			margin-right: 0;
		}

		.comments-reply-area {
			margin-top: 20px;
			margin-bottom: 6px;
		}
	}

	@media (max-width: 639px) {
		.comments-wrapper {
			padding-left: 16px;
			padding-right: 16px;
		}
	}
</style>
