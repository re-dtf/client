<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Post } from '$lib/api/types';
	import { animatedAvatar } from '$lib/actions/animatedAvatar.svelte';
	import { preloadIntent } from '$lib/actions/preloadIntent';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { getPostPath, getProfilePath, openPost, openProfile } from '$lib/navigation';
	import { votesOf } from '$lib/reactions';
	import { sanitizeHtml } from '$lib/sanitize';
	import { authorZoneMenu, profileContextMenu, reactToPost, votePost, withActions } from './actions.svelte';
	import { formatFullDate, formatTime } from './format';
	import PostButton from './post/PostButton.svelte';
	import Rating from './post/Rating.svelte';
	import Reactions from './post/Reactions.svelte';
	import { themeSettings } from './themeSettings.svelte';
	import PlusBadge from './ui/PlusBadge.svelte';

	let { post: rawPost }: { post: Post } = $props();

	let elevated = $state(false);
	let votes = $derived(themeSettings.votes);
	let arrows = $derived(votes === 'rating');
	let arrowsLeft = $derived(arrows && themeSettings.arrowsSide === 'left');
	let iconSize = $derived(arrows ? 22 : 20);

	let post = $derived(withActions(rawPost));
	let owner = $derived(post.subsite ?? post.author);
	let score = $derived(votesOf(post));
	let postPath = $derived(resolve(getPostPath(post) as any));
	let commentsPath = $derived(resolve(getPostPath(post, 'comments') as any));
	let onreact = $derived(post.sourceId === 'dtf' ? (id: number) => reactToPost(post, id) : undefined);
	const onopenchange = (open: boolean) => {
		elevated = open;
	};

	/** Картинка первого медиа-блока записи для превью справа */
	let thumb = $derived.by(() => {
		for (const block of post.blocks) {
			if (block.type !== 'media') continue;
			const uuid = block.data?.items?.find((item: any) => item.image?.data?.uuid)?.image.data.uuid;
			if (uuid) return getLeonardoUrl(uuid, { scale_crop: '192x144' });
		}
	});
</script>

