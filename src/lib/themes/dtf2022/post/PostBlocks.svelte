<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Block, Post } from '$lib/api/types';
	import DOMPurify from 'dompurify';
	import { fromAction } from 'svelte/attachments';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { openLightbox } from '$lib/navigation';
	import PostCard from './PostCard.svelte';
	import { FEED_MEDIA_MAX_HEIGHT, isWideMedia, mediaMaxWidth } from '../media';

	/*
	 * Блоки редактора DTF. Каждый блок — .post-block.post-block--{тип}.
	 * Варианты: card — превью в ленте, page — страница поста, embed — встроенный пост на странице.
	 * в исходной вёрстке есть только заголовок, текст, медиа и встроенный пост —
	 * для остальных типов стили минимальные.
	 */
	let {
		blocks,
		title,
		variant
	}: {
		blocks: Block[];
		/** Заголовок поста — первым блоком */
		title?: string;
		variant: 'card' | 'page' | 'embed';
	} = $props();

	const HEADINGS = ['h2', 'h3', 'h4'];

	const sanitize = (html: string) => DOMPurify.sanitize(html ?? '', { ADD_ATTR: ['target'] });

	// YouTube подгружаем только по клику
	let playingVideos = $state<Record<string, boolean>>({});

	/*
	 * hidden у блока DTF — это спойлер (см. editor/tools/SpoilerTune.ts), а не «не показывать».
	 * Подряд идущие спойлеры сворачиваем в одну плашку, по клику показываем как обычные блоки.
	 * в исходной вёрстке спойлеров нет — плашка минимальная.
	 */
	type Segment = { block: Block } | { spoiler: Block[]; key: number };
	let segments = $derived.by(() => {
		const result: Segment[] = [];
		blocks.forEach((block, index) => {
			const last = result.at(-1);
			if (!block.hidden) result.push({ block });
			else if (last && 'spoiler' in last) last.spoiler.push(block);
			else result.push({ spoiler: [block], key: index });
		});
		return result;
	});
	let revealed = $state<Record<number, boolean>>({});

	function isVideo(image: any) {
		const type = image?.data?.type;
		return image?.type === 'movie' || type === 'mp4' || type === 'gif' || image?.data?.isVideo;
	}

	/** На странице поста горизонтальное медиа — на всю ширину и без ограничения высоты (см. media.ts) */
	const isFullWidth = (data: any) => variant === 'page' && isWideMedia(data?.width, data?.height);

	function figureClass(data: any) {
		if (variant === 'card') return 'post-block post-block--media';
		return ['media-figure', { 'media-figure--column': variant === 'page' && !isFullWidth(data) }];
	}

	const avatar = (subsite: any) =>
		subsite?.avatar?.data?.uuid ? getLeonardoUrl(subsite.avatar.data.uuid, { scale_crop: '64x64' }) : undefined;

	/** Встроенный пост (osnovaEmbed) → Post для карточки */
	function embedToPost(embed: any): Post {
		return {
			id: embed.original_id,
			sourceId: 'dtf',
			title: embed.title || '',
			blocks: embed.blocks || [],
			author: { id: embed.author?.id || 0, name: embed.author?.name || 'Аноним', avatarUrl: avatar(embed.author) },
			subsite: embed.subsite ? { id: embed.subsite.id, name: embed.subsite.name, avatarUrl: avatar(embed.subsite) } : undefined,
			commentsCount: 0,
			createdAt: new Date((embed.date || 0) * 1000).toISOString()
		};
	}
</script>

<!--
	Рамка (серые поля, если картинка уже колонки) → заглушка с пропорциями и цветом → img/video.
	Размеры берём из данных картинки, ограничение высоты — как на DTF (см. media.ts).
