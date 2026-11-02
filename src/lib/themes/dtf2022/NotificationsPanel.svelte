<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import type { Notification, NotificationPart } from '$lib/api/types';
	import { notifications } from '$lib/api/notifications.svelte';
	import { openDtfLink, openNotifications } from '$lib/navigation';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { formatNotificationTime } from './format';
	import { notificationsPopup } from './notificationsPopup.svelte';
	import Preloader from './ui/Preloader.svelte';

	/** page — страница уведомлений: список целиком, без ссылки «Все уведомления» */
	let { page = false }: { page?: boolean } = $props();

	// Значок в кружке на аватаре (`icon` в ответе DTF → символ нашего спрайта)
	const BADGES: Record<string, string> = { like_up: 'ui_arrow_up', comment: 'ui_comments_fill', reply: 'ui_reply' };
	// Уведомления без автора (блокировка) показывают значок в квадрате вместо аватара
	const SQUARE_ICONS: Record<string, string> = { lock: 'ui_lock' };

	/** У кого раскрыт текст комментария («Развернуть») */
	const expanded = new SvelteSet<number>();

	/** Пост и профиль открываем у себя, всё остальное — на dtf.ru в новой вкладке; уведомление становится прочитанным */
	function follow(e: MouseEvent, item: Notification, href: string) {
		notifications.markRead([item.id]);
		if (openDtfLink(e, href)) notificationsPopup.set(false);
	}

	function toggle(id: number) {
		if (!expanded.delete(id)) expanded.add(id);
	}
</script>