{#snippet commentsButton()}
	{#if !post.commentsDisabled}
		<PostButton
			kind="comments"
			title="Комментарии"
			href={commentsPath}
			{iconSize}
			value={post.commentsCount}
			onclick={(e) => openPost(e, post, { toComments: true })}
		/>
	{/if}
{/snippet}

<article class={['search-simple', { 'search-simple--elevated': elevated }]}>
	<a
		class="search-simple__link"
		href={postPath}
		aria-label={post.title || 'Открыть запись'}
		onclick={(e) => openPost(e, post)}
		use:preloadIntent={post}
	></a>
	<div class="search-simple__body">
		<div class="search-simple__meta" {@attach authorZoneMenu(() => owner)}>
			<a class="search-simple__owner" href={resolve(getProfilePath(owner.id) as any)} onclick={(e) => openProfile(e, owner.id)} {@attach profileContextMenu(owner)}>
				{#if owner.avatarUrl}
					<img class="search-simple__avatar" src={owner.avatarUrl} alt="" loading="lazy" {@attach animatedAvatar(owner.avatarUrl)} />
				{/if}
				<span class="search-simple__author">{owner.name}</span>
			</a>
			{#if !post.subsite && post.author.isPlus}
				<span class="search-simple__plus"><PlusBadge author={post.author} size={16} /></span>
			{/if}
			<a class="search-simple__time" href={postPath} title={formatFullDate(post.createdAt)} onclick={(e) => openPost(e, post)}>
				<time datetime={post.createdAt}>{formatTime(post.createdAt)}</time>
			</a>
		</div>
		{#if post.title}
			<div class="search-simple__title">{post.title}</div>
		{/if}
		{#if post.searchSnippet}
			<div class="search-simple__text">{@html sanitizeHtml(post.searchSnippet)}</div>
		{/if}
		<div class={['search-simple__footer', { 'search-simple__footer--arrows': arrows, 'search-simple__footer--arrows-left': arrowsLeft }]}>
			{#if votes === 'reactions'}
				<Reactions compact reactions={post.reactions} {onreact} {onopenchange} />
				{@render commentsButton()}
			{:else if votes === 'likes'}
				<PostButton
					kind="like"
					title="Лайк"
					value={score.up || undefined}
					active={score.myVote === 1}
					reactions={post.reactions}
					{onreact}
					{onopenchange}
					onclick={() => votePost(post, 1)}
				/>
				{@render commentsButton()}
				<PostButton
					kind="dislike"
					title="Дизлайк"
					right
					value={score.down || undefined}
					active={score.myVote === -1}
					reactions={post.reactions}
					{onreact}
					{onopenchange}
					onclick={() => votePost(post, -1)}
				/>
			{:else}
				{@render commentsButton()}
				<div class="search-simple__rating">
					<Rating
						value={score.up - score.down}
						myVote={score.myVote}
						reactions={post.reactions}
						onvote={(sign) => votePost(post, sign)}
						{onreact}
						{onopenchange}
					/>
				</div>
			{/if}
		</div>
	</div>
	{#if thumb}
		<img class="search-simple__thumb" src={thumb} alt="" loading="lazy" />
	{/if}
</article>

<style>
	.search-simple {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 16px;
		padding: 20px;
		border-radius: 8px;
		background: var(--bg-card);
		color: inherit;
		text-decoration: none;
		transition: background-color 0.15s ease;
	}

	.search-simple--elevated {
		z-index: 20;
	}

	.search-simple__link {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
	}

	@media (hover: hover) {
		.search-simple:has(> .search-simple__link:hover, .search-simple__time:hover) {
			background: color-mix(in srgb, var(--bg-card) 97%, var(--text-primary));
		}

		.search-simple__owner:hover .search-simple__author {
			color: var(--text-link);
		}
	}

	.search-simple__body {
		flex: 1;
		min-width: 0;
	}

	.search-simple__thumb {
		flex-shrink: 0;
		width: 96px;
		height: 72px;
		border-radius: 6px;
		background: var(--bg-media-frame);
		object-fit: cover;
	}

	.search-simple__meta {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
		font-size: 13px;
		line-height: 20px;
		pointer-events: none;
	}

	.search-simple__owner {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		color: inherit;
		text-decoration: none;
		pointer-events: auto;
	}

	.search-simple__plus {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		pointer-events: auto;
	}

	.search-simple__avatar {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		border-radius: 6px;
		object-fit: cover;
	}

	.search-simple__author {
		overflow: hidden;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.search-simple__time {
		color: var(--text-muted);
		text-decoration: none;
		white-space: nowrap;
		pointer-events: auto;
	}

	.search-simple__title {
		margin-bottom: 4px;
		font-size: 17px;
		font-weight: 500;
		line-height: 24px;
		overflow-wrap: anywhere;
	}

	.search-simple__text {
		display: -webkit-box;
		overflow: hidden;
		color: var(--text-secondary);
		font-size: 15px;
		line-height: 22px;
		overflow-wrap: anywhere;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	.search-simple__text :global(mark) {
		background: var(--bg-highlight);
		color: inherit;
		font-weight: 500;
	}

	.search-simple__footer {
		position: relative;
		z-index: 2;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 20px;
		margin-top: 10px;
		font-size: 15px;
		pointer-events: none;
	}

	.search-simple__footer > :global(*) {
		pointer-events: auto;
	}

	.search-simple__footer > :global(.post-reactions) {
		min-width: 0;
		max-width: 100%;
	}

	.search-simple__footer--arrows {
		--post-button-value-gap: 4px;
		gap: 10px 33px;
	}

	.search-simple__rating {
		display: flex;
		margin-left: auto;
	}

	.search-simple__footer--arrows-left {
		gap: 10px 20px;
	}

	.search-simple__footer--arrows-left .search-simple__rating {
		order: -1;
		margin: 0;
	}

	@media (max-width: 859px) {
		.search-simple {
			border-radius: 0;
		}

		.search-simple__footer--arrows {
			gap: 10px 24px;
		}

		.search-simple__footer--arrows-left {
			gap: 10px 16px;
		}
	}

	@media (max-width: 639px) {
		.search-simple {
			padding: 16px;
		}

		.search-simple__thumb {
			width: 72px;
			height: 72px;
		}
	}
</style>
