<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Block } from '$lib/api/types';
	import { embedToPost } from '$lib/api/embed';
	import { sanitizeHtml } from '$lib/sanitize';
	import { linkifyHashtags } from '$lib/hashtags';
	import { fromAction } from 'svelte/attachments';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import { mediaHold } from '$lib/actions/mediaHold';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { resolve } from '$app/paths';
	import { openDtfLink, openLightbox, preloadLightbox } from '$lib/navigation';
	import { parseDtfUrl, dtfTargetToPath } from '$lib/dtfLinks';
	import PostCard from './PostCard.svelte';
	import UnknownBlock from '../UnknownBlock.svelte';
	import AudioBlock from './AudioBlock.svelte';
	import PersonBlock from './PersonBlock.svelte';
	import QuizBlock from './QuizBlock.svelte';
	import { FEED_MEDIA_MAX_HEIGHT, isWideMedia, mediaMaxWidth, mediaPreviewUrl } from '../media';

	/*
	 * Блоки редактора DTF. Каждый блок — .post-block.post-block--{тип}.
	 * Варианты: card — превью в ленте, page — страница поста, embed — встроенный пост на странице.
	 * в исходной вёрстке есть только заголовок, текст, медиа и встроенный пост —
	 * для остальных типов стили минимальные.
	 */
	let {
		blocks,
		title,
		editorial = false,
		warning,
		updating = false,
		variant,
		postId,
		sourceId,
		evictMedia = false
	}: {
		blocks: Block[];
		/** Заголовок поста — первым блоком */
		title?: string;
		/** Материал редакции: галочка после заголовка */
		editorial?: boolean;
		/** Плашка редакции после заголовка («Обновление») */
		warning?: { title: string; text: string };
		/** Материал дополняется: пометка «Дополняется» после последнего блока */
		updating?: boolean;
		variant: 'card' | 'page' | 'embed';
		postId?: number | string;
		sourceId?: string;
		evictMedia?: boolean;
	} = $props();

	const HEADINGS = ['h2', 'h3', 'h4'];

	// Галочка липнет к последнему слову, чтобы не оказаться на строке одна (как .content-title__last-word)
	let titleParts = $derived.by(() => {
		const text = title?.trim() ?? '';
		const split = text.lastIndexOf(' ') + 1;
		return { head: text.slice(0, split), last: text.slice(split) };
	});

	const sanitize = (html: string) => sanitizeHtml(html ?? '');
	/** Текст записи: `#теги` в нём — ссылки на страницу тега */
	const withTags = (html: string) => linkifyHashtags(sanitize(html));

	function handleContainerClick(e: MouseEvent) {
		if (e.button !== 0 && e.button !== 1) return;
		const a = (e.target as Element)?.closest?.('a');
		const href = a?.getAttribute('href');
		if (href) openDtfLink(e, href);
	}

	// YouTube подгружаем только по клику
	let playingVideos = $state<Record<string, boolean>>({});

	/*
	 * hidden у блока DTF — это спойлер (см. editor/tools/SpoilerTune.ts), а не «не показывать».
	 * Как у DTF: каждый скрытый блок — под плашкой «Содержание скрыто» своего размера, по клику плашка исчезает.
	 */
	let revealed = $state<Record<number, boolean>>({});

	/** Низкий блок (меньше столбца из текста и кнопки) — плашка в одну строку, как .block-hidden--low у DTF */
	const LOW_HIDDEN_HEIGHT = 60;
	const lowWhenShort = (el: HTMLElement) => {
		const observer = new ResizeObserver(() => el.toggleAttribute('data-low', el.offsetHeight < LOW_HIDDEN_HEIGHT));
		observer.observe(el);
		return () => observer.disconnect();
	};

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

</script>

<!--
	Рамка (серые поля, если картинка уже колонки) → заглушка с пропорциями и цветом → img/video.
	Размеры берём из данных картинки, ограничение высоты — как на DTF (см. media.ts).
