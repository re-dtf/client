<script lang="ts">
	import { fromAction } from 'svelte/attachments';
	import { resolve } from '$app/paths';
	import { openExternalUrl } from '$lib/capacitor';
	import { animatedAvatar } from '$lib/actions/animatedAvatar.svelte';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import MediaGate from '$lib/components/MediaGate.svelte';
	import { mediaContextMenu } from '$lib/actions/mediaContextMenu';
	import { preloadIntent } from '$lib/actions/preloadIntent';
	import { api } from '$lib/api/index.svelte';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import type { Comment, CommentUpdate } from '$lib/api/types';
	import { getLeonardoUrl, isAnimatedMedia, isGifMedia } from '$lib/api/utils';
	import { getCommentBadge } from '$lib/clientBadge';
	import { dtfTargetToPath, parseDtfUrl } from '$lib/dtfLinks';
	import { getPostPath, getPostShareUrl, getProfilePath, openDtfLink, openLightbox, openPost, openProfile, preloadLightbox } from '$lib/navigation';
	import { votesOf } from '$lib/reactions';
	import { filterSettings, matchCommentFilter } from '$lib/storage/filter.svelte';
	import { settings } from '$lib/storage/settings.svelte';
	import { authorZoneMenu, ensureLogin, profileContextMenu } from '../actions.svelte';
	import BadgeInfoModal from '../BadgeInfoModal.svelte';
	import { parseCommentText, type TextSegment } from './commentText';
	import { toggleCommentFavorite, toggleCommentReaction, voteComment } from './votes.svelte';
	import ComplaintDialog from '../ComplaintDialog.svelte';
	import { formatFullDate, formatTime } from '../format';
	import PostButton from '../post/PostButton.svelte';
	import Rating from '../post/Rating.svelte';
	import Reactions from '../post/Reactions.svelte';
	import { themeSettings } from '../themeSettings.svelte';
	import BookmarkGhost from '../ui/BookmarkGhost.svelte';
	import { notify } from '../ui/notify.svelte';
	import PlusBadge from '../ui/PlusBadge.svelte';
	import Popover from '../ui/Popover.svelte';
	import UnknownBlock from '../UnknownBlock.svelte';

	/** Единая карточка комментария: используется в глобальном поиске и в профиле темы redtf */
	let { comment }: { comment: Comment } = $props();

	// Закладки и оценки правят локальную копию: списки поиска и профиля лежат в $state.raw. Новый comment её сбрасывает
	let item = $derived(comment);
	const onpatch = (update: CommentUpdate) => (item = { ...item, ...(typeof update === 'function' ? update(item) : update) });

	let filterMatch = $derived(matchCommentFilter(item));
	let revealed = $state(false);
	let isFiltered = $derived(!!filterMatch && !revealed);

	let menuOpen = $state(false);
	let pickerOpen = $state(false);
	let complaining = $state(false);
	let showBadgeModal = $state(false);

	let votes = $derived(themeSettings.votes);

	// Закладка как chunk.bookmark.vue: подсветка гаснет после клика до ухода мыши, при добавлении вспыхивает «призрак»
	let bookmarkPressed = $state(false);
	let bookmarkGhost = $state(0);
	function toggleBookmark() {
		const was = !!item.isFavorited;
		toggleCommentFavorite(item, onpatch, true);
		bookmarkPressed = true;
		if (!was && item.isFavorited) bookmarkGhost++;
	}
	let arrowsLeft = $derived(votes === 'rating' && themeSettings.arrowsSide === 'left');
	let post = $derived({ id: item.postId, sourceId: item.sourceId });
	let postPath = $derived(resolve(getPostPath(post) as any));
	let commentPath = $derived(resolve(getPostPath(post, item.id) as any));
	let commentUrl = $derived(getPostShareUrl(post, `comment-${item.sourceId}_${item.id}`));

	let clientBadge = $derived(getCommentBadge(item, settings.value.clientBadges));
	let showAuthorBadge = $derived(clientBadge && (clientBadge.type === 'redtf' || settings.value.mobileBadgesPosition === 'author'));
	let showDateBadge = $derived(clientBadge && clientBadge.type !== 'redtf' && settings.value.mobileBadgesPosition === 'date');

	let paragraphs = $derived(parseCommentText(item.searchSnippet || item.content));
	let images = $derived((item.media ?? []).filter((media) => media.type === 'image' && !isAnimatedMedia(media)));
	const thumbEls: Record<string, HTMLImageElement | undefined> = {};
	let score = $derived(votesOf(item));
	let onreact = $derived(item.sourceId === 'dtf' ? (id: number) => toggleCommentReaction(item, id, onpatch) : undefined);
	const onopenchange = (open: boolean) => (pickerOpen = open);

	let menuItems = $derived([
		{ value: 'copy' as const, label: 'Копировать ссылку', icon: 'v_link' },
		...(item.sourceId === 'dtf' ? [{ value: 'open_dtf' as const, label: 'Открыть на DTF', icon: 'v_external' }] : []),
		...(item.sourceId === 'dtf' && item.author.id !== currentUser.value?.id
			? [{ value: 'complain' as const, label: 'Пожаловаться', icon: 'v_flag', group: 'moderation' }]
			: [])
	]);

	async function selectMenuItem(action: 'open_dtf' | 'copy' | 'complain') {
		if (action === 'open_dtf') {
			openExternalUrl(`https://dtf.ru/${item.postId}?comment=${item.id}`);
			return;
		}
		if (action === 'complain') {
			complaining = ensureLogin();
			return;
		}
		try {
			await navigator.clipboard.writeText(commentUrl);
			notify.success('Ссылка скопирована');
		} catch {
			notify.error('Не удалось скопировать ссылку');
		}
	}
