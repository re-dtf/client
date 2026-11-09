<script lang="ts">
	import type { Post } from '$lib/api/types';
	import { resolve } from '$app/paths';
	import { getPostPath, openPost } from '$lib/navigation';
	import { preloadIntent } from '$lib/actions/preloadIntent';
	import { reactToPost, repostPost, sharePost, toggleFavoritePost, votePost, withActions } from '../actions.svelte';
	import { votesOf } from '$lib/reactions';
	import { themeSettings } from '../themeSettings.svelte';
	import PostHeader from './PostHeader.svelte';
	import PostBlocks from './PostBlocks.svelte';
	import PostButton from './PostButton.svelte';
	import PostCard from './PostCard.svelte';
	import RepostLabel from './RepostLabel.svelte';
	import RepostsDialog from './RepostsDialog.svelte';
	import Rating from './Rating.svelte';
	import Reactions from './Reactions.svelte';

	let {
		post: source,
		embed = false,
		subscribe = !embed
	}: {
		post: Post;
		/** Встроенный пост на странице другого поста — без футера */
		embed?: boolean;
		/** Кнопка «Подписаться» в шапке (в профиле не нужна) */
		subscribe?: boolean;
	} = $props();

	let post = $derived(withActions(source));
	let score = $derived(votesOf(post));
	let blocks = $derived(post.blocks.filter((b) => b.cover));
	let votes = $derived(themeSettings.votes);
	// Стрелочная оценка — осень 2022: иконки футера крупнее (22px)
	let arrows = $derived(votes === 'rating');
	let arrowsLeft = $derived(arrows && themeSettings.arrowsSide === 'left');
	let iconSize = $derived(arrows ? 22 : 20);
	let postPath = $derived(resolve(getPostPath(post) as any));
	let commentsPath = $derived(resolve(getPostPath(post, 'comments') as any));
	let onreact = $derived(post.sourceId === 'dtf' ? (id: number) => reactToPost(post, id) : undefined);
	let showReposts = $state(false);
</script>

