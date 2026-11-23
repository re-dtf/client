<script lang="ts">
	import { resolve } from '$app/paths';
	import { getPostPath, getProfilePath, openPost, openProfile } from '$lib/navigation';
	import { authorZoneMenu, profileContextMenu } from '../actions.svelte';
	import { formatDonation } from '../comments/donation';
	import { formatFullDate, formatTime } from '../format';
	import { shorten, uniqueByType, type LiveItem } from './liveModel';
	import { animatedAvatar } from '$lib/actions/animatedAvatar.svelte';

	let {
		item,
		now,
		first = false,
		ondismiss
	}: { item: LiveItem; now: number; first?: boolean; ondismiss: (hash: string) => void } = $props();

	// Значок действия на аватарке, как в панели уведомлений
	const NOTE_ICONS = { reply: 'ui_reply', comment: 'ui_comments_fill', like: 'ui_arrow_up' };

	let post = $derived({ id: item.postId, sourceId: 'dtf' });
	let commentHref = $derived(resolve(getPostPath(post, item.commentId) as any));
	let postHref = $derived(resolve(getPostPath(post) as any));
	let profileHref = $derived(resolve(getProfilePath(item.user.id) as any));
	let text = $derived(shorten(item.text));
	let title = $derived(shorten(item.postTitle));
	let media = $derived(uniqueByType(item.media));
	let date = $derived(new Date(item.date).toISOString());
</script>

