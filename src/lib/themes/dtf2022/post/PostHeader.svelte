<script lang="ts">
	import type { Post } from '$lib/api/types';
	import { resolve } from '$app/paths';
	import { getPostPath, getProfilePath, openPost, openProfile } from '$lib/overlays';
	import { formatFullDate, formatTime } from '../format';

	let {
		post,
		variant = 'card',
		subscribe = false
	}: {
		post: Pick<Post, 'id' | 'sourceId' | 'author' | 'subsite' | 'createdAt' | 'isPinned'>;
		/** card — карточка в ленте и встроенный пост, page — страница поста */
		variant?: 'card' | 'page';
		/** Кнопка «Подписаться» справа */
		subscribe?: boolean;
	} = $props();

	// В личном блоге подсайт — это сам автор, второй раз имя не показываем
	let isPersonalBlog = $derived(!!post.subsite && post.subsite.id === post.author.id);
	let showSubscribe = $derived(subscribe && !!post.subsite && !post.subsite.isSubscribed);
</script>

<div class={['post-header', { 'post-header--card': variant === 'card' }]}>
	<div class="post-header__info">
		{#if post.subsite}
			{@const subsite = post.subsite}
			<div class="post-header__item post-header-subsite">
				<a href={resolve(getProfilePath(subsite.id) as any)} onclick={(e) => openProfile(e, subsite.id)}>
					<div class="post-header-subsite__avatar">
						{#if subsite.avatarUrl}
							<img src={subsite.avatarUrl} alt="" />
						{/if}
					</div>
					<div class="post-header-subsite__name">{subsite.name}</div>
				</a>
			</div>
		{/if}

		{#if !isPersonalBlog}
			<div class="post-header__item post-header-author">
				<a
					class="post-header-author__name"
					href={resolve(getProfilePath(post.author.id) as any)}
					onclick={(e) => openProfile(e, post.author.id)}
				>
					{post.author.name}
				</a>
				{#if variant === 'page' && post.author.isPlus}
					<div class="post-header-author__badge" title="Plus">
						<svg class="icon" width="20" height="20" aria-hidden="true">
							<use href="/icons.svg#ui_badge_plus"></use>
						</svg>
					</div>
				{/if}
			</div>
		{/if}

		<a class="post-header__item post-header-time" href={resolve(getPostPath(post) as any)} onclick={(e) => openPost(e, post)}>
			{#if variant === 'page'}
				<!-- Как у DTF: на узких экранах время в дате не показываем -->
				<time class="time time--full" datetime={post.createdAt} title={formatFullDate(post.createdAt)}>
					{formatTime(post.createdAt, true)}
				</time>
				<time class="time time--short" datetime={post.createdAt} title={formatFullDate(post.createdAt)}>
					{formatTime(post.createdAt, false)}
				</time>
			{:else}
				<time class="time" datetime={post.createdAt} title={formatFullDate(post.createdAt)}>
					{formatTime(post.createdAt)}
				</time>
			{/if}
		</a>

		{#if post.isPinned}
			<div class="post-header__item post-header-pin" title="Закреплено">
				<svg class="icon" width="11" height="11" aria-hidden="true">
					<use href="/icons.svg#ui_pin"></use>
				</svg>
			</div>
		{/if}
	</div>

	{#if showSubscribe}
		<div class="spacer"></div>

		<!-- ponytail: подписки в API клиента пока нет -->
		<div class="post-header__item post-header__subscribe">
			<button class="subscribe-button">
				<span class="subscribe-button__icon">
					<svg height="20" width="20" class="icon" aria-hidden="true">
						<use href="/icons.svg#v_follow"></use>
					</svg>
				</span>
				<span class="subscribe-button__label">Подписаться</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.post-header {
		display: flex;
		align-items: center;
		height: 32px;
		margin-bottom: 12px;
		font-size: 15px;
		line-height: 22px;
	}

	.post-header--card {
		height: 40px;
		margin-bottom: 10px;
		padding: 16px 20px 0;
	}

	.post-header__info {
		display: flex;
		align-items: baseline;
		min-width: 0;
	}

	.post-header__info:not(:last-child) {
		margin-right: 8px;
	}

	.post-header__item {
		min-width: 0;
		white-space: nowrap;
	}

	.post-header__item:not(:last-child) {
		margin-right: 14px;
	}

	.spacer {
		flex: 1;
	}

	/* Подсайт */
	.post-header-subsite {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		font-weight: 500;
	}

	.post-header-subsite__avatar {
		position: absolute;
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		margin-right: 8px;
		overflow: hidden;
		border-radius: 6px;
	}

	.post-header-subsite__avatar img {
		width: 22px;
		height: 22px;
	}

	.post-header-subsite__name {
		max-width: 200px;
		margin-left: 30px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Автор */
	.post-header-author {
		display: flex;
		align-items: center;
	}

	.post-header-author__name {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.post-header-author__badge {
		display: flex;
		margin-left: 5px;
	}

	/* Время и закреп */
	.post-header-time {
		display: flex;
		align-items: center;
		flex-shrink: 1;
		min-width: 0;
		color: var(--text-muted);
	}

	.post-header-time:hover {
		color: var(--text-link);
	}

	.time {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.time--short {
		display: none;
	}

	.post-header-pin {
		position: relative;
		display: flex;
		color: var(--text-muted);
	}

	/* Подписка */
	.post-header__subscribe {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.subscribe-button {
		--offset: 8px;
		display: flex;
		align-items: center;
		color: var(--text-link);
		font-size: 14px;
		white-space: nowrap;
		cursor: pointer;
	}

	.subscribe-button__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.subscribe-button__icon:not(:only-child) {
		margin-left: calc(var(--offset) * 0.75);
		margin-right: calc(var(--offset) * -0.5);
	}

	.subscribe-button__label {
		padding: 0 0 0 var(--offset);
		margin: 0 auto;
		font-weight: 500;
		line-height: 21px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (min-width: 860px) {
		.post-header__item:not(:last-child) {
			margin-right: 24px;
		}
	}

	@media (max-width: 859px) {
		.post-header {
			margin-bottom: 8px;
		}

		.post-header--card {
			margin-bottom: 12px;
		}

		.post-header__info {
			overflow: hidden;
		}

		.post-header-subsite__name {
			max-width: 112px;
		}

		.time--full {
			display: none;
		}

		.time--short {
			display: block;
		}
	}

	@media (max-width: 639px) {
		.post-header--card {
			padding-left: 16px;
			padding-right: 16px;
		}
	}
</style>