<article class={['feed-item', { 'feed-item--embed': embed }]}>
	<div class={['post-card', { 'post-card--embed': embed }]}>
		{#if post.repost && !embed}
			<RepostLabel />
		{/if}

		<PostHeader {post} variant="card" {subscribe} />

		<div class="post-content">
			<PostBlocks title={post.title} {blocks} variant={embed ? 'embed' : 'card'} postId={post.id} sourceId={post.sourceId} />
			<!-- Ссылка поверх превью: клик в любом месте открывает пост -->
			<a class="post-link" href={postPath} aria-label={post.title || undefined} onclick={(e) => openPost(e, post)} use:preloadIntent={post}></a>
		</div>

		{#if post.repost?.original && !embed}
			<div class="post-block post-repost">
				<PostCard post={post.repost.original} embed />
			</div>
		{/if}

		{#if !embed}
			{#if votes === 'reactions'}
				<div class="post-block">
					<Reactions reactions={post.reactions} {onreact} />
				</div>
			{/if}

			<div class={['post-footer post-block', { 'post-footer--arrows': arrows, 'post-footer--arrows-left': arrowsLeft }]}>
				<div class="post-footer__controls">
					{#if votes === 'likes'}
						<PostButton
							kind="like"
							title="Лайк"
							value={score.up || undefined}
							active={score.myVote === 1}
							reactions={post.reactions}
							{onreact}
							onclick={() => votePost(post, 1)}
						/>
					{/if}
					<PostButton
						kind="comments"
						title="Комментарии"
						href={commentsPath}
						{iconSize}
						value={post.commentsCount}
						onclick={(e) => openPost(e, post, { toComments: true })}
					/>
					<!-- Осенью 2022 вместо репоста — «Поделиться», и стоит он после закладки -->
					{#if arrows}
						<PostButton kind="bookmark" title="В закладки" {iconSize} active={post.isFavorited} onclick={() => toggleFavoritePost(post)} />
						<PostButton kind="share" title="Поделиться" {iconSize} onclick={() => sharePost(post)} />
					{:else}
						<PostButton
							kind="repost"
							title="Сделать репост"
							value={post.repostsCount}
							onclick={() => repostPost(post)}
							onvalueclick={() => (showReposts = true)}
						/>
						<PostButton kind="bookmark" title="В закладки" active={post.isFavorited} onclick={() => toggleFavoritePost(post)} />
					{/if}
				</div>

				{#if votes === 'likes'}
					<PostButton
						kind="dislike"
						title="Дизлайк"
						right
						value={score.down || undefined}
						active={score.myVote === -1}
						reactions={post.reactions}
						onclick={() => votePost(post, -1)}
					/>
				{:else if votes === 'rating'}
					<div class="post-footer__rating">
						<Rating
							value={score.up - score.down}
							myVote={score.myVote}
							reactions={post.reactions}
							onvote={(sign) => votePost(post, sign)}
							{onreact}
						/>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if showReposts}
		<RepostsDialog postId={post.id} onclose={() => (showReposts = false)} />
	{/if}
</article>

<style>
	/* Отступы между карточками ленты (в исходной вёрстке — gap у .feed-list) */
	.feed-item {
		width: 100%;
		max-width: var(--content-width);
		margin: 28px auto 0;
		content-visibility: auto;
		contain-intrinsic-size: auto none auto 500px;
	}

	.feed-item--embed {
		max-width: none;
		margin: 24px 0;
		content-visibility: visible;
	}

	.feed-item:has(:global(.post-reactions__picker)),
	.feed-item:has(:global(.popover)) {
		content-visibility: visible;
		position: relative;
		z-index: 20;
	}

	/* Диалог с fixed внутри карточки: content-visibility: auto обрезал бы его по границам карточки */
	.feed-item:has(:global([role='dialog'])) {
		content-visibility: visible;
	}

	.post-card {
		border-radius: 8px;
		background-color: var(--bg-card);
		/* box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); Оставил для RE тоже, не удалять коммент */
	}

	.post-card--embed {
		position: relative;
		max-width: 600px;
		overflow: hidden;
		box-shadow: 0 0 0 1px var(--border-color);
	}

	.post-content {
		position: relative;
		font-size: 17px;
		line-height: 26px;
		overflow-wrap: break-word;
		/* не даёт margin последнего блока выпасть за карточку */
		border-bottom: 1px solid transparent;
	}

	.post-link {
		position: absolute;
		inset: 0;
	}

	/* Исходный пост репоста: та же рамка, что у встроенного поста на странице, отступ только сверху */
	.post-repost :global(.feed-item--embed) {
		margin: 12px 0 0;
	}

	.post-block {
		max-width: var(--content-width);
		padding-left: 20px;
		padding-right: 20px;
	}

	.post-footer {
		display: flex;
		align-items: center;
		margin-top: 12px;
		padding-bottom: 16px;
		font-size: 15px;
	}

	.post-footer__controls {
		display: flex;
		gap: 20px;
	}

	.post-footer--arrows .post-footer__controls {
		--post-button-value-gap: 4px;
		gap: 33px;
	}

	/* Стрелки справа — прижаты к краю; слева — первым элементом футера, кнопки идут плотнее */
	.post-footer__rating {
		display: flex;
		margin-left: auto;
	}

	.post-footer--arrows-left .post-footer__controls {
		gap: 20px;
	}

	.post-footer--arrows-left .post-footer__rating {
		order: -1;
		margin: 0 20px 0 0;
	}

	@media (max-width: 859px) {
		.feed-item {
			margin-top: 20px;
		}

		.post-footer {
			margin-top: 6px;
			padding-bottom: 12px;
		}

		.post-footer__controls {
			gap: 16px;
		}

		.post-footer--arrows .post-footer__controls {
			gap: 24px;
		}

		.post-footer--arrows-left .post-footer__controls {
			gap: 16px;
		}
	}

	@media (max-width: 639px) {
		.post-card:not(.post-card--embed) {
			border-radius: 0;
		}

		.post-block {
			padding-left: 16px;
			padding-right: 16px;
		}
	}
</style>
