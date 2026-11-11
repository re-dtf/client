<script lang="ts">
	import { fromAction } from 'svelte/attachments';
	import { resolve } from '$app/paths';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import { mediaHold } from '$lib/actions/mediaHold';
	import { api } from '$lib/api/index.svelte';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import type { Comment } from '$lib/api/types';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { getPostPath, getPostShareUrl, getProfilePath, openDtfLink, openLightbox, openPost, openProfile, preloadLightbox } from '$lib/navigation';
	import { parseDtfUrl, dtfTargetToPath } from '$lib/dtfLinks';
	import { ensureLogin } from './actions.svelte';
	import { parseCommentText } from './comments/commentText';
	import { toggleCommentFavorite, toggleCommentReaction, voteComment } from './comments/votes.svelte';
	import ComplaintDialog from './ComplaintDialog.svelte';
	import { formatFullDate, formatTime } from './format';
	import PostButton from './post/PostButton.svelte';
	import Rating from './post/Rating.svelte';
	import Reactions from './post/Reactions.svelte';
	import { votesOf } from '$lib/reactions';
	import UnknownBlock from './UnknownBlock.svelte';
	import { themeSettings } from './themeSettings.svelte';
	import Popover from './ui/Popover.svelte';
	import { notify } from './ui/notify.svelte';
	import { filterSettings, matchCommentFilter } from '$lib/storage/filter.svelte';
	import { settings } from '$lib/storage/settings.svelte';
	import { getCommentBadge } from '$lib/clientBadge';
	import BadgeInfoModal from './BadgeInfoModal.svelte';

	/** Карточка комментария на вкладке «Комментарии» профиля, как profile_comment_favorite у DTF */
	let { comment }: { comment: Comment } = $props();

	let votes = $derived(themeSettings.votes);
	let score = $derived(votesOf(comment));
	const react = (id: number) => toggleCommentReaction(comment, id);
	let filterMatch = $derived(matchCommentFilter(comment));
	let revealed = $state(false);
	let isFiltered = $derived(!!filterMatch && !revealed);
	let paragraphs = $derived(parseCommentText(comment.content));
	let post = $derived({ id: comment.postId, sourceId: comment.sourceId });
	let clientBadge = $derived(getCommentBadge(comment, settings.value.clientBadges));
	let showAuthorBadge = $derived(clientBadge && (clientBadge.type === 'redtf' || settings.value.mobileBadgesPosition === 'author'));
	let showDateBadge = $derived(clientBadge && clientBadge.type !== 'redtf' && settings.value.mobileBadgesPosition === 'date');
	let images = $derived((comment.media ?? []).filter((media) => media.type === 'image'));
	let postPath = $derived(resolve(getPostPath(post) as any));
	let commentUrl = $derived(getPostShareUrl(post, `comment-${comment.sourceId}_${comment.id}`));

	let menuOpen = $state(false);
	let complaining = $state(false);
	let showBadgeModal = $state(false);
	let menuItems = $derived([
		...(comment.sourceId === 'dtf' ? [{ value: 'open_dtf' as const, label: 'Открыть на DTF', icon: 'v_external' }] : []),
		{ value: 'copy' as const, label: 'Копировать ссылку', icon: 'v_link' },
		...(comment.sourceId === 'dtf' && comment.author.id !== currentUser.value?.id ? [{ value: 'complain' as const, label: 'Пожаловаться', icon: 'v_flag' }] : [])
	]);

	async function selectMenuItem(item: 'open_dtf' | 'copy' | 'complain') {
		if (item === 'open_dtf') {
			window.open(`https://dtf.ru/${comment.postId}?comment=${comment.id}`, '_blank', 'noopener,noreferrer');
			return;
		}
		if (item === 'complain') {
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

{#if complaining}
	<ComplaintDialog onsubmit={(reasonId) => api.complain('comment', comment.id, reasonId)} onclose={() => (complaining = false)} />
{/if}

{#if showBadgeModal && clientBadge}
	<BadgeInfoModal badge={clientBadge} onclose={() => (showBadgeModal = false)} />
{/if}

{#if isFiltered}
	{#if filterSettings.value.mode === 'soft'}
		<article class="profile-comment profile-comment--filtered">
			<span class="profile-comment__filtered-text">Комментарий скрыт фильтром ({filterMatch?.rule})</span>
			<button type="button" class="profile-comment__reveal-btn" onclick={() => (revealed = true)}>Показать</button>
		</article>
	{/if}
{:else}
<article class="profile-comment">
	{#if comment.postTitle}
		<a class="profile-comment__title" href={postPath} onclick={(e) => openPost(e, post)}>{comment.postTitle}</a>
	{/if}

	<div class="profile-comment__header">
		<a class="profile-comment__user" href={resolve(getProfilePath(comment.author.id) as any)} onclick={(e) => openProfile(e, comment.author.id)}>
			{#if comment.author.avatarUrl}
				<img class="profile-comment__avatar" src={comment.author.avatarUrl} alt="" />
			{/if}
			<span class="profile-comment__name">{comment.author.name}</span>
		</a>
		{#if showAuthorBadge && clientBadge}
			<button
				type="button"
				class="profile-comment__badge profile-comment__badge--{clientBadge.type}"
				title={clientBadge.title}
				onclick={(e) => {
					e.stopPropagation();
					e.preventDefault();
					showBadgeModal = true;
				}}
			>
				{#if 'icon' in clientBadge}
					<svg class="icon icon--{clientBadge.type}" width="11" height="11" aria-hidden="true">
						<use href="/icons.svg#{clientBadge.icon}"></use>
					</svg>
				{/if}
				<span>{clientBadge.label}</span>
			</button>
		{/if}
		<a class="profile-comment__date" href={postPath} onclick={(e) => openPost(e, post)}>
			<time datetime={comment.createdAt} title={formatFullDate(comment.createdAt)}>{formatTime(comment.createdAt)}</time>
		</a>
		{#if showDateBadge && clientBadge && 'icon' in clientBadge}
			<button
				type="button"
				class="profile-comment__time-badge"
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

		<div class="profile-comment__vote">
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
					onclick={() => voteComment(comment, 1)}
				/>
			{:else}
				<Rating
					compact
					value={score.up - score.down}
					myVote={score.myVote}
					reactions={comment.reactions}
					onvote={(vote) => voteComment(comment, vote)}
					onreact={react}
				/>
			{/if}
		</div>
	</div>

	<div class="profile-comment__text">
		{#each paragraphs as paragraph}
			<p class={{ 'profile-comment__quote': paragraph.quote }}>
				{#each paragraph.lines as line}
					{#each line as part}{#if part.type === 'text'}{part.text}{:else if part.type === 'mention'}<a href={resolve(getProfilePath(part.id) as any)} onclick={(e) => openProfile(e, part.id)}>{part.name}</a>{:else}{@const dtfTarget = parseDtfUrl(part.url)}{#if dtfTarget}<a href={resolve(dtfTargetToPath(dtfTarget) as any)} onclick={(e) => openDtfLink(e, part.url)} onauxclick={(e) => openDtfLink(e, part.url)}>{part.url}</a>{:else}<a href={part.url} target="_blank" rel="noopener noreferrer nofollow">{part.url}</a>{/if}{/if}{/each}<br />
				{/each}
			</p>
		{/each}
	</div>

	{#if comment.media?.length}
		<div class="profile-comment__media">
			{#each comment.media as media}
				{#if media.type === 'movie'}
					<video src={getLeonardoUrl(media.data.uuid, { format: 'mp4' })} muted loop playsinline controls={!!media.data.has_audio} {@attach fromAction(lazyVideo)} use:mediaHold={{ uuid: media.data.uuid, isGif: media.data?.type === 'gif' }}></video>
				{:else if media.type === 'image'}
					<button
						type="button"
						class="profile-comment__zoom"
						aria-label="Открыть изображение"
						onpointerenter={preloadLightbox}
						onclick={(e) => openLightbox(images.map((m) => m.data), images.indexOf(media), e.currentTarget.firstElementChild as HTMLImageElement)}
					>
						<img src={getLeonardoUrl(media.data.uuid, { width: 800 })} alt="" loading="lazy" />
					</button>
				{:else}
					<UnknownBlock type={media.type} postId={comment.postId} commentId={comment.id} sourceId={comment.sourceId} />
				{/if}
			{/each}
		</div>
	{/if}

	<div class="profile-comment__footer">
		<a class="profile-comment__reply" href={postPath} onclick={(e) => openPost(e, post)}>Ответить</a>

		{#if comment.sourceId === 'dtf'}
			<button
				type="button"
				class={['profile-comment__bookmark', { 'profile-comment__bookmark--active': comment.isFavorited }]}
				title={comment.isFavorited ? 'Убрать из закладок' : 'Добавить в закладки'}
				onclick={() => toggleCommentFavorite(comment)}
			>
				<svg class="icon" width="20" height="20" aria-hidden="true">
					<use href="/icons.svg#{comment.isFavorited ? 'v_bookmark_solid' : 'v_bookmark'}"></use>
				</svg>
			</button>
		{/if}

		<Popover bind:open={menuOpen} items={menuItems} onselect={selectMenuItem} width="max-content" label="Действия с комментарием">
			<button type="button" class="profile-comment__etc" title="Больше" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
				<svg class="icon" width="14" height="7" aria-hidden="true">
					<use href="/icons.svg#ui_etc"></use>
				</svg>
			</button>
		</Popover>
	</div>
</article>
{/if}

<style>
	/* Остров DTF: белая карточка с отступом 20px (16px до 639px), скругление от 640px */
	.profile-comment {
		position: relative;
		margin-bottom: 28px;
		padding: 9px 20px 5px;
		background-color: var(--bg-card);
		overflow-wrap: anywhere;
	}

	.profile-comment:has(:global(.post-reactions__picker)),
	.profile-comment:has(:global(.popover)) {
		z-index: 20;
	}

	.profile-comment--filtered {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 20px;
	}

	.profile-comment__filtered-text {
		color: var(--text-muted, #777);
		font-size: 14px;
	}

	.profile-comment__reveal-btn {
		background: none;
		border: none;
		padding: 0;
		color: var(--color-blue, #1976d2);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	@media (min-width: 640px) {
		.profile-comment {
			border-radius: 8px;
		}
	}

	@media (max-width: 859px) {
		.profile-comment {
			margin-bottom: 20px;
		}
	}

	@media (max-width: 639px) {
		.profile-comment {
			padding-left: 16px;
			padding-right: 16px;
		}
	}

	.profile-comment__title {
		display: block;
		margin-top: 5px;
		padding-bottom: 1px;
		font-size: 15px;
		font-weight: 700;
		line-height: 22px;
		word-break: break-word;
	}

	.profile-comment__header {
		display: flex;
		align-items: center;
		margin: 8px 0 7px;
	}

	.profile-comment__badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		height: 16px;
		padding: 0 4px;
		margin-left: 6px;
		font-size: 11px;
		font-weight: 500;
		line-height: 16px;
		border-radius: 3px;
		user-select: none;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity var(--duration-base, 0.15s);
	}

	.profile-comment__badge:hover {
		opacity: 0.85;
	}

	.profile-comment__badge .icon {
		display: block;
		flex-shrink: 0;
	}

	.profile-comment__badge--redtf {
		font-weight: 700;
		color: var(--color-blue);
		background-color: rgba(70, 131, 217, 0.1);
	}

	.profile-comment__badge--android,
	.profile-comment__badge--ios {
		color: var(--text-muted);
		background-color: var(--border-subtle, rgba(0, 0, 0, 0.05));
	}

	.profile-comment__user {
		display: flex;
		align-items: center;
	}

	.profile-comment__avatar {
		position: relative;
		top: 0;
		width: 16px;
		height: 16px;
		margin-right: 4px;
		border-radius: 2px;
		outline: 1px solid var(--border-avatar);
		outline-offset: -1px;
	}

	.profile-comment__name {
		font-size: 13px;
		font-weight: 500;
		line-height: 16px;
	}

	.profile-comment__date {
		margin-left: 13px;
		color: var(--text-muted);
		font-size: 12px;
		text-transform: lowercase;
	}

	.profile-comment__time-badge {
		display: inline-flex;
		align-items: center;
		margin-left: 6px;
		color: var(--text-muted);
		opacity: 0.55;
		user-select: none;
		cursor: pointer;
		transition: opacity var(--duration-base, 0.15s);
	}

	.profile-comment__time-badge .icon {
		display: block;
	}

	.profile-comment__vote {
		margin-left: auto;
	}

	.profile-comment__text {
		margin-top: 4px;
		overflow: hidden;
		font-size: 15px;
		line-height: 22px;
		word-break: break-word;
	}

	.profile-comment__text p {
		margin: 0 0 5px;
	}

	.profile-comment__text a {
		border-bottom: 1px solid var(--border-link);
		color: var(--text-link);
	}

	.profile-comment__quote {
		position: relative;
		padding-left: 24px;
		font-size: 14px;
	}

	.profile-comment__media {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 400px;
		max-width: 100%;
		padding: 6px 0;
		margin-bottom: 10px;
	}

	.profile-comment__media :is(img, video) {
		display: block;
		max-width: 100%;
		border-radius: 8px;
	}

	.profile-comment__zoom {
		display: block;
		max-width: 100%;
		cursor: zoom-in;
	}

	.profile-comment__footer {
		display: flex;
		align-items: center;
		padding: 5px 0 14px;
	}

	.profile-comment__reply {
		margin-top: 3px;
		margin-right: 17px;
		color: var(--text-muted);
		font-size: 15px;
	}

	.profile-comment__bookmark {
		display: flex;
		margin-right: 20px;
		color: var(--text-muted);
		cursor: pointer;
	}

	.profile-comment__bookmark--active {
		color: var(--color-blue);
	}

	/* Как .etc_control у DTF: серая, при наведении чёрная */
	.profile-comment__etc {
		display: flex;
		align-items: center;
		color: var(--text-muted);
		cursor: pointer;
	}

	.profile-comment__etc[aria-expanded='true'] {
		color: var(--text-primary);
	}

	@media (hover: hover) {
		.profile-comment__reveal-btn:hover {
			text-decoration: underline;
		}

		.profile-comment__title:hover,
		.profile-comment__user:hover,
		.profile-comment__date:hover,
		.profile-comment__reply:hover {
			color: var(--text-link);
		}

		.profile-comment__time-badge:hover {
			opacity: 0.9;
		}

		.profile-comment__text a:hover {
			border-bottom-color: var(--color-danger-subtle);
			color: var(--color-danger);
		}

		.profile-comment__etc:hover {
			color: var(--text-primary);
		}
	}
</style>
