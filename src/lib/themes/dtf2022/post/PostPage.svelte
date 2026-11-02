<script lang="ts">
	import type { Post } from '$lib/api/types';
	import { reactToPost, sharePost, toggleFavoritePost, votePost, withActions } from '../actions.svelte';
	import { votesOf } from '../reactionVotes';
	import { themeSettings } from '../themeSettings.svelte';
	import { formatNumber, plural } from '../format';
	import PostHeader from './PostHeader.svelte';
	import PostBlocks from './PostBlocks.svelte';
	import PostButton from './PostButton.svelte';
	import Rating from './Rating.svelte';
	import Reactions from './Reactions.svelte';
	import AuthorCard from './AuthorCard.svelte';

	let { post: source }: { post: Post } = $props();

	let post = $derived(withActions(source));
	let score = $derived(votesOf(post));

	let blocks = $derived(post.blocks);
	// Панель «комментарии / закладки / просмотры» стоит после лида — первого текстового блока обложки
	let leadEnd = $derived.by(() => {
		const index = blocks.findIndex((b) => b.type === 'text');
		return index >= 0 && blocks[index].cover ? index + 1 : 0;
	});
	// У DTF панель есть только у постов от 8 блоков (проверено по архиву и API); в коротких она дублирует нижнюю
	let showActions = $derived(blocks.length >= 8);
	let votes = $derived(themeSettings.votes);
	// Стрелочная оценка — осень 2022: иконки крупнее (22px), отступы между кнопками 33px, есть «Поделиться»
	let arrows = $derived(votes === 'rating');
	let iconSize = $derived(arrows ? 22 : 20);

	function scrollToComments(e: MouseEvent) {
		e.preventDefault();
		document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<div class="post-page">
	<div class="post-container">
		<PostHeader {post} variant="page" />

		<div class="post-content">
			<PostBlocks title={post.title} blocks={blocks.slice(0, leadEnd)} variant="page" />

			{#if showActions}
				<div class={['post-actions', { 'post-actions--arrows': arrows }]}>
					<PostButton kind="comments" title="Комментарии" href="#comments" {iconSize} value={post.commentsCount} onclick={scrollToComments} />
					<PostButton kind="bookmark" title="В закладки" {iconSize} active={post.isFavorited} onclick={() => toggleFavoritePost(post)} />
					{#if arrows}
						<span class="post-actions__share"><PostButton kind="share" title="Поделиться" {iconSize} onclick={() => sharePost(post)} /></span>
					{/if}
					{#if post.viewsCount}
						<div class="post-actions__views">
							{formatNumber(post.viewsCount)}
							{plural(post.viewsCount, ['просмотр', 'просмотра', 'просмотров'])}
						</div>
					{/if}
				</div>
			{/if}

			<PostBlocks blocks={blocks.slice(leadEnd)} variant="page" />

			{#if votes === 'reactions'}
				<Reactions reactions={post.reactions} onreact={(id) => reactToPost(post, id)} />
			{/if}

			<div class={['post-footer', { 'post-footer--arrows': arrows }]}>
				<div class="post-footer__controls">
					{#if votes === 'likes'}
						<PostButton kind="like" title="Лайк" value={score.up || undefined} active={score.myVote === 1} onclick={() => votePost(post, 1)} />
					{/if}
					<PostButton kind="comments" title="Комментарии" href="#comments" {iconSize} value={post.commentsCount} onclick={scrollToComments} />
					<PostButton kind="repost" title="Сделать репост" {iconSize} />
					<PostButton kind="bookmark" title="В закладки" {iconSize} active={post.isFavorited} onclick={() => toggleFavoritePost(post)} />
					{#if arrows}
						<PostButton kind="share" title="Поделиться" {iconSize} onclick={() => sharePost(post)} />
					{/if}
				</div>

				{#if votes === 'likes'}
					<PostButton kind="dislike" title="Дизлайк" right value={score.down || undefined} active={score.myVote === -1} onclick={() => votePost(post, -1)} />
				{:else if votes === 'rating'}
					<Rating value={score.up - score.down} myVote={score.myVote} onvote={(sign) => votePost(post, sign)} />
				{/if}
			</div>

			<AuthorCard author={post.author} />
		</div>
	</div>
</div>

<style>
	.post-page {
		display: flex;
		justify-content: center;
		width: 100%;
		max-width: 1020px;
		/* внутри обёртки PostContent (блок, а не flex) — центрируем сами */
		margin: 0 auto;
		padding-top: 24px;
		padding-bottom: 30px;
		background-color: #fff;
		/* медиа на всю ширину страницы: width: 100cqw */
		container-type: inline-size;
	}

	/* У DTF колонка текста 600px, на очень широких экранах (≥1560px, как и у комментариев) — 640px */
	.post-container {
		width: 100%;
		max-width: 600px;
	}

	@media (min-width: 1560px) {
		.post-container {
			max-width: 640px;
		}
	}

	.post-content {
		position: relative;
		font-size: 17px;
		line-height: 26px;
		overflow-wrap: break-word;
	}

	/* Текст под панелью — на 12px, картинка — на свои 24px (отступы схлопываются, берётся большой) */
	.post-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 32px;
		margin-bottom: 12px;
		color: var(--text-muted);
		font-size: 15px;
		line-height: 22px;
	}

	.post-actions__views {
		margin-left: auto;
	}

	.post-footer {
		display: flex;
		align-items: center;
		margin-top: 24px;
		font-size: 15px;
	}

	.post-actions--arrows {
		--post-button-value-gap: 4px;
	}

	.post-footer__controls {
		display: flex;
		gap: 20px;
	}

	.post-footer--arrows .post-footer__controls {
		--post-button-value-gap: 4px;
		gap: 33px;
	}

	@media (min-width: 640px) {
		.post-page {
			border-radius: 0 0 8px 8px;
		}
	}

	@media (max-width: 859px) {
		.post-page {
			padding-top: 16px;
			padding-bottom: 16px;
		}

		.post-actions {
			gap: 24px;
		}

		/* «Поделиться» наверху на мобильном не показывается (lm-hidden у DTF) */
		.post-actions__share {
			display: none;
		}

		.post-footer {
			margin-top: 12px;
		}
	}

	@media (max-width: 639px) {
		.post-container {
			padding-left: 16px;
			padding-right: 16px;
		}
	}
</style>
