<script lang="ts">
	import type { Post } from '$lib/api/types';
	import { openOverlay } from '$lib/navigation';
	import { authStorage } from '$lib/storage/auth.svelte';
	import NetworkErrorState from '$lib/components/NetworkErrorState.svelte';
	import { formatTime } from './format';
	import { loadOnVisible } from './loadOnVisible';
	import { Button, Preloader } from './ui';

	/*
	 * Страница черновиков. У DTF она открывается по /u/me/drafts, в архиве 2023 года её нет (нужен вход),
	 * поэтому вид собран из карточек ленты: белая карточка со временем, заголовком и началом текста.
	 * Клик открывает черновик в редакторе.
	 */
	let {
		posts,
		loaded,
		loading,
		error,
		hasMore,
		loadMore,
		onretry,
		onopen
	}: {
		posts: Post[];
		loaded: boolean;
		loading: boolean;
		error: unknown;
		hasMore: boolean;
		loadMore: () => void;
		onretry: () => void;
		onopen: (post: Post) => void;
	} = $props();

	/** Начало текста черновика: первый текстовый блок без разметки */
	function preview(post: Post): string {
		const html = post.blocks.find((block) => block.type === 'text' && block.data?.text)?.data.text ?? '';
		return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';
	}
</script>

<div class="drafts-page">
	{#if !authStorage.isAuthenticated}
		<div class="drafts-empty">
			<p>Войдите, чтобы увидеть черновики</p>
			<Button label="Войти" onclick={() => openOverlay({ type: 'login' })} />
		</div>
	{:else if error && posts.length === 0}
		<NetworkErrorState {error} title="Не удалось загрузить черновики" {onretry} />
	{:else}
		{#each posts as post (post.id)}
			{@const text = preview(post)}
			<button type="button" class="draft" onclick={() => onopen(post)}>
				<span class="draft__meta">
					<span class="draft__label">Черновик</span>
					<time datetime={post.createdAt}>{formatTime(post.createdAt, true)}</time>
				</span>
				<span class={['draft__title', { 'draft__title--empty': !post.title }]}>{post.title || 'Без заголовка'}</span>
				{#if text}
					<span class="draft__text">{text}</span>
				{/if}
			</button>
		{/each}

		{#if loaded && posts.length === 0}
			<p class="drafts-empty">Черновиков нет</p>
		{/if}

		{#if hasMore}
			<div class="drafts-more" {@attach loadOnVisible(loadMore)}>
				{#if loading}<Preloader />{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.drafts-page {
		width: 100%;
		max-width: var(--content-width);
		padding: 16px 0;
		color: var(--text-primary);
	}

	.draft {
		display: flex;
		flex-direction: column;
		gap: 6px;
		box-sizing: border-box;
		width: 100%;
		margin-top: 28px;
		padding: 20px;
		border-radius: 8px;
		background: var(--bg-card);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.draft:first-child {
		margin-top: 0;
	}

	.draft:hover {
		background: var(--bg-card-hover);
	}

	.draft__meta {
		display: flex;
		gap: 8px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 20px;
	}

	.draft__label {
		font-weight: 500;
	}

	.draft__title {
		font-size: 22px;
		font-weight: 500;
		line-height: 30px;
		overflow-wrap: anywhere;
	}

	.draft__title--empty {
		color: var(--text-muted);
	}

	.draft__text {
		display: -webkit-box;
		overflow: hidden;
		color: var(--text-secondary);
		font-size: 17px;
		line-height: 26px;
		overflow-wrap: anywhere;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	.drafts-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 40px 20px;
		color: var(--text-muted);
		text-align: center;
	}

	.drafts-more {
		display: flex;
		justify-content: center;
		min-height: 40px;
		padding: 20px 0;
	}

	@media (max-width: 859px) {
		.drafts-page {
			padding: 0 0 16px;
		}

		.draft {
			margin-top: 20px;
			border-radius: 0;
		}
	}

	@media (max-width: 639px) {
		.draft {
			padding: 16px;
		}
	}
</style>
