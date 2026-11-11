<script lang="ts">
	import { scrollBehavior } from '$lib/motion';
	import type { Snippet } from 'svelte';
	import { fromAction } from 'svelte/attachments';
	import { resolve } from '$app/paths';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import { mediaHold } from '$lib/actions/mediaHold';
	import { api } from '$lib/api/index.svelte';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { getPostPath, getPostShareUrl, getProfilePath, openDtfLink, openLightbox, openProfile, preloadLightbox } from '$lib/navigation';
	import { parseDtfUrl, dtfTargetToPath } from '$lib/dtfLinks';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { type AuthorAction, authorMenuItems, ensureLogin, isAnotherDtfUser, isSubsiteMuted, runAuthorAction } from '../actions.svelte';
	import ComplaintDialog from '../ComplaintDialog.svelte';
	import { votesOf } from '$lib/reactions';
	import { themeSettings } from '../themeSettings.svelte';
	import { formatFullDate, formatTime, plural } from '../format';
	import Popover from '../ui/Popover.svelte';
	import { notify } from '../ui/notify.svelte';
	import PostButton from '../post/PostButton.svelte';
	import Rating from '../post/Rating.svelte';
	import Reactions from '../post/Reactions.svelte';
	import UnknownBlock from '../UnknownBlock.svelte';
	import { COMMENT_MEDIA_MAX_HEIGHT, mediaMaxWidth, mediaPreviewUrl } from '../media';
	import { parseCommentText } from './commentText';
	import { commentKey, type CommentRow } from './flatten';
	import { toggleCommentFavorite, toggleCommentReaction, voteComment } from './votes.svelte';
	import { settings, shouldVirtualizeComments } from '$lib/storage/settings.svelte';
	import { getCommentBadge } from '$lib/clientBadge';
	import { filterSettings, matchCommentFilter } from '$lib/storage/filter.svelte';
	import BadgeInfoModal from '../BadgeInfoModal.svelte';

	// Заглушка аватара удалённого комментария из исходной вёрстки
	const REMOVED_AVATAR = 'https://leonardo.osnova.io/04ee6149-5c89-5a20-846d-be172c424736/-/scale_crop/64x64/-/format/webp/';

	let {
		row,
		postAuthorId,
		highlightedLine = -1,
		replying = false,
		canReply = true,
		panObserver,
		onreply,
		onedit,
		onlinehover,
		onlineclick,
		onexpand,
		onparent,
		editor
	}: {
		row: CommentRow;
		/** Автор поста: его комментарии помечаются плашкой «Автор» */
		postAuthorId?: number;
		/** Индекс подсвеченной линии ветки, -1 — нет */
		highlightedLine?: number;
		replying?: boolean;
		/** Писать нельзя (бан, чёрный список): кнопки «Ответить» нет */
		canReply?: boolean;
		panObserver?: IntersectionObserver;
		onreply: () => void;
		/** Открыть редактор с текстом этого комментария */
		onedit: () => void;
		onlinehover: (line: number | null) => void;
		onlineclick: (owner: string) => void;
		onexpand: () => void;
		/** Переход к родительскому комментарию по стрелке */
		onparent?: (key: string) => void;
		/** Редактор ответа (один на все комментарии, рендерит родитель) */
		editor: Snippet<[boolean]>;
	} = $props();

	let itemNode = $state<HTMLElement>();

	$effect(() => {
		if (!panObserver || !itemNode) return;
		const node = itemNode;
		panObserver.observe(node);
		return () => panObserver.unobserve(node);
	});

	let comment = $derived(row.comment);
	let isPostAuthor = $derived(postAuthorId !== undefined && comment.author.id === postAuthorId);
	let hasRepliesBelow = $derived(comment.children.length > 0 && !row.hiddenReplies);
	let votes = $derived(themeSettings.votes);
	let arrowsLeft = $derived(themeSettings.arrowsSide === 'left');
	let paragraphs = $derived(parseCommentText(comment.content));
	let profilePath = $derived(resolve(getProfilePath(comment.author.id) as any));
	// Галерея просмотра — картинки комментария, видео в неё не входят
	let images = $derived((comment.media ?? []).filter((media) => media.type === 'image'));

	let score = $derived(votesOf(comment));
	let clientBadge = $derived(getCommentBadge(comment, settings.value.clientBadges));
	let showAuthorBadge = $derived(clientBadge && (clientBadge.type === 'redtf' || settings.value.mobileBadgesPosition === 'author'));
	let showDateBadge = $derived(clientBadge && clientBadge.type !== 'redtf' && settings.value.mobileBadgesPosition === 'date');
	let filterMatch = $derived(matchCommentFilter(comment));
	// Автор в чёрном списке DTF: сервер отдаёт его комментарии с isIgnored и пустым текстом, а свежую блокировку помним сами
	let muted = $derived(isSubsiteMuted(comment.author.id, !!comment.isIgnored));
	let revealed = $state(false);
	let isFiltered = $derived((muted || !!filterMatch) && !revealed);

	// Голос «за» и «против» — выбранные в настройках реакции; false — голос не принят, анимации клика не будет
	const rate = (vote: 1 | -1) => voteComment(comment, vote);
	const react = (id: number) => toggleCommentReaction(comment, id);

	// Меню комментария: что можно править, сервер говорит при открытии
	let menuOpen = $state(false);
	let canEdit = $state(false);
	// Порядок — как в определениях пунктов меню у DTF: правка, ссылка, жалоба, закладка
	let menuItems = $derived([
		...(canEdit ? [{ value: 'edit' as const, label: 'Редактировать', icon: 'v_pen' }] : []),
		{ value: 'open_dtf' as const, label: 'Открыть на DTF', icon: 'v_external' },
		{ value: 'copy' as const, label: 'Копировать ссылку', icon: 'v_link' },
		...(comment.author.id !== currentUser.value?.id ? [{ value: 'complain' as const, label: 'Пожаловаться', icon: 'v_flag' }] : []),
		...(isAnotherDtfUser(comment.sourceId, comment.author.id) ? authorMenuItems(comment.author, { blocked: !!comment.isIgnored }) : []),
		{
			value: 'favorite' as const,
			label: comment.isFavorited ? 'Убрать из закладок' : 'Добавить в закладки',
			icon: comment.isFavorited ? 'v_bookmark_solid' : 'v_bookmark'
		}
	]);
	let complaining = $state(false);
	let showBadgeModal = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
		if (!menuOpen || !authStorage.isAuthenticated) return;
		api.getCommentControls(comment.id).then((controls) => (canEdit = controls.edit)).catch(() => (canEdit = false));
	}

	function selectMenuItem(item: 'edit' | 'open_dtf' | 'copy' | 'favorite' | 'complain' | AuthorAction) {
		if (item.endsWith('_author')) runAuthorAction(item as AuthorAction, comment.author);
		else if (item === 'edit') onedit();
		else if (item === 'open_dtf') window.open(`https://dtf.ru/${comment.postId}?comment=${comment.id}`, '_blank', 'noopener,noreferrer');
		else if (item === 'copy') copyLink();
		else if (item === 'complain') complaining = ensureLogin();
		else toggleCommentFavorite(comment);
	}

	function scrollToParent(e: MouseEvent) {
		e.preventDefault();
		if (!row.parent) return;
		const key = commentKey(row.parent);
		if (onparent) {
			onparent(key);
		} else {
			const node = document.getElementById(`comment-${key}`);
			if (node) {
				for (const anim of node.getAnimations?.() ?? []) anim.cancel();
				node.style.backgroundColor = 'var(--color-blue-tint, var(--bg-highlight, #e8f3ff))';
				node.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
				node.style.removeProperty('background-color');
				node.animate(
					[{ backgroundColor: 'var(--color-blue-tint, var(--bg-highlight, #e8f3ff))' }, { backgroundColor: 'transparent' }],
					{ duration: 2500, easing: 'ease-out' }
				);
			}
		}
	}

	async function copyLink() {
		const url = getPostShareUrl({ id: comment.postId, sourceId: comment.sourceId }, `comment-${row.key}`);
		try {
			await navigator.clipboard.writeText(url);
			notify.success('Ссылка скопирована');
		} catch {
			notify.error('Не удалось скопировать ссылку');
		}
	}
	let virtualize = $derived(shouldVirtualizeComments());
