<script lang="ts">
	import type { User } from '$lib/api/types';
	import { resolve } from '$app/paths';
	import { api } from '$lib/api/index.svelte';
	import { currentUser } from '$lib/api/currentUser.svelte';
	import { getProfilePath, openProfile } from '$lib/navigation';
	import { subscriptions } from '../actions.svelte';
	import { formatRating } from '../format';
	import Button from '../ui/Button.svelte';
	import PlusBadge from '../ui/PlusBadge.svelte';

	let { author }: { author: User } = $props();

	// Карма есть только в профиле — догружаем отдельно, без неё карточка тоже полная
	let profilePromise = $derived(api.getProfile(author.id));
	let profilePath = $derived(resolve(getProfilePath(author.id) as any));
</script>

{#snippet actions(wasSubscribed: boolean, wasNotified: boolean, loading = false)}
	{@const subscribed = subscriptions.isSubscribed(author.id, wasSubscribed)}
	<div class="author-subscribe">
		<div class="author-subscribe__subscribe">
			<Button
				variant={subscribed ? 'default' : 'blue'}
				icon="v_follow"
				label={subscribed ? 'Вы подписаны' : 'Подписаться'}
				fullWidth
				disabled={loading}
				onclick={() => subscriptions.toggle(author.id, wasSubscribed)}
			/>
		</div>
		<!-- Колокольчик виден только после подписки -->
		{#if subscribed}
			{@const notified = subscriptions.isNotified(author.id, wasNotified)}
			<Button
				icon={notified ? 'bell_solid' : 'v_bell'}
				title={notified ? 'Не уведомлять о новых постах' : 'Уведомлять о новых постах'}
				aria-label="Уведомления о новых постах"
				aria-pressed={notified}
				onclick={() => subscriptions.toggleNotifications(author.id, wasNotified)}
			/>
		{/if}
	</div>
{/snippet}

<div class="author-card">
	<div class="author-card__info">
		<a
			href={profilePath}
			class="author-card__avatar"
			style:background-image={author.avatarUrl ? `url(${author.avatarUrl})` : undefined}
			aria-label={author.name}
			onclick={(e) => openProfile(e, author.id)}
		></a>
		<div class="author-card__main">
			<div class="author-card__title">
				<a href={profilePath} class="author-card__item author-card__name" onclick={(e) => openProfile(e, author.id)}>
					{author.name}
				</a>
				{#if author.isPlus}
					<div class="author-card__item author-card__badge">
						<PlusBadge {author} size={20} />
					</div>
				{/if}
				{#await profilePromise then { rating }}
					{#if rating}
						<div class={['author-card__item author-card__karma', { 'author-card__karma--positive': rating > 0 }]}>
							{formatRating(rating)}
						</div>
					{/if}
				{:catch}
					<!-- без кармы -->
				{/await}
			</div>
			{#if author.description}
				<div class="author-card__description">{author.description}</div>
			{/if}
		</div>
	</div>

	{#if author.id !== currentUser.value?.id}
		<div class="author-card__actions">
			{#await profilePromise}
				{@render actions(false, false, true)}
			{:then profile}
				{@render actions(!!profile.isSubscribed, !!profile.isSubscribedToNewPosts)}
			{:catch}
				{@render actions(false, false)}
			{/await}
		</div>
	{/if}
</div>

<style>
	.author-card {
		--avatar-size: 40px;
		display: flex;
		align-items: center;
		margin-top: 32px;
		margin-bottom: -7px;
		font-size: 16px;
		line-height: 1.5em;
	}

	.author-card__info {
		display: grid;
		grid-template-columns: var(--avatar-size) 1fr;
		grid-template-rows: 1fr auto;
		gap: 0 12px;
		align-items: center;
		flex: 1;
		min-height: 36px;
	}

	.author-card__avatar {
		grid-row: span 2;
		width: var(--avatar-size);
		padding-bottom: 100%;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px var(--border-avatar);
		background: no-repeat 50% 50% / cover;
	}

	.author-card__main {
		min-width: 0;
	}

	.author-card__title {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.author-card__item {
		flex-shrink: 0;
	}

	.author-card__item:not(:first-child) {
		margin-left: 4px;
	}

	.author-card__name {
		flex-shrink: 1;
		font-size: 17px;
		line-height: 26px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.author-card__badge {
		display: flex;
		align-items: center;
	}

	.author-card__item.author-card__karma {
		margin-left: 8px;
		font-size: 15px;
		line-height: 20px;
		font-weight: 500;
	}

	.author-card__karma--positive {
		color: var(--color-positive);
	}

	.author-card__description {
		font-size: 15px;
		line-height: 22px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.author-card__actions {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.author-subscribe {
		--btn-height: 40px;
		--btn-icon-margin-left: 12px;
		--btn-icon-margin-right: -8px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/*
	 * в исходной вёрстке здесь же было .info { min-height: 49px }, но в style.css
	 * оно стоит раньше базового min-height: 36px и не срабатывает. Перенесено фактическое поведение.
	 */
	@media (min-width: 860px) {
		.author-card__actions {
			margin-left: 18px;
		}
	}

	@media (max-width: 859px) {
		.author-card {
			--avatar-size: 36px;
			flex-direction: column;
			align-items: flex-start;
			gap: 15px;
			margin-bottom: -9px;
			font-size: 12px;
		}

		.author-card__name {
			font-size: 15px;
			line-height: 22px;
		}

		.author-card__description {
			font-size: 13px;
			line-height: 18px;
		}

		.author-card__actions,
		.author-subscribe__subscribe {
			width: 100%;
		}

		.author-subscribe {
			--btn-offset: 14px;
			--btn-min-width: 36px;
			--btn-height: 32px;
			--btn-font-size: 14px;
			--btn-icon-size: 20px;
			--btn-radius: 7px;
			flex: 1;
		}
	}
</style>
