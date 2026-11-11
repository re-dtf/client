<script lang="ts">
	import type { Post } from '$lib/api/types';
	import { addIgnoredTag, filterSettings, normalizeTag, removeIgnoredTag } from '$lib/storage/filter.svelte';
	import PostCard from './post/PostCard.svelte';
	import Popover from './ui/Popover.svelte';
	import { notify } from './ui/notify.svelte';

	/*
	 * Страница тега: заголовок с названием (первая буква заглавная, как у DTF) и записи.
	 * У DTF под заголовком полоса «Все / Лучшие», а в заголовке меню «⋯» («Не показывать тег»). Полосы нет: API отдаёт тег
	 * одним списком без «Лучших», и одна «Все» ничего бы не делала. Метода скрытия тега в записях нет, поэтому «Не показывать
	 * тег» кладёт его в локальный чёрный список (он работает и без входа).
	 */
	let { tag, posts }: { tag: string; posts: Post[] } = $props();

	let title = $derived(tag.charAt(0).toUpperCase() + tag.slice(1));
	let ignored = $derived(filterSettings.value.tags.includes(normalizeTag(tag)));
	let menuOpen = $state(false);

	function toggleIgnored() {
		if (ignored) {
			removeIgnoredTag(tag);
			notify.success(`Тег #${title} снова показывается`);
		} else {
			addIgnoredTag(tag);
			notify.success(`Тег #${title} скрыт`);
		}
	}
</script>

<div class="tag-page">
	<div class="tag-head">
		<h1 class="tag-head__title">#{title}</h1>
		<Popover
			bind:open={menuOpen}
			items={[{ value: 'ignore', label: ignored ? 'Показывать тег' : 'Не показывать тег', icon: 'v_eye', hint: 'Только у вас: записи с этим тегом не будут показываться' }]}
			onselect={toggleIgnored}
			width="max-content"
			label="Действия с тегом"
		>
			<button type="button" class="tag-head__etc" title="Больше" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
				<svg class="icon" width="16" height="20" aria-hidden="true">
					<use href="/icons.svg#v_etc"></use>
				</svg>
			</button>
		</Popover>
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
		flex: 1;
		min-width: 0;
		overflow: hidden;
		margin: 0;
		font-size: 30px;
		font-weight: 600;
		line-height: 38px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Как .etc_control у DTF: серая, при открытом меню чёрная */
	.tag-head__etc {
		display: flex;
		align-items: center;
		margin-left: 14px;
		color: var(--text-muted);
		cursor: pointer;
	}

	.tag-head__etc[aria-expanded='true'] {
		color: var(--text-primary);
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