{#if item.notification}
	<a
		class="live-item live-item--notification"
		class:live-item--first={first}
		href={commentHref}
		onclick={(e) => {
			openPost(e, post, { commentId: item.commentId });
			ondismiss(item.hash);
		}}
	>
		<div class="note-avatar">
			<div class="avatar" style:background-image={item.user.avatarUrl ? `url("${item.user.avatarUrl}")` : undefined} {@attach animatedAvatar(item.user.avatarUrl)}></div>
			<div class="note-badge note-badge--{item.notification.kind}">
				<svg class="icon" width="8" height="8" aria-hidden="true">
					<use href="#{NOTE_ICONS[item.notification.kind]}"></use>
				</svg>
			</div>
		</div>
		<div class="note-text"><b>{item.user.name}</b> {item.notification.text}</div>
	</a>
{:else}
	<div class={['live-item', { 'live-item--donate': !!item.donate, 'live-item--first': first }]}>
		<div class="header" {@attach authorZoneMenu(() => item.user)}>
			<a class="user" href={profileHref} onclick={(e) => openProfile(e, item.user.id)} {@attach profileContextMenu(item.user)}>
				<div class="avatar" style:background-image={item.user.avatarUrl ? `url("${item.user.avatarUrl}")` : undefined} {@attach animatedAvatar(item.user.avatarUrl)}></div>
				<div class="name"><span>{item.user.name}</span></div>
				{#if item.user.isVerified}
					<svg class="icon" width="12" height="12" aria-label="Подтверждённый аккаунт" role="img">
						<use href="#ui_verified"></use>
					</svg>
				{/if}
			</a>
			<a class="date" href={commentHref} title={formatFullDate(date)} onclick={(e) => openPost(e, post, { commentId: item.commentId })}>{formatTime(date, false, now)}</a>
		</div>

		<a class="main" href={commentHref} onclick={(e) => openPost(e, post, { commentId: item.commentId })}>
			{#if text}
				<div class="text">{text}</div>
			{/if}
			{#if item.donate}
				<div class="donates"><div class="donate">{formatDonation(item.donate)}</div></div>
			{/if}
			{#if media.length}
				<div class="media">
					{#each media as m (m.type)}
						<div class="media-item media-item--{m.type}">
							{#if m.type === 'image' || m.type === 'video' || m.type === 'movie'}
								<img src={m.value} alt="" loading="lazy" />
							{:else}
								<div class="link-mini">
									<svg class="icon" width="11" height="11" aria-hidden="true">
										<use href="#ui_external"></use>
									</svg>
									<span>{m.value}</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</a>

		<div class="footer"><a href={postHref} title={item.postTitle} onclick={(e) => openPost(e, post)}>{title}</a></div>
	</div>
{/if}

<style>
	.live-item {
		--gap: 12px;
		--offset-x: 13px;
		--offset-top: 8px;
		--offset-bottom: 6px;
		--color-background: transparent;
		--color-border: transparent;
		display: block;
		margin: 0 0 var(--gap) 16px;
		padding: var(--offset-top) var(--offset-x) var(--offset-bottom);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background-color: var(--color-background);
	}

	/* Плашка-уведомление: в оригинале приходила серверной разметкой, вид собран по панели уведомлений и токенам темы */
	.live-item--notification {
		--offset-top: 8px;
		--offset-bottom: 8px;
		--color-background: var(--bg-unread);
		--color-border: var(--border-subtle-2);
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 14px;
		line-height: 20px;
	}

	.note-avatar {
		position: relative;
		flex-shrink: 0;
	}

	.note-avatar .avatar {
		margin: 0;
	}

	/* Кружок со значком на углу аватарки, цвета как у уведомлений */
	.note-badge {
		position: absolute;
		right: -5px;
		bottom: -5px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		border-radius: 100%;
		background: var(--color-notify-blue);
		color: var(--text-on-accent);
		box-shadow: var(--shadow-avatar-badge);
	}

	.note-badge--like {
		background: var(--color-notify-red);
	}

	.note-text {
		min-width: 0;
		overflow-wrap: break-word;
	}

	.note-text b {
		font-weight: 500;
	}

	.live-item--donate {
		--gap: 16px;
		--offset-top: 14px;
		--offset-bottom: 12px;
		--color-background: rgba(68, 68, 119, 0.05);
		--color-border: rgba(68, 68, 119, 0.1);
		margin-top: var(--gap);
	}

	/* Первая карточка колонки стоит вплотную к заголовку */
	.live-item--first {
		margin-top: 0;
	}

	.header {
		display: flex;
		align-items: center;
		margin-bottom: 6px;
		font-size: 12px;
	}

	.user {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.user .icon {
		flex-shrink: 0;
	}

	.avatar {
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
		width: 24px;
		height: 24px;
		margin: -1px 8px 0 0;
		border-radius: 6px;
		background: #dedede no-repeat 50% 50% / 100% auto;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
		image-rendering: -webkit-optimize-contrast;
	}

	.name {
		display: flex;
		align-items: center;
		min-width: 0;
		font-size: 14px;
		font-weight: 700;
		color: #000;
		white-space: nowrap;
	}

	.name:not(:last-child) {
		margin-right: 6px;
	}

	.name span {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.date {
		flex-shrink: 0;
		margin-left: 8px;
		line-height: 1;
		text-transform: lowercase;
		color: var(--text-muted);
	}

	.date:not(:last-child) {
		margin-right: 10px;
	}

	.main {
		display: block;
	}

	.text {
		display: block;
		margin-bottom: 5px;
		font-size: 16px;
		line-height: 24px;
		overflow-wrap: break-word;
	}

	/* Вид суммы собран по плашке доната в редакторе комментария: в оригинале этот класс лежал в общем CSS сайта */
	.donates {
		display: flex;
		align-items: center;
		margin: 9px 0;
	}

	.donate {
		height: 24px;
		padding: 0 12px;
		border-radius: 5px;
		background: var(--color-donate);
		box-shadow: var(--shadow-donate);
		color: var(--text-on-accent);
		font-size: 12px;
		font-weight: 500;
		line-height: 24px;
	}

	.media {
		display: flex;
		align-items: center;
		margin-bottom: 9px;
	}

	.media-item:not(:last-child) {
		margin-right: 10px;
	}

	.media-item--image,
	.media-item--video,
	.media-item--movie {
		position: relative;
		flex-shrink: 0;
		overflow: hidden;
		width: 34px;
		height: 34px;
		border-radius: 5px;
		background-color: #dedede;
	}

	.media-item--image img,
	.media-item--video img,
	.media-item--movie img {
		display: block;
		width: 100%;
	}

	.media-item--image::after,
	.media-item--video::after,
	.media-item--movie::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 5px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	.media-item--link,
	.media-item--tweet,
	.media-item--telegram,
	.media-item--instagram {
		flex-shrink: 1;
		min-width: 0;
	}

	/* Мини-ссылка: в оригинале стили лежали в общем CSS сайта, размеры подобраны под 12px-подписи карточки */
	.link-mini {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		line-height: 18px;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.link-mini span {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.footer {
		display: block;
		overflow: hidden;
		font-size: 14px;
		line-height: 20px;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (hover: hover) {
		.user:hover .name,
		.date:hover,
		.footer a:hover {
			color: var(--text-link);
		}

		.live-item--notification:hover {
			background-color: var(--bg-unread-hover);
		}
	}
</style>
