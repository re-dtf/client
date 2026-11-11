<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { Notification, NotificationPart } from '$lib/api/types';
	import { notifications } from '$lib/api/notifications.svelte';
	import { openDtfLink, openNotifications } from '$lib/navigation';
	import { authStorage } from '$lib/storage/auth.svelte';
	import { formatNotificationTime } from './format';
	import { notificationsPopup } from './notificationsPopup.svelte';

	/** page — страница уведомлений: список целиком, без ссылки «Все уведомления» */
	let { page = false }: { page?: boolean } = $props();

	// Значок в кружке на аватаре (`icon` в ответе DTF → символ нашего спрайта)
	const BADGES: Record<string, string> = { like_up: 'ui_arrow_up', comment: 'ui_comments_fill', reply: 'ui_reply' };
	// Уведомления без автора (блокировка) показывают значок в квадрате вместо аватара
	const SQUARE_ICONS: Record<string, string> = { lock: 'ui_lock' };

	/** Минимальное время показа обновления, чтобы заголовок не мелькал при мгновенном ответе (мс) */
	const MIN_LOADING = 700;

	let isUpdating = $state(false);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	let startTime = 0;

	const isOpen = $derived(page || notificationsPopup.open);

	/** У кого раскрыт текст комментария («Развернуть») */
	const expanded = new SvelteSet<number>();

	$effect(() => {
		const shouldLoad = authStorage.isAuthenticated && isOpen && notifications.loading;

		untrack(() => {
			if (shouldLoad) {
				clearTimeout(closeTimer);
				closeTimer = undefined;
				if (!isUpdating) {
					isUpdating = true;
					startTime = performance.now();
				}
			} else if (isUpdating) {
				if (!isOpen) {
					clearTimeout(closeTimer);
					closeTimer = undefined;
					isUpdating = false;
				} else if (isOpen && !notifications.loading) {
					const elapsed = performance.now() - startTime;
					const remaining = Math.max(0, MIN_LOADING - elapsed);
					clearTimeout(closeTimer);
					closeTimer = setTimeout(() => {
						isUpdating = false;
					}, remaining);
				}
			}
		});
	});

	onDestroy(() => {
		clearTimeout(closeTimer);
		isUpdating = false;
	});

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
	<span class="notifications__title">
		<span class={['notifications__title-text', isUpdating && 'notifications__title-text--hidden']}>
			Уведомления
		</span>
		<span class={['notifications__title-updating', !isUpdating && 'notifications__title-updating--hidden']} aria-hidden={!isUpdating}>
			Обновляем<span class="notifications__dots" aria-hidden="true"><span class="notifications__dot">.</span><span class="notifications__dot">.</span><span class="notifications__dot">.</span></span>
		</span>
	</span>
	{#if notifications.highlighted}
		<button type="button" class="notifications__mark-all" onclick={() => notifications.markRead()}>Пометить все как прочитанные</button>
	{/if}
</header>
{#if !authStorage.isAuthenticated}
	<p class="notifications__status">Войдите, чтобы видеть уведомления</p>
{:else if notifications.error && notifications.items.length === 0}
	<p class="notifications__status">{notifications.error}</p>
{:else if notifications.items.length === 0 && !isUpdating && !notifications.loading}
	<p class="notifications__status">Уведомлений нет</p>
{:else if notifications.items.length === 0}
	<div class="notifications__empty-placeholder"></div>
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
		border-bottom: 1px solid var(--bg-main);
	}

	.notifications__title {
		display: inline-grid;
		grid-template-areas: 'title';
		align-items: center;
		font-size: 14px;
		line-height: 14px;
		font-weight: 500;
	}

	.notifications__title-text,
	.notifications__title-updating {
		grid-area: title;
		display: inline-flex;
		align-items: baseline;
		white-space: nowrap;
		transition: opacity 0.3s cubic-bezier(0.2, 0, 0, 1), transform 0.3s cubic-bezier(0.2, 0, 0, 1);
	}

	.notifications__title-text {
		opacity: 1;
		transform: translateY(0);
	}

	.notifications__title-text--hidden {
		opacity: 0;
		transform: translateY(-4px);
		pointer-events: none;
	}

	.notifications__title-updating {
		opacity: 1;
		transform: translateY(0);
	}

	.notifications__title-updating--hidden {
		opacity: 0;
		transform: translateY(4px);
		pointer-events: none;
	}

	.notifications__dots {
		display: inline-flex;
		letter-spacing: 1px;
	}

	.notifications__dot {
		display: inline-block;
		animation: notifications-dot-pulse 1.4s infinite ease-in-out;
		opacity: 0.2;
	}

	.notifications__dot:nth-child(1) {
		animation-delay: 0s;
	}

	.notifications__dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.notifications__dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes notifications-dot-pulse {
		0%, 20% {
			opacity: 0.2;
			transform: translateY(0);
		}
		50% {
			opacity: 1;
			transform: translateY(-2px);
		}
		80%, 100% {
			opacity: 0.2;
			transform: translateY(0);
		}
	}

	.notifications__mark-all {
		color: var(--text-link);
		font-size: 13px;
		line-height: 14px;
		cursor: pointer;
	}

	.notifications__empty-placeholder {
		min-height: 120px;
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
		border-top: 1px solid var(--bg-main);
		text-align: center;
		font-weight: 500;
	}

	.notifications__footer-link {
		display: block;
		padding: 15px;
		color: var(--text-link);
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
		border-bottom: 1px solid var(--bg-main);
	}

	.u-notification--border:last-of-type {
		border-bottom: none;
	}

	.u-notification--unread {
		background: var(--bg-unread);
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
		outline: 1px solid var(--border-avatar);
		outline-offset: -1px;
		object-fit: cover;
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
		background: var(--border-color);
		color: var(--text-primary);
		outline: 1px solid var(--border-avatar);
		outline-offset: -1px;
	}

	.u-notification__avatar-icon {
		position: absolute;
		right: -5px;
		bottom: -5px;
		width: 16px;
		height: 16px;
		border-radius: 100%;
		background: var(--text-muted);
		color: var(--text-on-accent);
		box-shadow: var(--shadow-avatar-badge);
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

	.u-notification__content b {
		font-weight: 500;
	}

	.u-notification__content__date {
		color: var(--text-muted);
	}

	.u-notification__content__reply-text {
		margin-top: 5px;
		padding: 4px 8px 5px;
		background: var(--bg-card-hover);
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
		color: var(--text-link);
		cursor: pointer;
	}

	.u-notification--blue .u-notification__image-icon {
		background: var(--color-notify-blue);
		color: var(--text-on-accent);
	}

	.u-notification--blue .u-notification__avatar-icon {
		background: var(--color-notify-blue);
	}

	.u-notification--red .u-notification__image-icon {
		background: var(--bg-notify-red);
		color: var(--color-notify-red-text);
	}

	.u-notification--red .u-notification__avatar-icon {
		background: var(--color-notify-red);
	}

	.u-notification--green .u-notification__image-icon {
		background: var(--bg-notify-green);
		color: var(--color-positive);
	}

	.u-notification--green .u-notification__avatar-icon {
		background: var(--color-notify-green);
	}

	.u-notification--yellow .u-notification__image-icon {
		background: var(--bg-coin);
		color: var(--color-coin-text);
	}

	.u-notification--yellow .u-notification__avatar-icon {
		background: var(--color-coin);
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

	@media (hover: hover) {
		.notifications__mark-all:hover {
			color: var(--text-link-subtle);
		}

		.u-notification--hover:hover {
			background: var(--bg-read-hover);
		}

		.u-notification--unread.u-notification--hover:hover {
			background: var(--bg-unread-hover);
		}

		.u-notification__content a:hover {
			color: var(--text-link);
		}

		.u-notification__content__button:hover {
			color: var(--text-link-subtle);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.notifications__title-text,
		.notifications__title-updating {
			transition: none;
		}

		.notifications__dot {
			animation: none;
			opacity: 1;
		}
	}
</style>
