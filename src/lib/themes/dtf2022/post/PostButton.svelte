<script module lang="ts">
	import type { LottieLoader } from './lottie';

	export type PostButtonKind = 'like' | 'dislike' | 'comments' | 'repost' | 'bookmark' | 'share' | 'upvote' | 'downvote';

	const ICONS: Record<PostButtonKind, string> = {
		like: 'v_like',
		dislike: 'v_dislike',
		comments: 'v_comments',
		repost: 'v_repost',
		bookmark: 'v_bookmark',
		share: 'v_share',
		upvote: 'v_arrow_up',
		downvote: 'v_arrow_down'
	};

	const TOGGLES = new Set<PostButtonKind>(['like', 'dislike', 'bookmark', 'upvote', 'downvote']);

	// Lottie-анимации из оригинала (vue-chunk.likes). Грузятся при первом клике, в общий бандл не попадают
	const LOTTIE: Record<'like' | 'likeRare' | 'dislike', LottieLoader> = {
		like: () => import('./lottie/like.json'),
		likeRare: () => import('./lottie/like-rare.json'),
		dislike: () => import('./lottie/dislike.json')
	};
	// У DTF «редкий» лайк выпадает с шансом 5%
	const RARE_LIKE_CHANCE = 0.05;
</script>

<script lang="ts">
	import type { Reactions } from '$lib/api/types';
	import { customVoteIconOf } from '$lib/reactions';
	import ReactionPopup from './ReactionPopup.svelte';
	import { formatNumber } from '../format';
	import { lottie, preloadLottie } from './lottie';

	/*
	 * Снаружи настраивается CSS-переменными: --post-button-size (круг подсветки),
	 * --post-button-value-weight, --post-button-value-gap, --post-button-like-margin-right.
	 */
	let {
		kind,
		title,
		value,
		href,
		iconSize = 20,
		active = false,
		right = false,
		reactions,
		onclick,
		onvalueclick,
		onreact
	}: {
		kind: PostButtonKind;
		title: string;
		value?: number;
		href?: string;
		iconSize?: number;
		/** Голос/закладка текущего пользователя */
		active?: boolean;
		/** Прижать к правому краю flex-строки */
		right?: boolean;
		reactions?: Reactions;
		onclick?: (e: MouseEvent) => void;
		/** Клик по числу вместо `onclick` (у репоста число открывает список) */
		onvalueclick?: () => void;
		onreact?: (id: number) => void;
	} = $props();

	let custom = $derived(kind === 'like' ? customVoteIconOf(reactions, 1) : kind === 'dislike' ? customVoteIconOf(reactions, -1) : undefined);
	let isVoteActive = $derived(active || !!custom);
	let resolvedTitle = $derived(custom?.name ?? title);

	// В активном состоянии у лайка и дизлайка своя иконка (v_like_active), у закладки — залитая (v_bookmark_solid), а не обводка
	let iconName = $derived(
		!isVoteActive ? ICONS[kind] : kind === 'bookmark' ? 'v_bookmark_solid' : kind === 'like' || kind === 'dislike' ? `${ICONS[kind]}_active` : ICONS[kind]
	);

	$effect(() => {
		if (kind === 'like' || kind === 'dislike') preloadLottie(...Object.values(LOTTIE));
	});

	let animation = $state<LottieLoader>();
	let animating = $derived(!!animation);

	let className = $derived([
		'post-button',
		`post-button--${kind}`,
		{ 'post-button--active': isVoteActive, 'post-button--right': right, 'post-button--lottie-animated': animating }
	]);
	let ariaLabel = $derived(value === undefined ? resolvedTitle : `${resolvedTitle}: ${value}`);

	/** Анимация при постановке оценки (не при снятии) — только у кнопок с обработчиком */
	function handleClick(e: MouseEvent) {
		if (onvalueclick && (e.target as Element).closest('.post-button__value')) return onvalueclick();
		if (onclick && !isVoteActive && !animating && (kind === 'like' || kind === 'dislike')) {
			animation = kind === 'like' && Math.random() < RARE_LIKE_CHANCE ? LOTTIE.likeRare : LOTTIE[kind];
		}
		onclick?.(e);
	}
</script>

