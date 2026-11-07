<script lang="ts">
	import type { Post } from '$lib/api/types';
	import PostCard from './post/PostCard.svelte';

	/*
	 * Страница тега: заголовок с названием (первая буква заглавная, как у DTF) и записи.
	 * У DTF под заголовком полоса «Все / Лучшие», а в заголовке меню «⋯» («Не показывать тег»). Полосы нет: API отдаёт тег
	 * одним списком без «Лучших», и одна «Все» ничего бы не делала; метода скрытия тега в записях тоже нет.
	 */
	let { tag, posts }: { tag: string; posts: Post[] } = $props();

	let title = $derived(tag.charAt(0).toUpperCase() + tag.slice(1));
</script>

<div class="tag-page">
	<div class="tag-head">
		<h1 class="tag-head__title">#{title}</h1>
	</div>

	<!-- Отступ между заголовком и первой записью тот же, что между записями ленты -->
	{#each posts as post (post.sourceId + '_' + post.id)}
		<PostCard {post} />
	{/each}

	{#if posts.length === 0}
		<p class="tag-empty">Записей с таким тегом нет</p>
	{/if}
</div>

<style>
	.tag-page {
		width: 100%;
		max-width: var(--content-width);
		/* Отступ страницы у DTF: 16px сверху на широком экране, снизу под последним постом */
		padding: 16px 0;
	}

	.tag-head {
		display: flex;
		align-items: center;
		box-sizing: border-box;
		padding: 20px;
		border-radius: 8px;
		background: var(--bg-card);
		color: var(--text-primary);
	}

	/* Строка выше шрифта: у overflow обрезаются выносные элементы букв («р», «у», «д») */
	.tag-head__title {
		overflow: hidden;
		margin: 0;
		font-size: 30px;
		font-weight: 600;
		line-height: 38px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tag-empty {
		margin-top: 28px;
		padding: 40px 20px;
		color: var(--text-muted);
		text-align: center;
	}

	@media (max-width: 859px) {
		.tag-page {
			padding: 0 0 16px;
		}

		/* На узком экране записи ленты во всю ширину и без скруглений, заголовок так же */
		.tag-head {
			border-radius: 0;
		}

		.tag-empty {
			margin-top: 20px;
		}
	}

	@media (max-width: 639px) {
		.tag-head {
			padding: 18px 16px;
		}
	}
</style>
