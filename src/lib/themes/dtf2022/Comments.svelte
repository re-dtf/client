<script lang="ts">
	import { scrollBehavior } from '$lib/motion';
	import { tick, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { CommentEditorState, CommentMedia } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import { CommentsLogic } from '$lib/components/Comments/commentsLogic.svelte';
	import { ensureLogin } from './actions.svelte';
	import { formatNumber, plural } from './format';
	import { notify } from './ui/notify.svelte';
	import Popover from './ui/Popover.svelte';
	import Preloader from './ui/Preloader.svelte';
	import CommentEditor from './comments/CommentEditor.svelte';
	import CommentItem from './comments/CommentItem.svelte';
	import CommentRestriction from './comments/CommentRestriction.svelte';
	import { commentKey, flattenComments } from './comments/flatten';
	import { reactionSettings } from '$lib/storage/reactions.svelte';

	let {
		postId,
		sourceId = 'dtf',
		commentsCount = 0,
		subscribed = false,
		postAuthorId,
		commentEditor,
		focusCommentId,
		focusNonce,
		onfocused
	}: {
		postId: number;
		sourceId?: string;
		commentsCount?: number;
		subscribed?: boolean;
		postAuthorId?: number;
		commentEditor?: CommentEditorState;
		focusCommentId?: number;
		focusNonce?: number;
		onfocused?: () => void;
	} = $props();

	let sortings = $derived([
		{ value: 'hotness', label: 'Лучшие' },
		{ value: 'date', label: 'Последние' },
		...(reactionSettings.value.rank ? [{ value: 'worst', label: 'Худшие' }] : [])
	]);

	const logic = new CommentsLogic(() => postId, () => sourceId);

	$effect(() => {
		if (!reactionSettings.value.rank && logic.sorting === 'worst') {
			setSorting('hotness');
		}
	});

	/** Свёрнутые ветки: ключи комментариев, чьи ответы скрыты */
	const collapsed = new SvelteSet<string>();
	let rows = $derived(flattenComments(logic.comments, logic.maxVisualDepth, collapsed));

	const CHUNK_SIZE = 40;
	let renderedCount = $state(CHUNK_SIZE);
	let renderedRows = $derived(rows.slice(0, renderedCount));
	let chunkSentinel = $state<HTMLElement>();

	$effect(() => {
		if (!chunkSentinel) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					untrack(() => {
						renderedCount = Math.min(rows.length, renderedCount + CHUNK_SIZE);
					});
				}
			},
			{ rootMargin: '1000px' }
		);
		observer.observe(chunkSentinel);
		return () => observer.disconnect();
	});

	let replyTo = $state<string | null>(null);
	/** Редактор под комментарием правит его, а не отвечает */
	let editMode = $state(false);
	let draft = $state('');
	let media = $state<CommentMedia[]>([]);
	let donation = $state(0);
	let paymentLink = $state('');
	/** Автор целевого комментария принимает донаты */
	let canDonate = $derived(!editMode && !!replyTo && !!(logic.allCommentsMap.get(replyTo)?.author.isDonationsEnabled));
	/** Подписка на новые комментарии поста (колокольчик): начальное состояние берём из поста */
	// svelte-ignore state_referenced_locally
	let subscribedToComments = $state(subscribed);
	let sending = $state(false);
	let sendError = $state('');
	let sortingOpen = $state(false);
	/** Подсветка ветки: линия line у подряд идущих комментариев from..to */
	let highlight = $state<{ line: number; from: number; to: number } | null>(null);

	let title = $derived(
		commentsCount > 0 ? `${formatNumber(commentsCount)} ${plural(commentsCount, ['комментарий', 'комментария', 'комментариев'])}` : 'Комментарии'
	);

	/** Писать нельзя: ни нового комментария, ни ответа (правка своего остаётся на усмотрение сервера) */
	let blocked = $derived(commentEditor?.enabled === false);

	function setSorting(value: string) {
		if (value === logic.sorting) return;
		logic.sorting = value;
		collapsed.clear();
		logic.loadComments(true);
	}

	function reply(key: string) {
		if (blocked) return;
		if (editMode) clearDraft();
		replyTo = key;
		editMode = false;
		donation = 0;
		sendError = '';
	}

	function clearDraft() {
		draft = '';
		media = [];
		donation = 0;
	}

	function edit(key: string, content: string, attached: CommentMedia[] = []) {
		replyTo = key;
		editMode = true;
		draft = content;
		media = [...attached];
		sendError = '';
	}

	function cancel() {
		if (editMode) clearDraft();
		replyTo = null;
		editMode = false;
		sendError = '';
	}

	/** Новый комментарий, ответ или правка; после отправки показываем результат */
	async function submit() {
		const text = draft.trim();
		if ((!text && media.length === 0) || sending || sourceId !== 'dtf' || (blocked && !editMode) || !ensureLogin()) return;

		sending = true;
		sendError = '';
		paymentLink = '';
		try {
			const target = replyTo ? logic.allCommentsMap.get(replyTo) : undefined;
			let key = replyTo ?? '';
			if (editMode) {
				// Правка без найденного комментария не должна превращаться в новый корневой
				if (!target) throw new Error('Не удалось найти комментарий для правки');
				logic.updateComment(await api.editComment(target.id, postId, text, media));
			} else if (donation > 0) {
				// С донатом комментарий появится после оплаты, поэтому в список его не вставляем
				paymentLink = await api.createDonation(postId, text, target?.id, media, donation);
				clearDraft();
				replyTo = null;
				return;
			} else {
				const created = await api.addComment(postId, text, target?.id, media);
				logic.addComment(created);
				key = commentKey(created);
				renderedCount = Math.max(renderedCount, rows.length);
			}
			clearDraft();
			replyTo = null;
			editMode = false;
			await tick();
			document.getElementById(`comment-${key}`)?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
		} catch (e) {
			sendError = (e as Error).message;
		} finally {
			sending = false;
		}
	}

	async function toggleCommentsSubscription() {
		if (sourceId !== 'dtf' || !ensureLogin()) return;

		const was = subscribedToComments;
		subscribedToComments = !was;
		try {
			await api.setCommentsSubscription(postId, !was);
		} catch (e) {
			subscribedToComments = was;
			notify.error((e as Error).message);
		}
	}

	/** Комментарий из уведомления: догружаем страницы, пока он не найдётся, затем прокручиваем и подсвечиваем */
	let lastFocusKey: string | undefined;
	let lastScrolledKey: string | undefined;
	let refetchAttempted = false;

	function scrollToTarget(key: string) {
		tick().then(() => {
			const targetIndex = rows.findIndex((r) => r.key === key);
			if (targetIndex >= 0 && renderedCount <= targetIndex + 10) {
				renderedCount = Math.min(rows.length, targetIndex + CHUNK_SIZE);
			}
			return tick();
		}).then(() => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					const node = document.getElementById(`comment-${key}`);
					if (!node) return;

					// Раскрываем геометрию предшествующих комментариев, чтобы браузер рассчитал точные высоты до цели
					const list = node.closest('.comments-list');
					if (list) {
						const items = list.querySelectorAll('.comment-item');
						for (const item of items) {
							(item as HTMLElement).style.contentVisibility = 'visible';
							if (item === node) break;
						}
					}
					void node.offsetHeight;

					// Подсвечиваем комментарий сразу, а угасание запускаем только по прибытии скролла
					for (const anim of node.getAnimations?.() ?? []) anim.cancel();
					node.style.backgroundColor = 'var(--color-blue-tint, var(--bg-highlight, #e8f3ff))';
					node.scrollIntoView({ block: 'start', behavior: scrollBehavior() });

					let arrived = false;
					const onArrival = () => {
						if (arrived) return;
						arrived = true;
						window.removeEventListener('scrollend', onArrival);

						// После завершения скролла возвращаем content-visibility: браузер уже сохранил реальные высоты через contain-intrinsic-size: auto
						if (list) {
							const items = list.querySelectorAll('.comment-item');
							for (const item of items) {
								(item as HTMLElement).style.removeProperty('content-visibility');
								if (item === node) break;
							}
						}

						node.style.removeProperty('background-color');
						node.animate(
							[{ backgroundColor: 'var(--color-blue-tint, var(--bg-highlight, #e8f3ff))' }, { backgroundColor: 'transparent' }],
							{ duration: 2500, easing: 'ease-out' }
						);
					};

					window.addEventListener('scrollend', onArrival, { once: true });
					setTimeout(onArrival, 2500);
				});
			});
		});
	}
	$effect(() => {
		if (!focusCommentId) return;

		const currentFocusKey = `${focusCommentId}_${focusNonce ?? 0}`;
		if (currentFocusKey !== lastFocusKey) {
			lastFocusKey = currentFocusKey;
			refetchAttempted = false;
		}

		if (lastScrolledKey === currentFocusKey) return;

		const key = commentKey({ sourceId, id: focusCommentId });
		if (logic.allCommentsMap.has(key)) {
			lastScrolledKey = currentFocusKey;
			const path = logic.pathTo(key);
			if (path) {
				for (const item of path) collapsed.delete(commentKey(item));
			}

			onfocused?.();
			scrollToTarget(key);
		} else if (!logic.loading && logic.hasMore && !logic.error) {
			untrack(() => logic.loadComments());
		} else if (!logic.loading && !refetchAttempted && !logic.error) {
			refetchAttempted = true;
			untrack(() => logic.loadComments(true));
		} else if (!logic.loading) {
			// Комментарий удалён или не найден: дальше искать негде
			lastScrolledKey = currentFocusKey;
			onfocused?.();
		}
	});

	function highlightBranch(index: number, line: number | null) {
		if (line === null) {
			highlight = null;
			return;
		}
		// Ветка тянется вверх и вниз, пока у соседних комментариев есть линия с тем же номером
		let from = index;
		let to = index;
		while (from > 0 && renderedRows[from - 1]?.lines.length > line) from--;
		while (to < renderedRows.length - 1 && renderedRows[to + 1]?.lines.length > line) to++;
		highlight = { line, from, to };
	}

	function collapseBranch(owner: string) {
		highlight = null;
		collapsed.add(owner);
		const node = document.getElementById(`comment-${owner}`);
		if (node && node.getBoundingClientRect().top < 0) node.scrollIntoView({ block: 'start' });
	}
