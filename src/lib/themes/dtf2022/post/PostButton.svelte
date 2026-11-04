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
		onclick
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
		onclick?: (e: MouseEvent) => void;
	} = $props();

	// У лайка и дизлайка в активном состоянии своя иконка (v_like_active), а не обводка
	let iconName = $derived(active && (kind === 'like' || kind === 'dislike') ? `${ICONS[kind]}_active` : ICONS[kind]);

	$effect(() => {
		if (kind === 'like' || kind === 'dislike') preloadLottie(...Object.values(LOTTIE));
	});

	let animation = $state<LottieLoader>();
	let animating = $derived(!!animation);

	let className = $derived([
		'post-button',
		`post-button--${kind}`,
		{ 'post-button--active': active, 'post-button--right': right, 'post-button--lottie-animated': animating }
	]);
	let ariaLabel = $derived(value === undefined ? title : `${title}: ${value}`);

	/** Анимация при постановке оценки (не при снятии) — только у кнопок с обработчиком */
	function handleClick(e: MouseEvent) {
		if (onclick && !active && !animating && (kind === 'like' || kind === 'dislike')) {
			animation = kind === 'like' && Math.random() < RARE_LIKE_CHANCE ? LOTTIE.likeRare : LOTTIE[kind];
		}
		onclick?.(e);
	}
</script>

{#snippet content()}
	<span class="post-button__icon">
		<svg height={iconSize} width={iconSize} class="icon" aria-hidden="true">
			<use href="/icons.svg#{iconName}"></use>
		</svg>
	</span>
	{#if value !== undefined}
		<span class="post-button__value">{formatNumber(value)}</span>
	{/if}
	{#if animation}
		<span class="post-button__lottie" aria-hidden="true" use:lottie={{ load: animation, oncomplete: () => (animation = undefined) }}></span>
	{/if}
{/snippet}

{#if href}
	<a {href} class={className} {title} aria-label={ariaLabel} {onclick}>{@render content()}</a>
{:else}
	<button class={className} {title} aria-label={ariaLabel} aria-pressed={TOGGLES.has(kind) ? active : undefined} onclick={handleClick}>
		{@render content()}
	</button>
{/if}

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

	.post-button:hover {
		color: var(--text-hover);
	}

	.post-button--active {
		color: var(--text-active, var(--text-hover));
	}

	.post-button--right {
		margin-left: auto;
	}

	.post-button__icon {
		display: flex;
		justify-content: center;
		align-items: center;
		/* Делает иконку контейнером для круга ::before */
		transform: translateZ(0);
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

	.post-button:hover .post-button__icon::before {
		opacity: 0.12;
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
</style>