{#snippet content()}
	<span class="post-button__icon">
		{#if custom}
			<img src={custom.url} width={iconSize} height={iconSize} class="post-button__custom-icon" alt="" />
		{:else}
			<svg height={iconSize} width={iconSize} class="icon" aria-hidden="true">
				<use href="/icons.svg#{iconName}"></use>
			</svg>
		{/if}
	</span>
	{#if value !== undefined}
		<span class="post-button__value">{formatNumber(value)}</span>
	{/if}
	{#if animation}
		<span class="post-button__lottie" aria-hidden="true" use:lottie={{ load: animation, oncomplete: () => (animation = undefined) }}></span>
	{/if}
{/snippet}

<ReactionPopup {reactions} {onreact}>
	{#if href}
		<a {href} class={className} title={resolvedTitle} aria-label={ariaLabel} {onclick}>{@render content()}</a>
	{:else}
		<button class={className} title={resolvedTitle} aria-label={ariaLabel} aria-pressed={TOGGLES.has(kind) ? isVoteActive : undefined} onclick={handleClick}>
			{@render content()}
		</button>
	{/if}
</ReactionPopup>

<style>
	.post-button {
		--size: var(--post-button-size, 28px);
		--text-hover: var(--color-comments-hover);
		--bg-hover: var(--color-comments-hover-bg);

		display: inline-flex;
		align-items: center;
		vertical-align: top;
		color: var(--text-muted);
		font-size: 15px;
		cursor: pointer;
	}

	.post-button--active {
		color: var(--text-active, var(--text-hover));
	}

	.post-button--right {
		margin-left: auto;
	}

	.post-button__icon {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		/* Делает иконку контейнером для круга ::before */
		transform: translateZ(0);
	}

	.post-button__custom-icon {
		display: block;
		object-fit: contain;
		pointer-events: none;
	}

	/* Круг подсветки при наведении */
	.post-button__icon::before {
		content: '';
		position: absolute;
		z-index: 1;
		width: var(--size);
		height: var(--size);
		border-radius: 100%;
		background-color: var(--bg-hover);
		opacity: 0;
	}

	/* Анимация рисуется поверх иконки, сама иконка на это время скрыта */
	.post-button__lottie {
		position: absolute;
		z-index: 1;
		width: 32px;
		height: 32px;
		margin-left: -6px;
	}

	.post-button--lottie-animated .post-button__icon {
		visibility: hidden;
	}

	.post-button__value {
		position: relative;
		height: 22px;
		margin-left: var(--post-button-value-gap, 5px);
		line-height: 22px;
		font-weight: var(--post-button-value-weight, 500);
		font-variant-numeric: tabular-nums;
	}

	/* Расширяет зону клика вокруг числа */
	.post-button__value::before {
		content: '';
		position: absolute;
		width: 100%;
		height: var(--size);
		margin: -6px 0 0 -6px;
		padding: 1px 6px;
	}

	.post-button--like {
		--text-hover: var(--color-like);
		--text-active: var(--color-like-active);
		--bg-hover: var(--color-like-hover-bg);
		margin-left: -2px;
		margin-right: var(--post-button-like-margin-right, 0);
	}

	.post-button--dislike {
		--text-hover: var(--color-dislike);
		--text-active: var(--color-dislike-active);
		--bg-hover: var(--color-dislike);
	}

	/* Закладка в активном состоянии синяя, как .bookmark--active у DTF */
	.post-button--bookmark {
		--text-active: var(--color-blue);
	}

	.post-button--like .icon,
	.post-button--dislike .icon {
		stroke: currentColor;
	}

	/* В активном состоянии иконка залита, обводка не нужна */
	.post-button--active.post-button--like .icon,
	.post-button--active.post-button--dislike .icon {
		stroke: none;
	}

	/* У DTF счётчик лайка не выше иконки: 15px/normal в кнопке 20px */
	.post-button--like .post-button__value,
	.post-button--dislike .post-button__value {
		height: 18px;
		line-height: normal;
	}

	.post-button--upvote {
		--text-hover: var(--color-positive);
		--bg-hover: var(--color-positive);
	}

	.post-button--downvote {
		--text-hover: var(--color-negative);
		--bg-hover: var(--color-negative);
	}

	@media (hover: hover) {
		.post-button:hover {
			color: var(--text-hover);
		}

		.post-button:hover .post-button__icon::before {
			opacity: 0.12;
		}
	}

	/* Расширенная зона нажатия оценок на мобильных / тач-экранах */
	@media (pointer: coarse), (max-width: 859px) {
		.post-button--like,
		.post-button--dislike,
		.post-button--upvote,
		.post-button--downvote {
			position: relative;
		}

		.post-button--like::after,
		.post-button--dislike::after,
		.post-button--upvote::after,
		.post-button--downvote::after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			min-width: max(100%, 44px);
			min-height: 44px;
		}
	}
</style>