</script>

{#snippet editor(continueBranch = false)}
	<CommentEditor bind:text={draft} bind:media bind:donation {paymentLink} {canDonate} replying editing={editMode} {sending} error={sendError} {continueBranch} oncancel={cancel} onsubmit={submit} />
{/snippet}

<section class="comments-section" id="comments" aria-label="Комментарии">
	<div class="comments-wrapper">
		<div class="comments-header">
			<h2 class="comments-header__title">{title}</h2>

			<div class="comments-header__actions">
				<Popover bind:open={sortingOpen} items={sortings} selected={logic.sorting} onselect={setSorting} label="Сортировка комментариев">
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
				<button
					type="button"
					class={['comments-header__action comments-header__action--bell', { 'comments-header__action--active': subscribedToComments }]}
					title={subscribedToComments ? 'Отписаться от комментариев' : 'Подписаться на комментарии'}
					aria-pressed={subscribedToComments}
					onclick={toggleCommentsSubscription}
				>
					<svg class="icon" width="20" height="20" aria-hidden="true">
						<use href="/icons.svg#{subscribedToComments ? 'bell_solid' : 'v_bell'}"></use>
					</svg>
				</button>
			</div>
		</div>

		<div class="comments-reply-area">
			{#if blocked && !editMode}
				<CommentRestriction text={commentEditor?.text} />
			{:else if replyTo}
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
				<CommentEditor bind:text={draft} bind:media bind:donation {paymentLink} {canDonate} {sending} error={sendError} onsubmit={submit} />
			{/if}
		</div>

		{#if logic.comments.length === 0 && logic.loading}
			<div class="comments-status"><Preloader /></div>
		{:else if logic.comments.length === 0 && !logic.error}
			<p class="comments-status">Комментариев пока нет</p>
		{/if}

		<div class="comments-list">
			{#each renderedRows as row, index (row.key)}
				<CommentItem
					{row}
					{postAuthorId}
					highlightedLine={highlight && index >= highlight.from && index <= highlight.to ? highlight.line : -1}
					replying={replyTo === row.key}
					canReply={!blocked}
					onreply={() => reply(row.key)}
					onedit={() => edit(row.key, row.comment.content, row.comment.media)}
					onlinehover={(line) => highlightBranch(index, line)}
					onlineclick={collapseBranch}
					onexpand={() => collapsed.delete(row.key)}
					onparent={scrollToTarget}
					onpatch={(patch) => logic.patchComment(row.key, patch)}
					{editor}
				/>
			{/each}
			{#if renderedCount < rows.length}
				<div bind:this={chunkSentinel} class="comments-chunk-sentinel" style="height: 1px;"></div>
			{/if}
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
		background-color: var(--bg-card);
		scroll-margin-top: calc(var(--header-height, 60px) + 8px);
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

	.comments-header__action--active {
		color: var(--color-blue);
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
		border: 1px solid var(--border-input);
		border-radius: 10px;
		background-color: var(--bg-tertiary);
		color: inherit;
		font: inherit;
		text-align: inherit;
		cursor: pointer;
	}

	.comment-fake-form__text {
		color: var(--text-subtle);
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
		align-items: center;
		justify-content: center;
		min-height: 35vh;
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
			max-width: min(var(--inner-content-width), calc(100% - 2 * var(--text-gap, 0px)));
		}
	}

	@media (min-width: 720px) {
		.comment-fake-form__button--gif {
			display: none;
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