-->
{#snippet placeholder(data: any, kind: 'video' | undefined, content: Snippet)}
	{@const maxWidth = mediaMaxWidth(data?.width, data?.height, isFullWidth(data) ? Infinity : FEED_MEDIA_MAX_HEIGHT)}
	<div class="media-frame" style:--media-max-w={maxWidth ? `${maxWidth}px` : '100%'}>
		<div
			class={['media-placeholder', kind && `media-placeholder--${kind}`]}
			style:--media-w={data?.width || 16}
			style:--media-h={data?.height || 9}
			style:--media-bg={data?.color ? `#${data.color}` : undefined}
		>
			{@render content()}
		</div>
	</div>
{/snippet}

{#snippet figure(image: any, caption: string | undefined, gallery: any[])}
	<figure class={figureClass(image.data)}>
		{#snippet content()}
			{#if isVideo(image)}
				<video
					src={getLeonardoUrl(image.data.uuid, { format: 'mp4' })}
					muted
					loop
					playsinline
					preload="metadata"
					controls={!!image.data.has_audio}
					{@attach fromAction(lazyVideo)}
				></video>
			{:else}
				<img src={getLeonardoUrl(image.data.uuid, { width: variant === 'page' ? 2048 : 1024 })} alt={caption || ''} loading="lazy" />
				<!-- В ленте и во встроенном посте картинка открывает пост (ссылка поверх карточки), просмотр только на странице -->
				{#if variant === 'page'}
					<button
						class="media-placeholder__zoom"
						aria-label="Открыть изображение"
						onclick={(e) =>
							openLightbox(
								gallery.map((g) => g.data),
								gallery.indexOf(image),
								e.currentTarget.previousElementSibling as HTMLImageElement
							)}
					></button>
				{/if}
			{/if}
		{/snippet}
		{@render placeholder(image.data, undefined, content)}
		{#if caption}
			<figcaption class="media-caption">{caption}</figcaption>
		{/if}
	</figure>
{/snippet}

{#snippet renderBlock(block: Block)}
	{#if block.type === 'text'}
		<div class="post-block post-block--text">{@html sanitize(block.data.text)}</div>
	{:else if block.type === 'header'}
		<svelte:element this={HEADINGS.includes(block.data.style) ? block.data.style : 'h2'} class="post-block post-block--header">
			{@html sanitize(block.data.text)}
		</svelte:element>
	{:else if block.type === 'media'}
		<!-- Галерея просмотра — картинки этого блока (видео в неё не входят) -->
		{@const gallery = (block.data.items ?? []).map((item: any) => item.image).filter((image: any) => image?.data?.uuid && !isVideo(image))}
		{#each block.data.items ?? [] as item}
			{#if item.image?.data?.uuid}
				{@render figure(item.image, item.title, gallery)}
			{/if}
		{/each}
	{:else if block.type === 'video' && block.data.video?.data}
		{@const video = block.data.video.data}
		{@const youtubeId = video.external_service?.name === 'youtube' ? video.external_service.id : null}
		<figure class={figureClass(video.thumbnail?.data ?? video)}>
			{#snippet content()}
				{#if youtubeId && playingVideos[youtubeId]}
					<iframe
						src="https://www.youtube-nocookie.com/embed/{youtubeId}?autoplay=1"
						title={block.data.title || 'Видео'}
						allow="autoplay; encrypted-media; picture-in-picture"
						allowfullscreen
					></iframe>
				{:else}
					{#if video.thumbnail?.data?.uuid}
						<img src={getLeonardoUrl(video.thumbnail.data.uuid, { width: 1024 })} alt="" loading="lazy" />
					{/if}
					<button
						class="media-placeholder__play"
						aria-label="Смотреть: {block.data.title || 'видео'}"
						onclick={() => youtubeId && (playingVideos[youtubeId] = true)}
					>
						<svg class="icon-play" width="48" height="48" aria-hidden="true">
							<use href="/icons.svg#andropov_play_default"></use>
						</svg>
					</button>
				{/if}
			{/snippet}
				{@render placeholder(video.thumbnail?.data ?? video, 'video', content)}
			</figure>
		{:else if block.type === 'quote'}
			<blockquote class="post-block post-block--quote">
				{@html sanitize(block.data.text)}
				{#if block.data.subline1}
					<footer class="post-block__subline">{@html sanitize(block.data.subline1)}</footer>
				{/if}
			</blockquote>
		{:else if block.type === 'list'}
			<svelte:element this={block.data.type === 'OL' ? 'ol' : 'ul'} class="post-block post-block--list">
				{#each block.data.items ?? [] as item}
					<li>{@html sanitize(item)}</li>
				{/each}
			</svelte:element>
		{:else if block.type === 'delimiter'}
			<div class="post-block post-block--delimiter" role="separator">***</div>
		{:else if block.type === 'code'}
			<pre class="post-block post-block--code"><code>{block.data.text}</code></pre>
		{:else if block.type === 'link' && block.data.link?.data}
			{@const link = block.data.link.data}
			<div class="post-block post-block--link">
				<a href={link.url} target="_blank" rel="noopener noreferrer">{link.title || link.hostname || link.url}</a>
			</div>
		{:else if block.type === 'osnovaEmbed' && block.data.osnovaEmbed?.data}
			{#if variant === 'page' && !block.data.osnovaEmbed.data.isNotAvailable}
				<PostCard post={embedToPost(block.data.osnovaEmbed.data)} embed />
			{/if}
		{:else if variant === 'page'}
			<div class="post-block post-block--unknown">Блок «{block.type}» пока не поддерживается</div>
		{/if}
{/snippet}

<div class={['post-blocks', `post-blocks--${variant}`]}>
	{#if title}
		<div class="post-block post-block--title">{title}</div>
	{/if}

	{#each segments as segment}
		{#if 'block' in segment}
			{@render renderBlock(segment.block)}
		{:else if revealed[segment.key]}
			{#each segment.spoiler as block}
				{@render renderBlock(block)}
			{/each}
		{:else}
			<div class="post-block post-block--spoiler">
				<button class="post-spoiler" onclick={() => (revealed[segment.key] = true)}>
					<span class="post-spoiler__label">Спойлер</span>
					<span>Нажмите, чтобы показать</span>
				</button>
			</div>
		{/if}
	{/each}
</div>

<style>
	/*
	 * Правила вариантов page/embed пишем через «>»: встроенный пост — это тот же
	 * компонент внутри страницы, и правила страницы не должны протекать в него.
	 */
	.post-block {
		max-width: var(--content-width);
	}

	.post-block :global(a) {
		color: var(--text-link);
		border-bottom: 1px solid #bed0ea;
		cursor: pointer;
	}

	.post-block--title {
		margin-top: 12px;
		margin-bottom: 12px;
		font-size: 22px;
		font-weight: 500;
		line-height: 30px;
		overflow-wrap: break-word;
	}

	/* Карточки (лента и встроенный пост) — с внутренними отступами; медиа — на всю ширину карточки */
	.post-blocks--card > .post-block:not(.post-block--media),
	.post-blocks--embed > .post-block {
		padding-left: 20px;
		padding-right: 20px;
	}

	.post-blocks--card > .post-block--title,
	.post-blocks--embed > .post-block--title {
		margin-top: 10px;
		margin-bottom: 8px;
	}

	.post-blocks--card > figure,
	.post-blocks--embed > figure {
		margin-top: 12px;
		margin-bottom: 12px;
	}

	/* У DTF после заголовка медиа отстоит на 13px */
	.post-blocks--card > .post-block--title + figure,
	.post-blocks--embed > .post-block--title + figure {
		margin-top: 13px;
	}

	.post-blocks--card > figure:last-child,
	.post-blocks--embed > figure:last-child {
		margin-bottom: 4px;
	}

	/* Страница поста и встроенный пост */
	.post-blocks--page > .post-block,
	.post-blocks--embed > .post-block {
		margin-bottom: 12px;
	}

	/* На странице медиа идёт на всю ширину .post-page, а не колонки текста */
	.post-blocks--page > .media-figure {
		width: 100cqw;
		margin: 24px 0 24px 50%;
		transform: translateX(-50%);
	}

	/*
	 * Квадратные и вертикальные — в колонке текста (у DTF — .l-island-b).
	 * в исходной вёрстке этого нет — max-width: 100% !important на странице
	 * растягивал любое фото на всю ширину; правило взято из архива dtf.ru.
	 */
	.post-blocks--page > .media-figure--column {
		width: 100%;
		margin-left: 0;
		transform: none;
	}

	/* Медиа */
	.media-figure {
		display: flex;
		flex-direction: column;
	}

	/*
	 * Рамка как .content-image у DTF: если картинка уже колонки, по бокам видны серые поля,
	 * а сверху и снизу — 8px. Отступ включается только когда --media-max-w меньше ширины
	 * колонки: процент в padding считается от ширины, clamp режет его до 0 или 8px.
	 */
	.media-frame {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-block: clamp(0px, (100% - var(--media-max-w)) * 1000, 8px);
		background-color: rgba(0, 0, 0, 0.08);
	}

	.media-placeholder {
		position: relative;
		width: 100%;
		max-width: var(--media-max-w, 100%);
		aspect-ratio: var(--media-w) / var(--media-h);
		background: var(--media-bg);
		overflow: hidden;
	}

	.media-placeholder :is(img, video, iframe) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}

	/* Видео с кнопками и плеер YouTube поднимаем над ссылкой на пост (.post-link в PostCard), иначе клик по ним открывает пост */
	.media-placeholder :is(video[controls], iframe) {
		z-index: 2;
	}

	.media-placeholder--video {
		cursor: pointer;
	}

	.media-placeholder__play,
	.media-placeholder__zoom {
		position: absolute;
		inset: 0;
		z-index: 2;
		cursor: pointer;
	}

	.media-placeholder__zoom {
		cursor: zoom-in;
	}

	.icon-play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 48px;
		height: 48px;
	}

	.media-caption {
		margin-top: 8px;
		font-size: 0.9em;
		color: #666;
	}

	.post-blocks--card .media-caption,
	.post-blocks--embed .media-caption {
		padding: 0 20px;
	}

	/* Блоки, которых нет в исходной вёрстке */
	.post-block--header {
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
	}

	.post-block--quote {
		border-left: 3px solid rgba(0, 0, 0, 0.12);
		padding-left: 16px;
	}

	.post-blocks--card > .post-block--quote,
	.post-blocks--embed > .post-block--quote {
		margin-left: 20px;
		padding-left: 16px;
	}

	.post-block__subline {
		margin-top: 4px;
		color: var(--text-muted);
		font-size: 15px;
	}

	.post-block--list {
		padding-left: 1.5em;
	}

	.post-blocks--card > .post-block--list,
	.post-blocks--embed > .post-block--list {
		padding-left: calc(20px + 1.5em);
	}

	.post-block--delimiter {
		text-align: center;
		letter-spacing: 0.5em;
		color: var(--text-muted);
	}

	.post-block--code {
		overflow-x: auto;
		padding: 12px 16px;
		border-radius: 8px;
		background: #f5f5f5;
		font-size: 14px;
		line-height: 20px;
	}

	.post-spoiler {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 12px 16px;
		border-radius: 8px;
		background-color: rgba(0, 0, 0, 0.04);
		color: var(--text-muted);
		font: inherit;
		font-size: 15px;
		line-height: 22px;
		text-align: left;
		cursor: pointer;
	}

	.post-spoiler:hover {
		background-color: rgba(0, 0, 0, 0.06);
	}

	.post-spoiler__label {
		color: var(--text-primary);
		font-weight: 500;
	}

	.post-block--unknown {
		color: var(--text-muted);
		font-size: 15px;
		font-style: italic;
	}

	@media (max-width: 859px) {
		.post-blocks--page > .post-block--title {
			margin-top: 8px;
		}

		.post-blocks--card > .post-block--title,
		.post-blocks--embed > .post-block--title {
			margin-top: 12px;
		}
	}

	@media (max-width: 639px) {
		.post-blocks--card > .post-block:not(.post-block--media),
		.post-blocks--embed > .post-block {
			padding-left: 16px;
			padding-right: 16px;
		}

		.post-blocks--card .media-caption,
		.post-blocks--embed .media-caption {
			padding: 0 16px;
		}

		.post-blocks--card > .post-block--list,
		.post-blocks--embed > .post-block--list {
			padding-left: calc(16px + 1.5em);
		}
	}
</style>