</script>

{#snippet marked(parts: TextSegment[] | undefined, fallback: string)}
	{#if parts}{#each parts as seg}{#if seg.mark}<mark>{seg.text}</mark>{:else}{seg.text}{/if}{/each}{:else}{fallback}{/if}
{/snippet}

{#if complaining}
	<ComplaintDialog onsubmit={(reasonId) => api.complain('comment', item.id, reasonId)} onclose={() => (complaining = false)} />
{/if}

{#if showBadgeModal && clientBadge}
	<BadgeInfoModal badge={clientBadge} onclose={() => (showBadgeModal = false)} />
{/if}

{#if isFiltered}
	{#if (filterMatch?.mode ?? filterSettings.value.mode) === 'soft'}
		<article class="comment-card comment-card--filtered">
			<span class="comment-card__filtered-text">Комментарий скрыт фильтром ({filterMatch?.rule})</span>
			<button type="button" class="comment-card__reveal-btn" onclick={() => (revealed = true)}>Показать</button>
		</article>
	{/if}
{:else}
	<article class={['comment-card', { 'comment-card--elevated': menuOpen || pickerOpen }]}>
		{#if item.postTitle}
			<a class="comment-card__post-title" href={postPath} onclick={(e) => openPost(e, post)} use:preloadIntent={post}>{item.postTitle}</a>
		{/if}

		<div class="comment-card__meta" {@attach authorZoneMenu(() => item.author)}>
			<a class="comment-card__owner" href={resolve(getProfilePath(item.author.id) as any)} onclick={(e) => openProfile(e, item.author.id)} {@attach profileContextMenu(item.author)}>
				{#if item.author.avatarUrl}
					<img class="comment-card__avatar" src={item.author.avatarUrl} alt="" loading="lazy" {@attach animatedAvatar(item.author.avatarUrl)} />
				{/if}
				<span class="comment-card__author">{item.author.name}</span>
			</a>
			{#if item.author.isPlus}
				<span class="comment-card__plus"><PlusBadge author={item.author} size={16} /></span>
			{/if}
			{#if showAuthorBadge && clientBadge}
				<button
					type="button"
					class="comment-card__badge comment-card__badge--{clientBadge.type}"
					title={clientBadge.title}
					onclick={() => (showBadgeModal = true)}
				>
					{#if 'icon' in clientBadge}
						<svg class="icon icon--{clientBadge.type}" width="11" height="11" aria-hidden="true">
							<use href="#{clientBadge.icon}"></use>
						</svg>
					{/if}
					<span>{clientBadge.label}</span>
				</button>
			{/if}
			<a
				class="comment-card__time"
				href={commentPath}
				title={formatFullDate(item.createdAt)}
				onclick={(e) => openPost(e, post, { commentId: item.id })}
				use:preloadIntent={post}
			>
				<time datetime={item.createdAt}>{formatTime(item.createdAt)}</time>
			</a>
			{#if showDateBadge && clientBadge && 'icon' in clientBadge}
				<button type="button" class="comment-card__time-badge" title={clientBadge.title} onclick={() => (showBadgeModal = true)}>
					<svg class="icon icon--{clientBadge.type}" width="10" height="10" aria-hidden="true">
						<use href="#{clientBadge.icon}"></use>
					</svg>
				</button>
			{/if}
		</div>

		{#if paragraphs.length}
			<div class="comment-card__text">
				{#each paragraphs as paragraph}
					<p class={{ 'comment-card__quote': paragraph.quote }}>
						{#each paragraph.lines as line, i}
							{#if i > 0}<br />{/if}{#each line as part}{#if part.type === 'mention'}<a href={resolve(getProfilePath(part.id) as any)} onclick={(e) => openProfile(e, part.id)}>{@render marked(part.parts, part.name)}</a>{:else if part.type === 'link'}{@const dtfTarget = parseDtfUrl(part.url)}{#if dtfTarget}<a href={resolve(dtfTargetToPath(dtfTarget) as any)} onclick={(e) => openDtfLink(e, part.url)} onauxclick={(e) => openDtfLink(e, part.url)}>{@render marked(part.parts, part.url)}</a>{:else}<a href={part.url} target="_blank" rel="noopener noreferrer nofollow">{@render marked(part.parts, part.url)}</a>{/if}{:else if part.mark}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
						{/each}
					</p>
				{/each}
			</div>
		{:else if item.isRemoved}
			<p class="comment-card__removed">Комментарий удалён</p>
		{/if}

		{#if item.media?.length}
			<div class="comment-card__media">
				{#each item.media as media}
					{#if isAnimatedMedia(media)}
						{@const gif = isGifMedia(media)}
						{@const menu = mediaContextMenu({ ...media.data, isGif: gif })}
						<MediaGate media={media.data} kind={gif ? 'gif' : 'video'} maxHeight={360} {menu}>
							<video
								src={getLeonardoUrl(media.data.uuid, { format: 'mp4' })}
								muted
								loop
								playsinline
								controls={!!media.data.has_audio}
								{@attach fromAction(lazyVideo)}
								{@attach menu}
							></video>
						</MediaGate>
					{:else if media.type === 'image'}
						<button
							type="button"
							class="comment-card__zoom"
							aria-label="Открыть изображение"
							onpointerenter={preloadLightbox}
							onclick={() =>
								openLightbox(
									images.map((m) => m.data),
									images.indexOf(media),
									images.map((m) => thumbEls[m.data.uuid] ?? null)
								)}
						>
							<img bind:this={thumbEls[media.data.uuid]} src={getLeonardoUrl(media.data.uuid, { width: 800 })} alt="" loading="lazy" />
						</button>
					{:else}
						<UnknownBlock type={media.type} postId={item.postId} commentId={item.id} sourceId={item.sourceId} />
					{/if}
				{/each}
			</div>
		{/if}

		<div class={['comment-card__footer', { 'comment-card__footer--arrows-left': arrowsLeft }]}>
			{#if !item.isRemoved && votes === 'reactions'}
				<Reactions compact reactions={item.reactions} {onreact} {onopenchange} />
			{:else if !item.isRemoved && votes === 'likes'}
				<div class="comment-card__likes">
					<PostButton
						kind="like"
						title="Лайк"
						value={score.up || undefined}
						active={score.myVote === 1}
						reactions={item.reactions}
						{onreact}
						{onopenchange}
						onclick={() => voteComment(item, 1, onpatch)}
					/>
					<PostButton
						kind="dislike"
						title="Дизлайк"
						value={score.down || undefined}
						active={score.myVote === -1}
						reactions={item.reactions}
						{onopenchange}
						onclick={() => voteComment(item, -1, onpatch)}
					/>
				</div>
			{/if}

			<a class="comment-card__reply" href={commentPath} onclick={(e) => openPost(e, post, { commentId: item.id })} use:preloadIntent={post}>
				Ответить
			</a>

			{#if item.sourceId === 'dtf'}
				<button
					type="button"
					class={[
						'comment-card__bookmark',
						{
							'comment-card__bookmark--active': item.isFavorited,
							'comment-card__bookmark--pressed': bookmarkPressed,
							'comment-card__bookmark--flat': votes === 'rating'
						}
					]}
					title={item.isFavorited ? 'В закладках' : 'В закладки'}
					aria-pressed={!!item.isFavorited}
					onclick={toggleBookmark}
					onmouseleave={() => (bookmarkPressed = false)}
				>
					<svg class="icon" width="16" height="16" aria-hidden="true">
						<use href="#{item.isFavorited ? 'v_bookmark_solid' : 'v_bookmark'}"></use>
					</svg>
					{#key bookmarkGhost}
						{#if bookmarkGhost}<BookmarkGhost size={16} onend={() => (bookmarkGhost = 0)} />{/if}
					{/key}
				</button>
			{/if}

			<Popover bind:open={menuOpen} items={menuItems} onselect={selectMenuItem} width="max-content" label="Действия с комментарием">
				<button type="button" class="comment-card__etc" title="Больше" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
					<svg class="icon" width="14" height="7" aria-hidden="true">
						<use href="#ui_etc"></use>
					</svg>
				</button>
			</Popover>

			{#if !item.isRemoved && votes === 'rating'}
				<!-- Стрелки 2022 справа; слева их ставит order: -1 по настройке arrowsSide -->
				<div class="comment-card__rating">
					<Rating
						compact
						value={score.up - score.down}
						myVote={score.myVote}
						reactions={item.reactions}
						onvote={(sign) => voteComment(item, sign, onpatch)}
						{onreact}
						{onopenchange}
					/>
				</div>
			{/if}
		</div>
	</article>
{/if}

<style>
	.comment-card {
		--post-button-value-weight: 400;
		--post-button-value-gap: 5px;

		position: relative;
		padding: 16px 20px;
		border-radius: 8px;
		background: var(--bg-card);
		color: inherit;
		overflow-wrap: anywhere;
		transition: background-color 0.15s ease;
	}

	.comment-card--elevated {
		z-index: 20;
	}

	.comment-card--filtered {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 20px;
	}

	.comment-card__filtered-text {
		color: var(--text-muted);
		font-size: 14px;
	}

	.comment-card__reveal-btn {
		padding: 0;
		border: none;
		background: none;
		color: var(--color-blue);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.comment-card__post-title {
		display: inline-block;
		margin-bottom: 8px;
		color: inherit;
		font-size: 15px;
		font-weight: 700;
		line-height: 22px;
		text-decoration: none;
	}

	.comment-card__meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px 8px;
		margin-bottom: 8px;
		font-size: 13px;
		line-height: 20px;
	}

	.comment-card__owner {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}

	.comment-card__avatar {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		border-radius: 6px;
		outline: 1px solid var(--border-avatar);
		outline-offset: -1px;
		object-fit: cover;
	}

	.comment-card__author {
		overflow: hidden;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.comment-card__plus {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
	}

	.comment-card__badge {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		height: 16px;
		padding: 0 4px;
		border-radius: 3px;
		font-size: 11px;
		font-weight: 500;
		line-height: 16px;
		white-space: nowrap;
		user-select: none;
		cursor: pointer;
		transition: opacity var(--duration-base);
	}

	.comment-card__badge::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		min-width: max(100%, 24px);
		min-height: 24px;
		transform: translate(-50%, -50%);
	}

	.comment-card__badge--redtf {
		background-color: rgba(70, 131, 217, 0.1);
		color: var(--color-blue);
		font-weight: 700;
	}

	.comment-card__badge--android,
	.comment-card__badge--ios {
		background-color: var(--border-subtle, rgba(0, 0, 0, 0.05));
		color: var(--text-muted);
	}

	.comment-card__badge .icon,
	.comment-card__time-badge .icon {
		display: block;
		flex-shrink: 0;
	}

	.comment-card__time {
		color: var(--text-muted);
		text-decoration: none;
		white-space: nowrap;
	}

	.comment-card__time-badge {
		position: relative;
		display: inline-flex;
		align-items: center;
		color: var(--text-muted);
		opacity: 0.55;
		user-select: none;
		cursor: pointer;
		transition: opacity var(--duration-base);
	}

	.comment-card__time-badge::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 24px;
		height: 24px;
		transform: translate(-50%, -50%);
	}

	.comment-card__text {
		color: var(--text-primary);
		font-size: 15px;
		line-height: 22px;
		user-select: text;
	}

	.comment-card__text p {
		margin: 0 0 6px;
	}

	.comment-card__text p:last-child {
		margin-bottom: 0;
	}

	.comment-card__quote {
		padding-left: 10px;
		border-left: 2px solid var(--border-color);
		color: var(--text-muted);
	}

	.comment-card__text a {
		border-bottom: 1px solid var(--border-link);
		color: var(--text-link);
		text-decoration: none;
	}

	.comment-card__text mark {
		background: var(--bg-highlight);
		color: inherit;
		font-weight: 500;
	}

	.comment-card__removed {
		margin: 0;
		color: var(--text-muted);
		font-size: 14px;
		font-style: italic;
		line-height: 20px;
	}

	.comment-card__media {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 400px;
		max-width: 100%;
		margin-top: 8px;
	}

	.comment-card__media :is(img, video) {
		display: block;
		max-width: 100%;
		max-height: 360px;
		border-radius: 8px;
		object-fit: contain;
	}

	.comment-card__zoom {
		display: block;
		width: fit-content;
		max-width: 100%;
		cursor: zoom-in;
	}

	.comment-card__footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		margin-top: 10px;
		font-size: 15px;
	}

	.comment-card__footer > :global(.post-reactions) {
		min-width: 0;
		max-width: 100%;
	}

	.comment-card__likes {
		display: inline-flex;
		align-items: center;
		gap: 14px;
	}

	.comment-card__rating {
		display: flex;
		margin-left: auto;
	}

	.comment-card__footer--arrows-left .comment-card__rating {
		order: -1;
		margin-left: 0;
	}

	.comment-card__reply {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 24px;
		color: var(--text-muted);
		font-size: 15px;
		text-decoration: none;
	}

	.comment-card__reply::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 32px;
		transform: translateY(-50%);
	}

	.comment-card__bookmark {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		cursor: pointer;
	}

	.comment-card__bookmark::before {
		content: '';
		position: absolute;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background-color: var(--color-comments-hover-bg);
		opacity: 0;
		pointer-events: none;
	}

	.comment-card__bookmark::after,
	.comment-card__etc::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 32px;
		height: 32px;
		transform: translate(-50%, -50%);
	}

	.comment-card__bookmark .icon {
		position: relative;
		z-index: 1;
		display: block;
	}

	.comment-card__bookmark--active {
		color: var(--color-blue);
	}

	/* Осенью 2022 у закладки не было круга, а наведение было синим, как активная */
	.comment-card__bookmark--flat::before {
		content: none;
	}

	.comment-card__etc {
		position: relative;
		display: flex;
		align-items: center;
		color: var(--text-muted);
		cursor: pointer;
	}

	.comment-card__etc[aria-expanded='true'] {
		color: var(--text-primary);
	}

	@media (hover: hover) {
		.comment-card__reveal-btn:hover {
			text-decoration: underline;
		}

		.comment-card__post-title:hover,
		.comment-card__owner:hover .comment-card__author,
		.comment-card__time:hover,
		.comment-card__reply:hover {
			color: var(--text-link);
		}

		.comment-card__text a:hover {
			border-bottom-color: var(--color-danger-subtle);
			color: var(--color-danger);
		}

		.comment-card__badge:hover {
			opacity: 0.85;
		}

		.comment-card__time-badge:hover {
			opacity: 0.9;
		}

		.comment-card__bookmark:hover:not(.comment-card__bookmark--pressed) {
			color: var(--color-comments-hover);
		}

		.comment-card__bookmark--flat:hover:not(.comment-card__bookmark--pressed) {
			color: var(--color-blue);
		}

		.comment-card__bookmark:hover:not(.comment-card__bookmark--pressed)::before {
			opacity: 0.12;
		}

		.comment-card__etc:hover {
			color: var(--text-primary);
		}
	}

	@media (pointer: coarse), (max-width: 859px) {
		.comment-card__reply::after {
			height: 44px;
		}

		.comment-card__bookmark::after,
		.comment-card__etc::after,
		.comment-card__time-badge::after {
			width: 44px;
			height: 44px;
		}
	}

	@media (max-width: 859px) {
		.comment-card {
			border-radius: 0;
		}
	}

	@media (max-width: 639px) {
		.comment-card {
			padding: 16px;
		}
	}
</style>