{#snippet text(part: NotificationPart)}
	{#if part.bold}<b>{part.text}</b>{:else}{part.text}{/if}
{/snippet}

<div class={['notifications', page && 'notifications--page']}>
<header class="notifications__header">
	<span class="notifications__title">Уведомления</span>
	{#if notifications.unread > 0}
		<button type="button" class="notifications__mark-all" onclick={() => notifications.markRead()}>Пометить все как прочитанные</button>
	{/if}
</header>
{#if !authStorage.isAuthenticated}
	<p class="notifications__status">Войдите, чтобы видеть уведомления</p>
{:else if notifications.loading && notifications.items.length === 0}
	<div class="notifications__loader">
		<Preloader />
	</div>
{:else if notifications.error}
	<p class="notifications__status">{notifications.error}</p>
{:else if notifications.items.length === 0}
	<p class="notifications__status">Уведомлений нет</p>
{:else}
	<div class="notifications__list">
		{#each notifications.items as item (item.id)}
			{@const badge = item.icon ? BADGES[item.icon] : undefined}
			{@const squareIcon = item.icon ? SQUARE_ICONS[item.icon] : undefined}
			<div class={['u-notification', 'u-notification--border', 'u-notification--hover', item.color && `u-notification--${item.color}`, !item.isRead && 'u-notification--unread']}>
				{#if item.url}
					<!-- Вся строка кликабельна, ссылки и кнопки внутри текста лежат выше (z-index) -->
					<a class="u-notification__link" href={item.url} target="_blank" rel="noreferrer" aria-label={item.text} onclick={(e) => follow(e, item, item.url!)}></a>
				{/if}

				{#if item.avatarUrl && !squareIcon}
					<div class="u-notification__image u-notification__image--relative">
						<img src={item.avatarUrl} alt="" loading="lazy" />
						{#if badge}
							<div class="u-notification__avatar-icon">
								<svg class="icon" width="9" height="9" aria-hidden="true"><use href="/icons.svg#{badge}"></use></svg>
							</div>
						{/if}
					</div>
				{:else}
					<div class="u-notification__image">
						<div class="u-notification__image-icon">
							{#if squareIcon}
								<svg class="icon" width="20" height="20" aria-hidden="true"><use href="/icons.svg#{squareIcon}"></use></svg>
							{/if}
						</div>
					</div>
				{/if}

				<div class="u-notification__content">
					{#each item.parts as part, i (i)}
						{#if part.href}
							<a href={part.href} target="_blank" rel="noreferrer" onclick={(e) => follow(e, item, part.href!)}>{@render text(part)}</a>
						{:else}
							{@render text(part)}
						{/if}
					{/each}
					<span class="u-notification__content__date">{formatNotificationTime(item.createdAt)}</span>
					{#if item.commentText}
						{#if expanded.has(item.id)}
							<div class="u-notification__content__reply-text">{item.commentText}</div>
						{/if}
						<div>
							<button type="button" class="u-notification__content__button" aria-expanded={expanded.has(item.id)} onclick={() => toggle(item.id)}>
								{expanded.has(item.id) ? 'Свернуть' : 'Развернуть'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
{#if !page}
	<footer class="notifications__footer">
		<a
			href="/notifications"
			class="notifications__footer-link"
			onclick={(e) => {
				openNotifications(e);
				notificationsPopup.set(false);
			}}
		>
			Все уведомления
		</a>
	</footer>
{/if}
</div>

<style>
	.notifications__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 15px;
		border-bottom: 1px solid #f2f2f2;
	}

	.notifications__title {
		font-size: 14px;
		line-height: 14px;
		font-weight: 500;
	}

	.notifications__mark-all {
		color: #3766a9;
		font-size: 13px;
		line-height: 14px;
		cursor: pointer;
	}

	.notifications__mark-all:hover {
		color: #5d8aca;
	}

	.notifications__loader {
		display: flex;
		justify-content: center;
		padding: 13px 0;
	}

	.notifications__status {
		margin: 0;
		padding: 20px 13px;
		text-align: center;
		color: var(--text-muted);
	}

	.notifications__list {
		max-height: 420px;
		overflow-y: auto;
	}

	.notifications__footer {
		border-top: 1px solid #f2f2f2;
		text-align: center;
		font-weight: 500;
	}

	.notifications__footer-link {
		display: block;
		padding: 15px;
		color: #3766a9;
		line-height: 1;
	}

	/* Строка уведомления: .u-notification из CSS DTF 2023 */
	.u-notification {
		display: flex;
		align-items: flex-start;
		position: relative;
		padding: 9px 15px;
		font-size: 13px;
		line-height: 18px;
		cursor: pointer;
	}

	.u-notification--border {
		border-bottom: 1px solid #f2f2f2;
	}

	.u-notification--border:last-of-type {
		border-bottom: none;
	}

	.u-notification--hover:hover {
		background: #f3f3f3;
	}

	.u-notification--unread {
		background: #f5fcff;
	}

	.u-notification--unread.u-notification--hover:hover {
		background: #eef4f7;
	}

	.u-notification__link {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
	}

	.u-notification__image {
		flex-shrink: 2;
		width: 36px;
		height: 36px;
		min-width: 36px;
		min-height: 36px;
		margin-right: 12px;
	}

	.u-notification__image--relative {
		position: relative;
	}

	.u-notification__image img {
		width: 100%;
		height: 100%;
		border-radius: 4px;
		outline: 1px solid rgba(0, 0, 0, 0.1);
		outline-offset: -1px;
	}

	.u-notification__image .icon {
		position: static;
	}

	.u-notification__image-icon,
	.u-notification__avatar-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.u-notification__image-icon {
		width: 100%;
		height: 100%;
		border-radius: 4px;
		background: #dedede;
		color: #000;
		outline: 1px solid rgba(0, 0, 0, 0.1);
		outline-offset: -1px;
	}

	.u-notification__avatar-icon {
		position: absolute;
		right: -5px;
		bottom: -5px;
		width: 16px;
		height: 16px;
		border-radius: 100%;
		background: #595959;
		color: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
	}

	.u-notification__content {
		flex-grow: 1;
		min-width: 0;
		word-break: break-word;
	}

	.u-notification__content a {
		position: relative;
		z-index: 2;
	}

	.u-notification__content a:hover {
		color: #3766a9;
	}

	.u-notification__content b {
		font-weight: 500;
	}

	.u-notification__content__date {
		color: #595959;
	}

	.u-notification__content__reply-text {
		margin-top: 5px;
		padding: 4px 8px 5px;
		background: rgba(0, 0, 0, 0.05);
		font-size: 12px;
		line-height: 16px;
		white-space: pre-line;
	}

	.u-notification__content__button {
		position: relative;
		z-index: 2;
		display: inline-flex;
		font-size: 12px;
		line-height: 24px;
		color: #3766a9;
		cursor: pointer;
	}

	.u-notification__content__button:hover {
		color: #5d8aca;
	}

	.u-notification--blue .u-notification__image-icon {
		background: #66a6ed;
		color: #fff;
	}

	.u-notification--blue .u-notification__avatar-icon {
		background: #66a6ed;
	}

	.u-notification--red .u-notification__image-icon {
		background: rgba(255, 71, 89, 0.1);
		color: #e92a40;
	}

	.u-notification--red .u-notification__avatar-icon {
		background: #ff4759;
	}

	.u-notification--green .u-notification__image-icon {
		background: rgba(69, 192, 69, 0.1);
		color: #2ea83a;
	}

	.u-notification--green .u-notification__avatar-icon {
		background: #45c045;
	}

	.u-notification--yellow .u-notification__image-icon {
		background: #fffdf1;
		color: #af9557;
	}

	.u-notification--yellow .u-notification__avatar-icon {
		background: #ffdd39;
	}

	/* Страница уведомлений: крупный заголовок, ссылка под ним, список целиком */
	.notifications--page .notifications__header {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		padding: 16px;
	}

	.notifications--page .notifications__title {
		font-size: 20px;
		line-height: 24px;
		font-weight: 700;
	}

	.notifications--page .notifications__mark-all {
		font-size: 16px;
		line-height: 20px;
	}

	.notifications--page .notifications__list {
		max-height: none;
		overflow: visible;
	}

	@media (max-width: 719px) {
		.u-notification {
			font-size: 14px;
		}
	}
</style>
