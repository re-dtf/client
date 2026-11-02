<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fromAction } from 'svelte/attachments';
	import { resolve } from '$app/paths';
	import { lazyVideo } from '$lib/actions/lazyVideo';
	import { getLeonardoUrl } from '$lib/api/utils';
	import { getPostPath, getProfilePath, openProfile } from '$lib/navigation';
	import { themeSettings } from '../themeSettings.svelte';
	import { formatFullDate, formatTime, plural } from '../format';
	import PostButton from '../post/PostButton.svelte';
	import Rating from '../post/Rating.svelte';
	import Reactions from '../post/Reactions.svelte';
	import { COMMENT_MEDIA_MAX_HEIGHT, mediaMaxWidth } from '../media';
	import { parseCommentText } from './commentText';
	import { commentKey, type CommentRow } from './flatten';
	import { toggleCommentReaction } from './votes.svelte';

	// Заглушка аватара удалённого комментария из исходной вёрстки
	const REMOVED_AVATAR = 'https://leonardo.osnova.io/04ee6149-5c89-5a20-846d-be172c424736/-/scale_crop/64x64/-/format/webp/';

	let {
		row,
		highlightedLine = -1,
		replying = false,
		onreply,
		onlinehover,
		onlineclick,
		onexpand,
		editor
	}: {
		row: CommentRow;
		/** Индекс подсвеченной линии ветки, -1 — нет */
		highlightedLine?: number;
		replying?: boolean;
		onreply: () => void;
		onlinehover: (line: number | null) => void;
		onlineclick: (owner: string) => void;
		onexpand: () => void;
		/** Редактор ответа (один на все комментарии, рендерит родитель) */
		editor: Snippet;
	} = $props();

	let comment = $derived(row.comment);
	let votes = $derived(themeSettings.votes);
	let paragraphs = $derived(parseCommentText(comment.content));
	let profilePath = $derived(resolve(getProfilePath(comment.author.id) as any));

	// Голос «за» — это лайк; голос «против» принять некому (false — без анимации клика)
	function rate(vote: 1 | -1) {
		if (vote < 0) return false;
		toggleCommentReaction(comment, 1);
	}

	function scrollToParent(e: MouseEvent) {
		e.preventDefault();
		if (row.parent) document.getElementById(`comment-${commentKey(row.parent)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function copyLink() {
		const url = new URL(resolve(getPostPath({ id: comment.postId, sourceId: comment.sourceId }) as any), location.href);
		url.hash = `comment-${row.key}`;
		navigator.clipboard?.writeText(url.href).catch(() => {});
	}
</script>

{#snippet repliesAction()}
	{#if row.hiddenReplies > 0}
		<button class="comment-item__inline-action" onclick={onexpand}>
			{row.hiddenReplies}&nbsp;{plural(row.hiddenReplies, ['комментарий', 'комментария', 'комментариев'])}
		</button>
	{/if}
{/snippet}

<div class={['comment-item', { 'comment-item--reply': row.level > 1 }]} style:--level={row.level} id="comment-{row.key}">
	<!--
		линии — div, а не button: у кнопки Chrome центрирует содержимое по вертикали
		и дуга ::before съехала бы. Это дублирующее действие мышью, поэтому без фокуса.
	-->
	<div class="comment-item__threads" aria-hidden="true">
		{#each row.lines as line, i}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class={[
					'comment-item__thread-line',
					{
						'comment-item__thread-line--no-border': !line.border,
						'comment-item__thread-line--max-level': i === row.lines.length - 1 && !line.arc,
						'comment-item__thread-line--highlighted': i === highlightedLine
					}
				]}
				title="Свернуть ветку"
				onmouseenter={() => onlinehover(i)}
				onmouseleave={() => onlinehover(null)}
				onclick={() => onlineclick(line.owner)}
			></div>
		{/each}
	</div>

	<div class="comment-item__content">
		{#if comment.isRemoved}
			<div class="comment-item__avatar">
				<div class="comment-item__avatar-image">
					<img src={REMOVED_AVATAR} alt="" />
				</div>
			</div>

			<div class="comment-item__text comment-item__text--deleted">
				<p>{comment.content || 'Комментарий удалён'}</p>
			</div>

			<div class="comment-item__break"></div>
			{@render repliesAction()}
		{:else}
			<a class="comment-item__avatar" href={profilePath} tabindex="-1" aria-hidden="true" onclick={(e) => openProfile(e, comment.author.id)}>
				<div class="comment-item__avatar-image">
					{#if comment.author.avatarUrl}
						<img src={comment.author.avatarUrl} alt="" />
					{/if}
				</div>
			</a>

			<a class="comment-item__author" href={profilePath} onclick={(e) => openProfile(e, comment.author.id)}>{comment.author.name}</a>

			{#if row.parent}
				<a class="comment-item__icon-action" href="#comment-{commentKey(row.parent)}" title="Ответ для {row.parent.author.name}" onclick={scrollToParent}>
					<svg class="icon" width="14" height="14" aria-hidden="true">
						<use href="/icons.svg#v_arrow_long_up"></use>
					</svg>
				</a>
			{/if}
			<button type="button" class="comment-item__icon-action" title="Скопировать ссылку" onclick={copyLink}>
				<svg class="icon" width="14" height="14" aria-hidden="true">
					<use href="/icons.svg#v_link"></use>
				</svg>
			</button>

			<div class="comment-item__break"></div>

			<a class="comment-item__time" href="#comment-{row.key}">
				<time datetime={comment.createdAt} title={formatFullDate(comment.createdAt)}>{formatTime(comment.createdAt)}</time>
			</a>

			{#if paragraphs.length}
				<div class="comment-item__text">
					{#each paragraphs as paragraph}
						{#snippet lines()}
							{#each paragraph.lines as line, l}
								{#if l > 0}<br />{/if}
								{#each line as part}
									{#if part.type === 'mention'}
										<a href={resolve(getProfilePath(part.id) as any)} onclick={(e) => openProfile(e, part.id)}>{part.name}</a>
									{:else if part.type === 'link'}
										<a href={part.url} target="_blank" rel="noopener noreferrer nofollow">{part.url}</a>
									{:else}
										{part.text}
									{/if}
								{/each}
							{/each}
						{/snippet}
						{#if paragraph.quote}
							<span class="comment-item__quote">
								<svg class="icon" width="16" height="12" aria-hidden="true">
									<use href="/icons.svg#comment_quote"></use>
								</svg>
								<span class="comment-item__quote-content">{@render lines()}</span>
							</span>
						{:else}
							<p>{@render lines()}</p>
						{/if}
					{/each}
				</div>
			{/if}

			{#if comment.media?.length}
				<div class="comment-item__attaches comment-item__media">
					{#each comment.media as media}
						<figure class="media-figure">
							<div
								class="media-placeholder media-placeholder--zoom"
								style:--media-max-w="{mediaMaxWidth(media.data.width, media.data.height, COMMENT_MEDIA_MAX_HEIGHT)}px"
								style:--media-w={media.data.width || 16}
								style:--media-h={media.data.height || 9}
								style:--media-bg={media.data.color ? `#${media.data.color}` : undefined}
							>
								{#if media.type === 'movie'}
									<video
										src={getLeonardoUrl(media.data.uuid, { format: 'mp4' })}
										muted
										loop
										playsinline
										controls={!!media.data.has_audio}
										{@attach fromAction(lazyVideo)}
									></video>
								{:else}
									<img src={getLeonardoUrl(media.data.uuid, { width: 800 })} alt="" loading="lazy" />
								{/if}
							</div>
						</figure>
					{/each}
				</div>
			{/if}

			{#if votes === 'reactions'}
				<Reactions compact reactions={comment.reactions} onreact={(id) => toggleCommentReaction(comment, id)} />
			{:else if votes === 'likes'}
				<PostButton
					kind="like"
					title="Лайк"
					value={comment.likes?.count || undefined}
					active={comment.likes?.myVote === 1}
					onclick={() => toggleCommentReaction(comment, 1)}
				/>
			{/if}

			<button type="button" class="comment-item__action" onclick={onreply}>Ответить</button>

			<!-- ponytail: меню комментария пока нет -->
			<button type="button" class="comment-item__action comment-item__icon-action" title="Больше">
				<svg class="icon" width="16" height="20" aria-hidden="true">
					<use href="/icons.svg#v_etc"></use>
				</svg>
			</button>

			<!-- Стрелки стоят в конце строки действий; на широких экранах поднимаются в строку автора -->
			{#if votes === 'rating'}
				<!-- ponytail: в API клиента есть только лайк (реакция ❤️), «против» пока ничего не делает -->
				<div class="comment-item__vote">
					<Rating compact value={comment.likes?.count ?? 0} myVote={comment.likes?.myVote} onvote={rate} />
				</div>
			{:else if votes === 'likes'}
				<PostButton kind="dislike" title="Дизлайк" right />
			{/if}

			<div class="comment-item__break"></div>
			{@render repliesAction()}

			{#if replying}
				{@render editor()}
			{/if}
		{/if}
	</div>
</div>

<style>
	.comment-item {
		--offset-right: 0px;
		--size-avatar: 32px;
		--offset-avatar-top: 2px;
		--offset-avatar-right: 10px;
		--content-offset-top: 18px;
		--content-offset-bottom: 3px;
		--gap-details: 5px;
		--gap-footer: 16px;
		--gap-branch: 19px;
		--color-branch: #e6e6e6;
		--color-branch-hover: var(--color-blue);
		--color-inline-action: var(--color-blue);
		/* Кнопки лайка в комментарии */
		--post-button-like-margin-right: 16px;
		--post-button-value-weight: 400;

		display: grid;
		grid-template-columns: auto 1fr;
		font-size: 16px;
		line-height: 1.5em;
		/* при прокрутке к комментарию не прятать его под липкой шапкой */
		scroll-margin-top: calc(var(--header-height) + 8px);
	}

	.comment-item--reply {
		--content-offset-top: 20px;
		--content-offset-bottom: 6px;
	}

	/* Кнопки-пустышки наследуют шрифт и цвет; :where — чтобы не перебивать классы ниже */
	:where(.comment-item button) {
		color: inherit;
		font: inherit;
		text-align: inherit;
	}

	/* Ветки */
	.comment-item__threads {
		display: flex;
		width: calc(var(--gap-branch) * (var(--level) - 1));
	}

	.comment-item__thread-line {
		flex-shrink: 0;
		width: var(--gap-branch, 0);
		border-left: 1px solid var(--color-branch);
		cursor: pointer;
		user-select: none;
	}

	/* Дуга от ветки к аватару */
	.comment-item__thread-line:not(.comment-item__thread-line--max-level):last-child::before {
		content: '';
		display: block;
		box-sizing: content-box;
		width: 12px;
		height: var(--content-offset-top);
		padding-bottom: calc(var(--size-avatar) * 0.5 + var(--offset-avatar-top));
		margin-left: -1px;
		border: solid var(--color-branch);
		border-width: 0 0 1px 1px;
		border-bottom-left-radius: 8px;
	}

	.comment-item__thread-line--no-border {
		height: 0;
		border-color: transparent;
	}

	@media (hover: hover) and (pointer: fine) {
		.comment-item__thread-line--highlighted:not(.comment-item__thread-line--no-border) {
			border-color: var(--color-branch-hover);
			box-shadow: inset 1px 0 0 0 var(--color-branch-hover);
		}

		.comment-item__thread-line--highlighted:not(.comment-item__thread-line--max-level):last-child::before {
			border-color: var(--color-branch-hover);
			box-shadow: inset 1px -1px 0 0 var(--color-branch-hover);
		}
	}

	/* Содержимое: строки-flex, переносы — через .comment-item__break */
	.comment-item__content {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		flex: 1;
		min-width: 0;
		padding-top: var(--content-offset-top);
		padding-bottom: var(--content-offset-bottom);
	}

	.comment-item__avatar,
	.comment-item__avatar img,
	.comment-item__avatar-image {
		flex-shrink: 0;
		width: var(--size-avatar);
		height: var(--size-avatar);
	}

	.comment-item__avatar {
		display: flex;
		align-self: flex-start;
		margin-top: var(--offset-avatar-top);
		margin-right: var(--offset-avatar-right);
		/* аватар занимает две строки: имя и время */
		margin-bottom: calc(var(--size-avatar) * -1);
	}

	.comment-item__avatar-image {
		display: grid;
		overflow: hidden;
		border-radius: 50%;
	}

	.comment-item__avatar img {
		grid-row: 1;
		grid-column: 1;
	}

	.comment-item__author {
		margin-right: var(--gap-details);
		line-height: 20px;
		font-weight: 500;
		white-space: nowrap;
	}

	.comment-item__icon-action {
		margin-right: 6px;
		color: var(--text-muted);
		cursor: pointer;
	}

	.comment-item__vote {
		display: flex;
		margin-left: auto;
	}

	/* На широких экранах стрелки поднимаются в строку автора, к правому краю (как у DTF — через order) */
	@media (min-width: 860px) {
		.comment-item__avatar,
		.comment-item__author,
		.comment-item__icon-action:not(.comment-item__action) {
			order: -2;
		}

		/* Нулевая высота — как у DTF: стрелки центрируются по строке автора и не раздувают её */
		.comment-item__vote {
			order: -1;
			align-items: center;
			height: 0;
			margin: 0 8px 0 auto;
		}
	}

	.comment-item__icon-action .icon {
		display: block;
	}

	/* На десктопе иконки-действия скрыты */
	@media (hover: hover) and (pointer: fine) {
		.comment-item__icon-action {
			display: none;
		}
	}

	@media (min-width: 860px) {
		.comment-item {
			--offset-right: 85px;
			--gap-branch: 21px;
		}

		.comment-item__author,
		.comment-item__avatar,
		.comment-item__icon-action {
			order: -2;
		}
	}

	.comment-item__break {
		flex-basis: 100%;
	}

	.comment-item__break + .comment-item__time {
		margin-left: calc(var(--size-avatar) + var(--offset-avatar-right));
	}

	.comment-item__time {
		margin-right: var(--gap-details);
		color: var(--text-muted);
		font-size: 12px;
		line-height: 16px;
		white-space: nowrap;
		cursor: pointer;
	}

	.comment-item__action,
	.comment-item__author,
	.comment-item__time {
		flex: 1;
		min-width: 0;
		max-width: max-content;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Текст */
	.comment-item__text {
		margin-top: 8px;
		margin-bottom: 8px;
		overflow-wrap: break-word;
	}

	.comment-item__attaches,
	.comment-item__text {
		flex-basis: 100%;
		max-width: 100%;
		padding-right: var(--offset-right);
	}

	/* В исходной вёрстке у ссылок в комментариях нет стиля — красим как ссылки в постах */
	.comment-item__text a {
		color: var(--text-link);
	}

	.comment-item__quote {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px;
		padding-top: 5px;
		padding-bottom: 7px;
	}

	.comment-item__quote-content {
		min-width: 0;
	}

	.comment-item__text--deleted {
		flex-basis: 0;
		flex-grow: 1;
	}

	.comment-item__text--deleted p {
		color: var(--text-muted);
	}

	/* Это для альтернативной темы RE как прошлые 2 коммента, НЕ УДАЛЯТЬ ПРИ ПЕРЕРАБОТКЕ */
	/* .comment-item__text--deleted p {
		color: rgba(0, 0, 0, 0.4);
		font-style: italic;
	} */

	/* Вложения */
	.comment-item__attaches {
		display: grid;
		justify-content: start;
		gap: 4px;
		margin-bottom: 14px;
	}

	.comment-item__media {
		grid-template-columns: minmax(0, 400px);
		margin-top: 14px;
	}

	.comment-item__text ~ .comment-item__media {
		margin-top: 2px;
	}

	.media-figure {
		display: flex;
		flex-direction: column;
	}

	.media-placeholder {
		position: relative;
		width: 100%;
		max-width: var(--media-max-w, 100%);
		aspect-ratio: var(--media-w) / var(--media-h);
		background: var(--media-bg);
		overflow: hidden;
	}

	.media-placeholder :is(img, video) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.media-placeholder--zoom {
		cursor: zoom-in;
	}

	/* Действия */
	.comment-item__action {
		height: 20px;
		margin-right: var(--gap-footer);
		color: var(--text-muted);
		font-size: 15px;
		line-height: 21px;
		white-space: nowrap;
		cursor: pointer;
	}

	.comment-item__inline-action {
		display: flex;
		align-items: center;
		margin-top: 11px;
		color: var(--color-inline-action);
		cursor: pointer;
	}
</style>