-->
{#snippet placeholder(data: any, kind: 'video' | undefined, content: Snippet)}
	{@const maxWidth = mediaMaxWidth(data?.width, data?.height, isFullWidth(data) ? Infinity : FEED_MEDIA_MAX_HEIGHT)}
	<div class="media-frame" style:--media-max-w={maxWidth ? `${maxWidth}px` : '100%'}>
		<div
			class={['media-placeholder', kind && `media-placeholder--${kind}`, data?.base64preview && 'media-placeholder--preview']}
			style:--media-w={data?.width || 16}
			style:--media-h={data?.height || 9}
			style:--media-bg={data?.color ? `#${data.color}` : undefined}
			style:--media-preview={mediaPreviewUrl(data?.base64preview)}
		>
			{@render content()}
		</div>
	</div>
{/snippet}

{#snippet figure(image: any, caption: string | undefined, gallery: any[], anchorId?: string)}
	<figure class={figureClass(image.data)} id={anchorId}>
		{#snippet content()}
			{#if isVideo(image)}
				{#if !evictMedia}
					<video
						src={getLeonardoUrl(image.data.uuid, { format: 'mp4' })}
						muted
						loop
						playsinline
						preload="metadata"
						controls={!!image.data.has_audio}
						{@attach fromAction(lazyVideo)}
						use:mediaHold={{ uuid: image.data.uuid, isGif: image.data.type === 'gif' }}
					></video>
				{/if}
			{:else}
				{#if !evictMedia}
					<img
						src={getLeonardoUrl(image.data.uuid, { width: 1024 })}
						srcset={variant === 'page' ? `${getLeonardoUrl(image.data.uuid, { width: 1024 })} 1024w, ${getLeonardoUrl(image.data.uuid, { width: 2048 })} 2048w` : undefined}
						sizes={variant === 'page' ? '(max-width: 768px) 100vw, 1024px' : undefined}
						alt={caption || ''}
						loading="lazy"
					/>
				{/if}
				<!-- В ленте и во встроенном посте картинка открывает пост (ссылка поверх карточки), просмотр только на странице -->
				{#if variant === 'page' && !evictMedia}
					<button
						class="media-placeholder__zoom"
						aria-label="Открыть изображение"
						onpointerenter={preloadLightbox}
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
			<figcaption class="media-caption">{@html sanitize(caption)}</figcaption>
		{/if}
	</figure>
{/snippet}

{#snippet renderBlock(block: Block)}
	{@const anchorId = variant === 'page' ? (block.anchor || block.data?.anchor)?.trim() || undefined : undefined}
	{#if block.type === 'text'}
		<div class="post-block post-block--text" id={anchorId}>{@html withTags(block.data.text)}</div>
	{:else if block.type === 'header'}
		<svelte:element this={HEADINGS.includes(block.data.style) ? block.data.style : 'h2'} class="post-block post-block--header" id={anchorId}>
			{@html sanitize(block.data.text)}
		</svelte:element>
	{:else if block.type === 'media'}
		<!-- Галерея просмотра — картинки этого блока (видео в неё не входят) -->
		{@const gallery = (block.data.items ?? []).map((item: any) => item.image).filter((image: any) => image?.data?.uuid && !isVideo(image))}
		{@const validItems = (block.data.items ?? []).filter((item: any) => item.image?.data?.uuid)}
		{#if anchorId && validItems.length === 0}
			<div id={anchorId} class="post-block post-anchor"></div>
		{/if}
		{#each validItems as item, i}
			{@render figure(item.image, item.title, gallery, i === 0 ? anchorId : undefined)}
		{/each}
	{:else if block.type === 'video' && block.data.video?.data}
		{@const video = block.data.video.data}
		{@const youtubeId = video.external_service?.name === 'youtube' ? video.external_service.id : null}
		<figure class={figureClass(video.thumbnail?.data ?? video)} id={anchorId}>
			{#snippet content()}
				{#if youtubeId && playingVideos[youtubeId]}
					<iframe
						src="https://www.youtube-nocookie.com/embed/{youtubeId}?autoplay=1"
						title={block.data.title || 'Видео'}
						allow="autoplay; encrypted-media; picture-in-picture"
						allowfullscreen
					></iframe>
				{:else}
					{#if video.thumbnail?.data?.uuid && !evictMedia}
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
			<blockquote class="post-block post-block--quote" id={anchorId}>
				{@html sanitize(block.data.text)}
				{#if block.data.subline1}
					<footer class="post-block__subline">{@html sanitize(block.data.subline1)}</footer>
				{/if}
			</blockquote>
		{:else if block.type === 'list'}
			<svelte:element this={block.data.type === 'OL' ? 'ol' : 'ul'} class="post-block post-block--list" id={anchorId}>
				{#each block.data.items ?? [] as item}
					<li>{@html withTags(item)}</li>
				{/each}
			</svelte:element>
		{:else if block.type === 'delimiter'}
			<div class="post-block post-block--delimiter" id={anchorId} role="separator">***</div>
		{:else if block.type === 'code'}
			<pre class="post-block post-block--code" id={anchorId}><code>{block.data.text}</code></pre>
		{:else if block.type === 'link' && block.data.link?.data}
			{@const link = block.data.link.data}
			{@const dtfTarget = parseDtfUrl(link.url)}
			<div class="post-block post-block--link" id={anchorId}>
				{#if dtfTarget}
					<a
						href={resolve(dtfTargetToPath(dtfTarget) as any)}
						onclick={(e) => openDtfLink(e, link.url)}
						onauxclick={(e) => openDtfLink(e, link.url)}
					>{link.title || link.hostname || link.url}</a>
				{:else}
					<a href={link.url} target="_blank" rel="noopener noreferrer">{link.title || link.hostname || link.url}</a>
				{/if}
			</div>
		{:else if block.type === 'osnovaEmbed' && block.data.osnovaEmbed?.data}
			{#if variant === 'page' && !block.data.osnovaEmbed.data.isNotAvailable}
				<div class="post-block post-block--embed" id={anchorId}>
					<PostCard post={embedToPost(block.data.osnovaEmbed.data)} embed />
				</div>
			{/if}
		{:else if block.type === 'audio'}
			<div class="post-block post-block--audio"><AudioBlock data={block.data} /></div>
		{:else if block.type === 'quiz'}
			<div class="post-block post-block--quiz"><QuizBlock data={block.data} {postId} {sourceId} /></div>
		{:else if block.type === 'person'}
			<div class="post-block post-block--person"><PersonBlock data={block.data} /></div>
		{:else if variant === 'page'}
			<div class="post-block" id={anchorId}>
				<UnknownBlock type={block.type} {postId} {sourceId} />
			</div>
		{/if}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	class={['post-blocks', `post-blocks--${variant}`]}
	onclick={handleContainerClick}
	onauxclick={handleContainerClick}
>
	{#if title?.trim()}
		<div class="post-block post-block--title">
			{#if editorial}
				{titleParts.head}<span class="post-block__last-word">{titleParts.last}&nbsp;<span class="post-block__tick" role="img" aria-label="Материал редакции" title="Материал редакции"><svg width="24" height="24" aria-hidden="true"><use href="/icons.svg#v_editorial"></use></svg></span></span>
			{:else}
				{title.trim()}
			{/if}
		</div>
	{/if}

	{#if warning}
		<div class="post-block post-block--warning">
			<span class="post-block__warning-title">{warning.title}</span>
			{@html withTags(warning.text)}
		</div>
	{/if}

	{#each blocks as block, index}
		{#if !block.hidden || revealed[index]}
			{@render renderBlock(block)}
		{:else}
			<!-- Класс варианта нужен, чтобы блок внутри плашки получил те же отступы, что и снаружи -->
			<div class={['post-hidden', `post-blocks--${variant}`]} {@attach lowWhenShort}>
				<div class="post-hidden__cover">
					<div class="post-hidden__inner">
						<div class="post-hidden__text">Содержание скрыто</div>
						<button class="post-hidden__button" onclick={() => (revealed[index] = true)}>
							<svg width="20" height="20" aria-hidden="true"><use href="/icons.svg#v_eye"></use></svg>
							Показать
						</button>
					</div>
				</div>
				{@render renderBlock(block)}
			</div>
		{/if}
	{/each}

	{#if updating}
		<div class="post-block post-block--updating">
			<svg width="16" height="16" aria-hidden="true"><use href="/icons.svg#v_pencil_solid"></use></svg>Дополняется
		</div>
	{/if}
</div>

<style>
	/*
	 * Правила вариантов page/embed пишем через «>»: встроенный пост — это тот же
	 * компонент внутри страницы, и правила страницы не должны протекать в него.
	 */
	.post-block {
		max-width: var(--content-width);
		scroll-margin-top: calc(var(--header-height, 60px) + 8px);
	}

	.post-block :global(a) {
		color: var(--text-link);
		border-bottom: 1px solid var(--border-link);
		cursor: pointer;
	}

	/* .content-title__last-word из архива: слово и галочка держатся вместе, длинное слово всё равно переносится */
	.post-block__last-word {
		display: inline-block;
		word-break: break-word;
	}

	/* Галочка редакции: .content-editorial-tick из архива (у встроенного поста иконка 20px) */
	.post-block__tick {
		display: inline-block;
		margin-top: -4px;
		margin-left: -2px;
		line-height: 0;
		vertical-align: middle;
		color: var(--color-accent);
	}

	.post-block__tick svg {
		fill: currentColor;
	}

	.post-blocks--embed .post-block__tick svg {
		width: 20px;
		height: 20px;
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
	.post-blocks--card > .post-block:not(.post-block--media, .post-block--audio, .post-block--quiz),
	.post-blocks--embed > .post-block:not(.post-block--audio, .post-block--quiz) {
		padding-left: var(--island-offset-x, 16px);
		padding-right: var(--island-offset-x, 16px);
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
		scroll-margin-top: calc(var(--header-height, 60px) + 8px);
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
		background-color: var(--bg-media-frame);
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
		color: var(--text-caption);
	}

	.media-caption :global(a) {
		color: var(--text-link);
		border-bottom: 1px solid var(--border-link);
		cursor: pointer;
	}

	.post-blocks--card .media-caption,
	.post-blocks--embed .media-caption {
		padding: 0 var(--island-offset-x, 16px);
	}

	/* На странице поста подписи полноширинных медиа выравниваются по ширине контента */
	.post-blocks--page > .media-figure:not(.media-figure--column) > .media-caption {
		width: 100%;
		max-width: min(var(--inner-content-width), calc(100% - 2 * var(--text-gap, 0px)));
		margin-inline: auto;
		box-sizing: border-box;
	}

	/* Плеер и опрос интерактивны: поднимаем над ссылкой на пост в карточке, иначе клик открывает пост */
	.post-block--audio,
	.post-block--quiz {
		position: relative;
		z-index: 2;
	}

	.post-blocks--card > .post-block--audio :global(.audio-block),
	.post-blocks--embed > .post-block--audio :global(.audio-block) {
		border-left: 0;
		border-right: 0;
	}

	.post-blocks--card > .post-block--audio,
	.post-blocks--card > .post-block--quiz,
	.post-blocks--card > .post-block--person,
	.post-blocks--embed > .post-block--audio,
	.post-blocks--embed > .post-block--quiz {
		margin-top: 12px;
	}

	/* Блоки, которых нет в исходной вёрстке */
	.post-block--header {
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
	}

	.post-block--quote {
		border-left: 3px solid var(--border-subtle-3);
		padding-left: 16px;
	}

	.post-blocks--card > .post-block--quote,
	.post-blocks--embed > .post-block--quote {
		margin-left: 20px;
		padding-left: 16px;
	}

	/* Плашка «Обновление» от редакции: .block-warning из архива 2023 (фон #fffbe7, поля 20px, до 859px — 16px) */
	.post-block--warning {
		padding: 20px;
		background: var(--bg-warning, #fffbe7);
		overflow-wrap: break-word;
	}

	.post-block__warning-title {
		display: inline-block;
		margin-right: 2px;
		font-weight: 700;
	}

	@media (max-width: 859px) {
		.post-block--warning {
			padding: 16px;
		}
	}

	/* «Дополняется»: .content__updating из архива 2023 — серый текст и карандаш, который «пишет» */
	.post-blocks > .post-block--updating {
		margin: 8px 0;
		color: var(--text-muted);
	}

	.post-block--updating svg {
		position: relative;
		top: 1px;
		margin-right: 0.5em;
		fill: currentColor;
		transform-origin: 30% 60%;
		animation: post-updating-pencil 4.5s infinite cubic-bezier(0.45, 0.05, 0.55, 0.95);
	}

	@keyframes post-updating-pencil {
		0%,
		20%,
		45%,
		60%,
		80%,
		100% {
			transform: translate3d(0, 0, 0) rotate(0);
		}

		5%,
		25%,
		50%,
		65%,
		85% {
			transform: rotate(-15deg);
		}

		15%,
		40%,
		55%,
		75%,
		90%,
		95% {
			transform: translate3d(7px, 0, 0) rotate(-15deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.post-block--updating svg {
			animation: none;
		}
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
		padding-left: calc(var(--island-offset-x, 16px) + 1.5em);
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
		background: var(--bg-secondary);
		font-size: 14px;
		line-height: 20px;
	}

	/* Скрытый блок (спойлер): плашка поверх блока того же размера, как .block-hidden у DTF */
	.post-hidden {
		position: relative;
		z-index: 1;
	}

	.post-hidden__cover,
	.post-hidden__inner {
		display: flex;
		align-items: center;
	}

	.post-hidden__cover {
		position: absolute;
		inset: 0;
		z-index: 5;
		justify-content: center;
		overflow: hidden;
		background-color: var(--bg-hidden-block);
		font-size: 15px;
		line-height: 22px;
	}

	.post-hidden__inner {
		flex-direction: column;
	}

	.post-hidden:global([data-low]) .post-hidden__inner {
		flex-direction: row;
	}

	.post-hidden__text {
		margin-bottom: 16px;
	}

	.post-hidden:global([data-low]) .post-hidden__text {
		margin: 0 12px;
	}

	.post-hidden__button {
		display: flex;
		align-items: center;
		margin: 0 12px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-accent);
		font: inherit;
		cursor: pointer;
	}

	.post-hidden__button svg {
		margin-right: 6px;
		fill: currentColor;
	}

	@media (hover: hover) {
		.post-hidden__button:hover {
			opacity: 0.8;
		}
	}

	/*
	 * Медиа на всю ширину страницы: растягиваем саму плашку, а фигуру внутри возвращаем в её рамки,
	 * иначе плашка (шириной с колонку) оставит края картинки открытыми.
	 */
	.post-hidden.post-blocks--page:has(> .media-figure:not(.media-figure--column)) {
		width: 100cqw;
		margin-left: 50%;
		transform: translateX(-50%);
	}

	.post-hidden.post-blocks--page > .media-figure:not(.media-figure--column) {
		width: 100%;
		margin-left: 0;
		transform: none;
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
		.post-blocks--page > .media-figure:not(.media-figure--column) > .media-caption {
			padding-inline: 16px;
		}
	}
</style>
