<script lang="ts">
	import type { Post } from '$lib/api/types';
	import { resolve } from '$app/paths';
	import { getPostPath, openPost } from '$lib/navigation';
	import { themeSettings } from '../themeSettings.svelte';
	import PostHeader from './PostHeader.svelte';
	import PostBlocks from './PostBlocks.svelte';
	import PostButton from './PostButton.svelte';
	import Rating from './Rating.svelte';
	import Reactions from './Reactions.svelte';

	let {
		post,
		embed = false,
		subscribe = !embed
	}: {
		post: Post;
		/** Встроенный пост на странице другого поста — без футера */
		embed?: boolean;
		/** Кнопка «Подписаться» в шапке (в профиле не нужна) */
		subscribe?: boolean;
	} = $props();

	let blocks = $derived(post.blocks.filter((b) => b.cover));
	let votes = $derived(themeSettings.votes);
	// Стрелочная оценка — осень 2022: иконки футера крупнее (22px)
	let arrows = $derived(votes === 'rating');
	let iconSize = $derived(arrows ? 22 : 20);
	let postPath = $derived(resolve(getPostPath(post) as any));
</script>

<article class={['feed-item', { 'feed-item--embed': embed }]}>
	<div class={['post-card', { 'post-card--embed': embed }]}>
		<PostHeader {post} variant="card" {subscribe} />

		<div class="post-content">
			<PostBlocks title={post.title} {blocks} variant={embed ? 'embed' : 'card'} />
			<!-- Ссылка поверх превью: клик в любом месте открывает пост -->
			<a class="post-link" href={postPath} aria-label={post.title} onclick={(e) => openPost(e, post)}></a>
		</div>

		{#if !embed}
			{#if votes === 'reactions'}
				<div class="post-block">
					<Reactions reactions={post.reactions} />
				</div>
			{/if}

			<div class={['post-footer post-block', { 'post-footer--arrows': arrows }]}>
				<div class="post-footer__controls">
					{#if votes === 'likes'}
						<PostButton kind="like" title="Лайк" value={post.likes?.count || undefined} active={post.likes?.myVote === 1} />
					{/if}
					<PostButton
						kind="comments"
						title="Комментарии"
						href={postPath}
						{iconSize}
						value={post.commentsCount}
						onclick={(e) => openPost(e, post)}
					/>
					<!-- Осенью 2022 вместо репоста — «Поделиться», и стоит он после закладки -->
					{#if arrows}
						<PostButton kind="bookmark" title="В закладки" {iconSize} active={post.isFavorited} />
						<PostButton kind="share" title="Поделиться" {iconSize} />
					{:else}
						<PostButton kind="repost" title="Сделать репост" />
						<PostButton kind="bookmark" title="В закладки" active={post.isFavorited} />
					{/if}
				</div>

				{#if votes === 'likes'}
					<PostButton kind="dislike" title="Дизлайк" right value={post.likes?.dislikes} active={post.likes?.myVote === -1} />
				{:else if votes === 'rating'}
					<Rating value={post.likes?.count ?? 0} myVote={post.likes?.myVote} />
				{/if}
			</div>
		{/if}
	</div>
</article>

<style>
	/* Отступы между карточками ленты (в исходной вёрстке — gap у .feed-list) */
	.feed-item {
		width: 100%;
		max-width: 640px;
		margin: 28px auto 0;
		content-visibility: auto;
		contain-intrinsic-size: auto 500px;
	}

	.feed-item--embed {
		max-width: none;
		margin: 24px 0;
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
		box-shadow: 0 0 0 1px #dedede;
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

	@media (max-width: 859px) {
		.feed-item {
			margin-top: 20px;
		}

		.feed-item--embed {
			margin: 24px 0;
		}
	}

	@media (max-width: 639px) {
		.post-block {
			padding-left: 16px;
			padding-right: 16px;
		}

		/* На узких экранах карточка — на всю ширину, без скруглений */
		.post-card:not(.post-card--embed) {
			border-radius: 0;
		}
	}
</style>
