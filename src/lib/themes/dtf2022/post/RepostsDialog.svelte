<script lang="ts">
	import { untrack } from 'svelte';
	import type { Post } from '$lib/api/types';
	import { api } from '$lib/api/index.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import Preloader from '../ui/Preloader.svelte';
	import PostCard from './PostCard.svelte';

	/** Репосты (ответы) на пост: короткие карточки без футера, как встроенные посты */
	let { postId, onclose }: { postId: number; onclose: () => void } = $props();

	let posts = $state<Post[]>();
	let error = $state('');

	// Диалог создаётся под один пост, id не меняется
	api.getReposts(untrack(() => postId))
		.then((items) => (posts = items))
		.catch((e) => (error = e.message));

	// Переход по ссылке карточки открывает пост поверх, окно со списком тогда не нужно
	function closeOnLink(e: MouseEvent) {
		if ((e.target as Element).closest('a')) onclose();
	}
</script>

<!-- Ширина окна — колонка поста (640): карточки внутри совпадают с карточками ленты -->
<Dialog label="Репосты" width="640px" flush onClose={onclose}>
	<div class="reposts__header">
		Репосты
		<button type="button" class="reposts__close" aria-label="Закрыть" onclick={onclose}>
			<svg class="icon" width="24" height="24" aria-hidden="true">
				<use href="/icons.svg#v_close"></use>
			</svg>
		</button>
	</div>

	<!-- Прокручивается только список: шапка остаётся на месте, а поля слева и справа равны -->
	<div class="reposts__scroll">
		{#if error}
			<p class="reposts__note">{error}</p>
		{:else if !posts}
			<div class="reposts__note"><Preloader /></div>
		{:else if posts.length === 0}
			<p class="reposts__note">Репостов пока нет</p>
		{:else}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div class="reposts" onclick={closeOnLink}>
				{#each posts as post (post.id)}
					<PostCard {post} embed subscribe={false} />
				{/each}
			</div>
		{/if}
	</div>
</Dialog>

<style>
	/* Как шапка Popup темы: заголовок по центру, крестик справа */
	.reposts__header {
		position: relative;
		flex-shrink: 0;
		min-height: 65px;
		padding: 20px 56px 16px;
		box-sizing: border-box;
		border-bottom: 1px solid var(--border-color);
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
		text-align: center;
	}

	.reposts__close {
		position: absolute;
		top: 23px;
		right: 16px;
		color: var(--text-primary);
		opacity: 0.5;
		cursor: pointer;
	}

	.reposts__close:hover {
		opacity: 1;
	}

	.reposts__close .icon {
		display: block;
	}

	.reposts__scroll {
		min-height: 0;
		overflow-y: auto;
		scrollbar-gutter: stable both-edges;
	}

	.reposts {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px 16px;
	}

	.reposts :global(.feed-item--embed) {
		margin: 0;
	}

	.reposts__note {
		display: flex;
		justify-content: center;
		margin: 0;
		padding: 24px 20px;
		color: var(--text-muted);
	}
</style>
