<script lang="ts">
	import { fromAction } from 'svelte/attachments';
	import { resolve } from '$app/paths';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import { api } from '$lib/api/index.svelte';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import type { Comment } from '$lib/api/types';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { getPostPath, getProfilePath, openLightbox, openPost, openProfile, preloadLightbox } from '$lib/navigation';
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

	/** Карточка комментария на вкладке «Комментарии» профиля, как profile_comment_favorite у DTF */
	let { comment }: { comment: Comment } = $props();

	let votes = $derived(themeSettings.votes);
	let score = $derived(votesOf(comment));
	let paragraphs = $derived(parseCommentText(comment.content));
	let post = $derived({ id: comment.postId, sourceId: comment.sourceId });
	let images = $derived((comment.media ?? []).filter((media) => media.type === 'image'));
	let postPath = $derived(resolve(getPostPath(post) as any));
	let commentUrl = $derived(new URL(`${postPath}#comment-${comment.sourceId}_${comment.id}`, location.href));

	let menuOpen = $state(false);
	let complaining = $state(false);
	let menuItems = $derived([
		{ value: 'copy' as const, label: 'Копировать ссылку', icon: 'v_link' },
		...(comment.sourceId === 'dtf' && comment.author.id !== currentUser.value?.id ? [{ value: 'complain' as const, label: 'Пожаловаться', icon: 'v_flag' }] : [])
	]);

	async function selectMenuItem(item: 'copy' | 'complain') {
		if (item === 'complain') {
			complaining = ensureLogin();
			return;
		}
		try {
			await navigator.clipboard.writeText(commentUrl.href);
			notify.success('Ссылка скопирована');
		} catch {
			notify.error('Не удалось скопировать ссылку');
		}
	}
</script>

{#if complaining}
	<ComplaintDialog onsubmit={(reasonId) => api.complain('comment', comment.id, reasonId)} onclose={() => (complaining = false)} />
{/if}

<article class="profile-comment">
	<a class="profile-comment__title" href={postPath} onclick={(e) => openPost(e, post)}>{comment.postTitle}</a>

	<div class="profile-comment__header">
		<a class="profile-comment__user" href={resolve(getProfilePath(comment.author.id) as any)} onclick={(e) => openProfile(e, comment.author.id)}>
			{#if comment.author.avatarUrl}
				<img class="profile-comment__avatar" src={comment.author.avatarUrl} alt="" />
			{/if}
			<span class="profile-comment__name">{comment.author.name}</span>
		</a>
		<a class="profile-comment__date" href={postPath} onclick={(e) => openPost(e, post)}>
			<time datetime={comment.createdAt} title={formatFullDate(comment.createdAt)}>{formatTime(comment.createdAt)}</time>
		</a>

		<div class="profile-comment__vote">
			{#if votes === 'reactions'}
				<Reactions compact reactions={comment.reactions} onreact={(id) => toggleCommentReaction(comment, id)} />
			{:else if votes === 'likes'}
				<PostButton kind="like" title="Лайк" value={score.up || undefined} active={score.myVote === 1} onclick={() => voteComment(comment, 1)} />
			{:else}
				<Rating compact value={score.up - score.down} myVote={score.myVote} onvote={(vote) => voteComment(comment, vote)} />
			{/if}
		</div>
	</div>

	<div class="profile-comment__text">
		{#each paragraphs as paragraph}
			<p class={{ 'profile-comment__quote': paragraph.quote }}>
				{#each paragraph.lines as line}
					{#each line as part}{#if part.type === 'text'}{part.text}{:else if part.type === 'mention'}{part.name}{:else}<a href={part.url} target="_blank" rel="noopener noreferrer nofollow">{part.url}</a>{/if}{/each}<br />
				{/each}
			</p>
		{/each}
	</div>

	{#if comment.media?.length}
		<div class="profile-comment__media">
			{#each comment.media as media}
				{#if media.type === 'movie'}
					<video src={getLeonardoUrl(media.data.uuid, { format: 'mp4' })} muted loop playsinline controls={!!media.data.has_audio} {@attach fromAction(lazyVideo)}></video>
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

<style>
	/* Остров DTF: белая карточка с отступом 20px (16px до 639px), скругление от 640px */
	.profile-comment {
		position: relative;
		margin-bottom: 28px;
		padding: 9px 20px 5px;
		background-color: #fff;
		overflow-wrap: anywhere;
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

	.profile-comment__title:hover {
		color: var(--text-link);
	}

	.profile-comment__header {
		display: flex;
		align-items: center;
		margin: 8px 0 7px;
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
		outline: 1px solid rgba(0, 0, 0, 0.1);
		outline-offset: -1px;
	}

	.profile-comment__name {
		font-size: 13px;
		font-weight: 500;
		line-height: 16px;
	}

	.profile-comment__user:hover,
	.profile-comment__date:hover {
		color: var(--text-link);
	}

	.profile-comment__date {
		margin-left: 13px;
		color: #595959;
		font-size: 12px;
		text-transform: lowercase;
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
		border-bottom: 1px solid #bed0ea;
		color: var(--text-link);
	}

	.profile-comment__text a:hover {
		border-bottom-color: #f6b4bc;
		color: #cd192e;
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
		color: #595959;
		font-size: 15px;
	}

	.profile-comment__reply:hover {
		color: var(--text-link);
	}

	.profile-comment__bookmark {
		display: flex;
		margin-right: 20px;
		color: #595959;
		cursor: pointer;
	}

	.profile-comment__bookmark--active {
		color: var(--color-blue);
	}

	/* Как .etc_control у DTF: серая, при наведении чёрная */
	.profile-comment__etc {
		display: flex;
		align-items: center;
		color: #595959;
		cursor: pointer;
	}

	.profile-comment__etc:hover,
	.profile-comment__etc[aria-expanded='true'] {
		color: #000;
	}
</style>