</script>

{#snippet vote()}
	<div class={['comment-item__vote', { 'comment-item__vote--left': arrowsLeft }]}>
		<Rating
			compact
			value={score.up - score.down}
			myVote={score.myVote}
			reactions={comment.reactions}
			onvote={rate}
			onreact={react}
		/>
	</div>
{/snippet}

{#snippet authorMark()}
	{#if isPostAuthor}
		<span class="comment-item__author-mark">Автор</span>
	{/if}
{/snippet}

{#snippet repliesAction()}
	{#if row.hiddenReplies > 0}
		<button class="comment-item__inline-action" onclick={onexpand}>
			{row.hiddenReplies}&nbsp;{plural(row.hiddenReplies, ['комментарий', 'комментария', 'комментариев'])}
		</button>
	{/if}
{/snippet}

{#if complaining}
	<ComplaintDialog onsubmit={(reasonId) => api.complain('comment', comment.id, reasonId)} onclose={() => (complaining = false)} />
{/if}

{#if showBadgeModal && clientBadge}
	<BadgeInfoModal badge={clientBadge} onclose={() => (showBadgeModal = false)} />
{/if}

<div
	class={['comment-item', { 'comment-item--reply': row.level > 1, 'comment-item--virtual': virtualize }]}
	style:--level={row.level}
	id="comment-{row.key}"
	data-depth={row.level - 1}
	bind:this={itemNode}
>
	<!--
		линии — div, а не button: у кнопки Chrome центрирует содержимое по вертикали
		и дуга ::before съехала бы. Это дублирующее действие мышью, поэтому без фокуса.
	-->
	<div class="comment-item__threads" aria-hidden="true">
		{#each row.lines as line, i}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class={[
					'comment-item__thread-line',
					{
						'comment-item__thread-line--no-border': !line.border,
						'comment-item__thread-line--empty': !line.border && !line.arc,
						'comment-item__thread-line--max-level': i === row.lines.length - 1 && !line.arc,
						'comment-item__thread-line--highlighted': i === highlightedLine
					}
				]}
				title="Свернуть ветку"
				onmouseenter={() => onlinehover(i)}
				onmouseleave={() => onlinehover(null)}
				onclick={() => onlineclick(line.owner)}
			></div>
		{/each}
	</div>

	<div class="comment-item__content">
		{#if comment.isRemoved}
			<div class="comment-item__avatar">
				<div class="comment-item__avatar-image">
					<img src={REMOVED_AVATAR} alt="" />
				</div>
			</div>

			<div class="comment-item__text comment-item__text--deleted">
				<p>{comment.content || 'Комментарий удалён'}</p>
			</div>

			<div class="comment-item__break"></div>
			{@render repliesAction()}
		{:else if isFiltered}
			<div class="comment-item__avatar">
				<div class="comment-item__avatar-image">
					{#if comment.author.avatarUrl}
						<img src={comment.author.avatarUrl} alt="" style="opacity: 0.5;" />
					{/if}
				</div>
			</div>

			<a class="comment-item__author" href={profilePath} onclick={(e) => openProfile(e, comment.author.id)} style="opacity: 0.7;">{comment.author.name}</a>
			{#if showAuthorBadge && clientBadge}
				<button
					type="button"
					class="comment-item__badge comment-item__badge--{clientBadge.type}"
					title={clientBadge.title}
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						showBadgeModal = true;
					}}
				>
					{#if 'icon' in clientBadge}
						<svg class="icon" width="11" height="11" aria-hidden="true">
							<use href="/icons.svg#{clientBadge.icon}"></use>
						</svg>
					{/if}
					<span>{clientBadge.label}</span>
				</button>
			{/if}

			<div class="comment-item__break"></div>

			<a class="comment-item__time" href="#comment-{row.key}">
				<time datetime={comment.createdAt} title={formatFullDate(comment.createdAt)}>{formatTime(comment.createdAt)}</time>
			</a>
			{@render authorMark()}
			{#if showDateBadge && clientBadge && 'icon' in clientBadge}
				<button
					type="button"
					class="comment-item__time-badge"
					title={clientBadge.title}
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						showBadgeModal = true;
					}}
				>
					<svg class="icon icon--{clientBadge.type}" width="10" height="10" aria-hidden="true">
						<use href="/icons.svg#{clientBadge.icon}"></use>
					</svg>
				</button>
			{/if}

			<div class="comment-item__text comment-item__text--filtered">
				<span>
					{#if muted}
						Комментарий скрыт: автор заблокирован
					{:else if filterMatch?.kind === 'user'}
						Комментарий скрыт: вы скрыли автора
					{:else}
						Комментарий скрыт фильтром ({filterMatch?.rule})
					{/if}
				</span>
				<!-- У комментария заблокированного с сервера текста нет, показывать нечего -->
				{#if muted ? !!comment.content : filterSettings.value.mode === 'soft'}
					<button type="button" class="comment-item__reveal-btn" onclick={() => (revealed = true)}>Показать</button>
				{/if}
			</div>

			<div class="comment-item__break"></div>
			{@render repliesAction()}
		{:else}
			<a class="comment-item__avatar" href={profilePath} tabindex="-1" aria-hidden="true" onclick={(e) => openProfile(e, comment.author.id)}>
				<div class="comment-item__avatar-image">
					{#if comment.author.avatarUrl}
						<img src={comment.author.avatarUrl} alt="" />
					{/if}
				</div>
			</a>

			<a class="comment-item__author" href={profilePath} onclick={(e) => openProfile(e, comment.author.id)}>{comment.author.name}</a>
			{#if showAuthorBadge && clientBadge}
				<button
					type="button"
					class="comment-item__badge comment-item__badge--{clientBadge.type}"
					title={clientBadge.title}
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						showBadgeModal = true;
					}}
				>
					{#if 'icon' in clientBadge}
						<svg class="icon" width="11" height="11" aria-hidden="true">
							<use href="/icons.svg#{clientBadge.icon}"></use>
						</svg>
					{/if}
					<span>{clientBadge.label}</span>
				</button>
			{/if}

			{#if row.parent}
				<a class="comment-item__icon-action" href="#comment-{commentKey(row.parent)}" title="Ответ для {row.parent.author.name}" onclick={scrollToParent}>
					<svg class="icon" width="14" height="14" aria-hidden="true">
						<use href="/icons.svg#v_arrow_long_up"></use>
					</svg>
				</a>
			{/if}
			<button type="button" class="comment-item__icon-action" title="Скопировать ссылку" onclick={copyLink}>
				<svg class="icon" width="14" height="14" aria-hidden="true">
					<use href="/icons.svg#v_link"></use>
				</svg>
			</button>

			<div class="comment-item__break"></div>

			<a class="comment-item__time" href="#comment-{row.key}">
				<time datetime={comment.createdAt} title={formatFullDate(comment.createdAt)}>{formatTime(comment.createdAt)}</time>
			</a>
			{@render authorMark()}
			{#if showDateBadge && clientBadge && 'icon' in clientBadge}
				<button
					type="button"
					class="comment-item__time-badge"
					title={clientBadge.title}
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						showBadgeModal = true;
					}}
				>
					<svg class="icon icon--{clientBadge.type}" width="10" height="10" aria-hidden="true">
						<use href="/icons.svg#{clientBadge.icon}"></use>
					</svg>
				</button>
			{/if}

			{#if paragraphs.length}
				<div class="comment-item__text">
					{#each paragraphs as paragraph}
						{#snippet lines()}
							{#each paragraph.lines as line, l}
								{#if l > 0}<br />{/if}
								{#each line as part}
									{#if part.type === 'mention'}
										<a href={resolve(getProfilePath(part.id) as any)} onclick={(e) => openProfile(e, part.id)}>{part.name}</a>
									{:else if part.type === 'link'}
										{@const dtfTarget = parseDtfUrl(part.url)}
										{#if dtfTarget}
											<a
												href={resolve(dtfTargetToPath(dtfTarget) as any)}
												onclick={(e) => openDtfLink(e, part.url)}
												onauxclick={(e) => openDtfLink(e, part.url)}
											>{part.url}</a>
										{:else}
											<a href={part.url} target="_blank" rel="noopener noreferrer nofollow">{part.url}</a>
										{/if}
									{:else}
										{part.text}
									{/if}
								{/each}
							{/each}
						{/snippet}
						{#if paragraph.quote}
							<span class="comment-item__quote">
								<svg class="icon" width="16" height="12" aria-hidden="true">
									<use href="/icons.svg#comment_quote"></use>
								</svg>
								<span class="comment-item__quote-content">{@render lines()}</span>
							</span>
						{:else}
							<p>{@render lines()}</p>
						{/if}
					{/each}
				</div>
			{/if}

			{#if comment.media?.length}
				<div class="comment-item__attaches comment-item__media">
					{#each comment.media as media}
						{#if media.type === 'image' || media.type === 'movie'}
							<figure class="media-figure">
								<div
									class="media-placeholder"
									style:--media-max-w="{mediaMaxWidth(media.data.width, media.data.height, COMMENT_MEDIA_MAX_HEIGHT)}px"
									style:--media-w={media.data.width || 16}
									style:--media-h={media.data.height || 9}
									style:--media-bg={media.data.color ? `#${media.data.color}` : undefined}
									style:--media-preview={mediaPreviewUrl(media.data.base64preview)}
								>
									{#if media.type === 'movie'}
										<video
											src={getLeonardoUrl(media.data.uuid, { format: 'mp4' })}
											muted
											loop
											playsinline
											controls={!!media.data.has_audio}
											{@attach fromAction(lazyVideo)}
											use:mediaHold={{ uuid: media.data.uuid, isGif: media.data?.type === 'gif' }}
										></video>
									{:else}
										<img src={getLeonardoUrl(media.data.uuid, { width: 800 })} alt="" loading="lazy" />
										<button
											type="button"
											class="media-placeholder__zoom"
											aria-label="Открыть изображение"
											onpointerenter={preloadLightbox}
											onclick={(e) =>
												openLightbox(
													images.map((m) => m.data),
													images.indexOf(media),
													e.currentTarget.previousElementSibling as HTMLImageElement
												)}
										></button>
									{/if}
								</div>
							</figure>
						{:else}
							<UnknownBlock type={media.type} postId={comment.postId} commentId={comment.id} sourceId={comment.sourceId} />
						{/if}
					{/each}
				</div>
			{/if}

			{#if votes === 'reactions'}
				<Reactions compact reactions={comment.reactions} onreact={react} />
			{:else if votes === 'likes'}
				<PostButton
					kind="like"
					title="Лайк"
					value={score.up || undefined}
					active={score.myVote === 1}
					reactions={comment.reactions}
					onreact={react}
					onclick={() => rate(1)}
				/>
			{/if}

			{#if votes === 'rating' && arrowsLeft}
				{@render vote()}
			{/if}

			{#if canReply}
				<button type="button" class="comment-item__action" onclick={onreply}>Ответить</button>
			{/if}

			{#if comment.sourceId === 'dtf'}
				<Popover bind:open={menuOpen} items={menuItems} onselect={selectMenuItem} width="max-content" align="left" label="Действия с комментарием">
					<button type="button" class="comment-item__action comment-item__icon-action" title="Больше" aria-expanded={menuOpen} onclick={toggleMenu}>
						<svg class="icon" width="16" height="20" aria-hidden="true">
							<use href="/icons.svg#v_etc"></use>
						</svg>
					</button>
				</Popover>
			{/if}

			<!-- Стрелки стоят в конце строки действий (или перед «Ответить», если слева); на широких экранах поднимаются в строку автора -->
			{#if votes === 'rating' && !arrowsLeft}
				{@render vote()}
			{:else if votes === 'likes'}
				<PostButton
					kind="dislike"
					title="Дизлайк"
					right
					value={score.down || undefined}
					active={score.myVote === -1}
					reactions={comment.reactions}
					onclick={() => rate(-1)}
				/>
			{/if}

			<div class="comment-item__break"></div>
			{@render repliesAction()}

			{#if replying}
				{@render editor(hasRepliesBelow)}
			{/if}
		{/if}
	</div>
</div>

<style>
	.comment-item {
		--offset-right: 0px;
		--size-avatar: 32px;
		--offset-avatar-top: 2px;
		--offset-avatar-right: 10px;
		--content-offset-top: 18px;
		--content-offset-bottom: 3px;
		--gap-details: 5px;
		--gap-footer: 16px;
		--gap-branch: 19px;

		--color-branch-hover: var(--color-blue);
		--color-inline-action: var(--color-blue);
		/* Кнопки лайка в комментарии */
		--post-button-like-margin-right: 16px;
		--post-button-value-weight: 400;

		display: grid;
		grid-template-columns: auto 1fr;
		font-size: 16px;
		line-height: 1.5em;
		/* при прокрутке к комментарию не прятать его под липкой шапкой */
		scroll-margin-top: calc(var(--header-height, 60px) + 8px);
	}

	.comment-item--virtual {
		content-visibility: auto;
		contain-intrinsic-size: auto none auto 72px;
	}

	.comment-item:has(:global(.post-reactions__picker)),
	.comment-item:has(:global(.popover)),
	.comment-item:has(:global(.comment-editor-container)) {
		content-visibility: visible;
		position: relative;
		z-index: 20;
	}

	.comment-item--reply {
		--content-offset-top: 20px;
		--content-offset-bottom: 6px;
	}

	/* Кнопки-пустышки наследуют шрифт и цвет; :where — чтобы не перебивать классы ниже */
	:where(.comment-item button) {
		color: inherit;
		font: inherit;
		text-align: inherit;
	}

	/* Ветки */
	.comment-item__threads {
		display: flex;
		width: calc(var(--gap-branch) * (var(--level) - 1));
	}

	.comment-item__thread-line {
		position: relative;
		flex-shrink: 0;
		width: var(--gap-branch, 0);
		border-left: 1px solid var(--color-branch);
		cursor: pointer;
		user-select: none;
	}

	/* Хитбокс для клика/тапа: расширяет область нажатия влево и вправо на половину шага ветки */
	.comment-item__thread-line::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--gap-branch) * -0.5);
		right: calc(var(--gap-branch) * 0.5);
	}

	/* Дуга от ветки к аватару */
	.comment-item__thread-line:not(.comment-item__thread-line--max-level):last-child::before {
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

	.comment-item__thread-line--no-border {
		border-color: transparent;
	}

	.comment-item__thread-line--empty {
		pointer-events: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.comment-item__thread-line--highlighted:not(.comment-item__thread-line--no-border) {
			border-color: var(--color-branch-hover);
			box-shadow: inset 1px 0 0 0 var(--color-branch-hover);
		}

		.comment-item__thread-line--highlighted:not(.comment-item__thread-line--max-level):last-child::before {
			border-color: var(--color-branch-hover);
			box-shadow: inset 1px -1px 0 0 var(--color-branch-hover);
		}
	}

	/* Содержимое: строки-flex, переносы — через .comment-item__break */
	.comment-item__content {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		flex: 1;
		min-width: 0;
		box-sizing: border-box;
		padding-top: var(--content-offset-top);
		padding-bottom: var(--content-offset-bottom);
	}

	:global(.comments-section.autopan) .comment-item {
		width: max-content;
	}

	:global(.comments-section.autopan) .comment-item__content {
		width: var(--comment-main-width, auto);
		max-width: var(--comment-main-width, 100%);
	}

	.comment-item__avatar,
	.comment-item__avatar img,
	.comment-item__avatar-image {
		flex-shrink: 0;
		width: var(--size-avatar);
		height: var(--size-avatar);
	}

	.comment-item__avatar {
		display: flex;
		align-self: flex-start;
		margin-top: var(--offset-avatar-top);
		margin-right: var(--offset-avatar-right);
		/* аватар занимает две строки: имя и время */
		margin-bottom: calc(var(--size-avatar) * -1);
	}

	.comment-item__avatar-image {
		display: grid;
		overflow: hidden;
		border-radius: 50%;
	}

	.comment-item__avatar img {
		grid-row: 1;
		grid-column: 1;
	}

	.comment-item__author {
		margin-right: var(--gap-details);
		line-height: 20px;
		font-weight: 500;
		white-space: nowrap;
	}

	.comment-item__badge {
		align-self: center;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		height: 16px;
		padding: 0 4px;
		margin-right: var(--gap-details);
		font-size: 11px;
		font-weight: 500;
		line-height: 16px;
		border-radius: 3px;
		user-select: none;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity var(--duration-base, 0.15s);
	}

	.comment-item__badge:hover {
		opacity: 0.85;
	}

	.comment-item__badge .icon {
		display: block;
		flex-shrink: 0;
	}

	.comment-item__badge--redtf {
		font-weight: 700;
		color: var(--color-blue);
		background-color: rgba(70, 131, 217, 0.1);
	}

	.comment-item__badge--android,
	.comment-item__badge--ios {
		color: var(--text-muted);
		background-color: var(--border-subtle, rgba(0, 0, 0, 0.05));
	}

	.comment-item__icon-action {
		margin-right: 6px;
		color: var(--text-muted);
		cursor: pointer;
	}

	.comment-item__vote {
		display: flex;
		margin-left: auto;
	}

	/* На широких экранах стрелки поднимаются в строку автора, к правому краю (как у DTF — через order) */
	@media (min-width: 860px) {
		.comment-item__avatar,
		.comment-item__author,
		.comment-item__icon-action:not(.comment-item__action) {
			order: -2;
		}

		/* Нулевая высота — как у DTF: стрелки центрируются по строке автора и не раздувают её */
		.comment-item__vote {
			order: -1;
			align-items: center;
			height: 0;
			margin: 0 8px 0 auto;
		}
	}

	/* Слева стрелки стоят в строке действий перед «Ответить» на всех ширинах, без подъёма в строку автора */
	.comment-item__vote--left {
		order: 0;
		height: auto;
		margin: 0 16px 0 0;
	}

	.comment-item__icon-action .icon {
		display: block;
	}

	/* На десктопе иконки-ссылки (к родителю, скопировать) скрыты; «⋯» — обычное действие и видно всегда */
	@media (hover: hover) and (pointer: fine) {
		.comment-item__icon-action:not(.comment-item__action) {
			display: none;
		}

		.comment-item:hover .comment-item__icon-action {
			display: flex;
		}
	}

	@media (min-width: 860px) {
		.comment-item {
			--offset-right: 85px;
			--gap-branch: 21px;
		}

		.comment-item__author,
		.comment-item__avatar,
		.comment-item__badge,
		.comment-item__icon-action {
			order: -2;
		}
	}

	.comment-item__break {
		flex-basis: 100%;
	}

	.comment-item__break + .comment-item__time {
		margin-left: calc(var(--size-avatar) + var(--offset-avatar-right));
	}

	.comment-item__time {
		margin-right: var(--gap-details);
		color: var(--text-muted);
		font-size: 12px;
		line-height: 16px;
		white-space: nowrap;
		cursor: pointer;
	}

	.comment-item__time:has(+ .comment-item__time-badge) {
		margin-right: 4px;
	}

	/* Плашка «Автор» стоит в строке времени, как в оригинале: просто синий текст, не ссылка */
	.comment-item__author-mark {
		margin-left: 3px;
		margin-right: var(--gap-details);
		color: var(--color-blue);
		font-size: 12px;
		line-height: 16px;
		white-space: nowrap;
	}

	.comment-item__time-badge {
		display: inline-flex;
		align-items: center;
		margin-right: var(--gap-details);
		color: var(--text-muted);
		opacity: 0.55;
		user-select: none;
		cursor: pointer;
		transition: opacity var(--duration-base, 0.15s);
	}

	.comment-item__time-badge:hover {
		opacity: 0.9;
	}

	.comment-item__time-badge .icon {
		display: block;
	}

	.comment-item__action,
	.comment-item__author,
	.comment-item__time {
		flex: 1;
		min-width: 0;
		max-width: max-content;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Текст */
	.comment-item__text {
		margin-top: 8px;
		margin-bottom: 8px;
		overflow-wrap: break-word;
	}

	.comment-item__attaches,
	.comment-item__text {
		flex-basis: 100%;
		max-width: 100%;
		padding-right: var(--offset-right);
	}

	/* В исходной вёрстке у ссылок в комментариях нет стиля — красим как ссылки в постах */
	.comment-item__text a {
		color: var(--text-link);
	}

	.comment-item__quote {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px;
		padding-top: 5px;
		padding-bottom: 7px;
	}

	.comment-item__quote-content {
		min-width: 0;
	}

	.comment-item__text--deleted {
		flex-basis: 0;
		flex-grow: 1;
	}

	.comment-item__text--deleted p {
		color: var(--text-muted);
	}

	.comment-item__text--filtered {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		color: var(--text-muted);
		font-size: 14px;
	}

	.comment-item__reveal-btn {
		background: none;
		border: none;
		padding: 0;
		color: var(--color-blue, #1976d2);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.comment-item__reveal-btn:hover {
		text-decoration: underline;
	}

	/* Это для альтернативной темы RE как прошлые 2 коммента, НЕ УДАЛЯТЬ ПРИ ПЕРЕРАБОТКЕ */
	/* .comment-item__text--deleted p {
		color: rgba(0, 0, 0, 0.4);
		font-style: italic;
	} */

	/* Вложения */
	.comment-item__attaches {
		display: grid;
		justify-content: start;
		gap: 4px;
		margin-bottom: 14px;
	}

	.comment-item__media {
		grid-template-columns: minmax(0, 400px);
		margin-top: 14px;
	}

	.comment-item__text ~ .comment-item__media {
		margin-top: 2px;
	}

	.media-figure {
		display: flex;
		flex-direction: column;
	}

	.media-placeholder {
		position: relative;
		width: 100%;
		max-width: var(--media-max-w, 100%);
		aspect-ratio: var(--media-w) / var(--media-h);
		background: var(--media-bg);
		overflow: hidden;
	}

	.media-placeholder :is(img, video) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.media-placeholder__zoom {
		position: absolute;
		inset: 0;
		cursor: zoom-in;
	}

	/* Действия */
	.comment-item__action {
		height: 20px;
		margin-right: var(--gap-footer);
		color: var(--text-muted);
		font-size: 15px;
		line-height: 21px;
		white-space: nowrap;
		cursor: pointer;
	}

	.comment-item__inline-action {
		display: flex;
		align-items: center;
		margin-top: 11px;
		color: var(--color-inline-action);
		cursor: pointer;
	}
</style>
