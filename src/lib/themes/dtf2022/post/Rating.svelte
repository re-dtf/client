<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { customVoteIconOf } from '$lib/reactions';
	import type { Reactions } from '$lib/api/types';
	import ReactionPopup from './ReactionPopup.svelte';
	import { themeSettings } from '../themeSettings.svelte';
	import { lottie, preloadLottie, type LottieLoader } from './lottie';

	// Lottie-анимации стрелок из оригинала (vue-chunk.vote, осень 2022)
	const ARROWS: Record<'1' | '-1', LottieLoader> = {
		'1': () => import('./lottie/arrow-up.json'),
		'-1': () => import('./lottie/arrow-down.json')
	};

	let {
		value,
		myVote = 0,
		compact = false,
		reactions,
		onvote,
		onreact
	}: {
		value: number;
		myVote?: number;
		/** Вариант для комментария: стрелки 16px */
		compact?: boolean;
		reactions?: Reactions;
		/** Вернуть false, если голос не принят — тогда анимации клика не будет */
		onvote?: (vote: 1 | -1) => boolean | void;
		onreact?: (id: number) => void;
	} = $props();

	let reversed = $derived(themeSettings.arrowsOrder === 'up-down');

	$effect(() => preloadLottie(...Object.values(ARROWS)));

	let arrow = $state<{ vote: 1 | -1; load: LottieLoader }>();

	// Смена числа: старое гаснет, новое выезжает на 4px (как v-transition у DTF)
	let previous = $state<number>();
	let valueChanging = $state(false);
	let lastValue: number | undefined = undefined;
	let valueTimer: ReturnType<typeof setTimeout>;

	$effect.pre(() => {
		if (lastValue === undefined) {
			lastValue = value;
			return;
		}
		if (value === lastValue) return;
		previous = lastValue;
		lastValue = value;
		valueChanging = true;
		clearTimeout(valueTimer);
		valueTimer = setTimeout(() => (valueChanging = false), 205);
	});

	$effect(() => () => clearTimeout(valueTimer));

	const format = (n: number) => String(n).replace('-', '−');
	const isVoted = (sign: 1 | -1) => (sign < 0 ? myVote < 0 : myVote > 0) || !!customVoteIconOf(reactions, sign);

	function vote(sign: 1 | -1) {
		const unvote = isVoted(sign);
		const accepted = onvote?.(sign) !== false;
		if (accepted && onvote && !arrow && !unvote) arrow = { vote: sign, load: ARROWS[String(sign) as '1' | '-1'] };
	}

	function fade(_: Element) {
		return { duration: 100, css: (t: number) => `opacity: ${1 - t}` };
	}

	function slide(_: Element, { up }: { up: boolean }) {
		return {
			duration: 200,
			delay: 50,
			easing: cubicOut,
			css: (t: number, u: number) => `opacity: ${t}; transform: translateY(${(up ? 4 : -4) * u}px)`
		};
	}
</script>

<ReactionPopup {reactions} {onreact}>
	<!-- Оценка стрелками, как у DTF осенью 2022 (.vote) -->
	<div
		class={[
			'vote',
			compact ? 'vote--comment' : 'vote--content',
			{
				'vote--sum-positive': value > 0,
				'vote--sum-negative': value < 0,
				'vote--voted-positive': isVoted(1),
				'vote--voted-negative': isVoted(-1),
				'vote--animating-button-click': !!arrow
			}
		]}
		role="group"
		aria-label="Оценка"
	>
		{@render button(reversed ? 1 : -1)}

		<span class="vote__value" aria-live="polite">
			<span class={['vote__actual-value', { 'vote__actual-value--hidden': valueChanging }]}>{format(value)}</span>
			{#if valueChanging && previous !== undefined}
				<span class="vote__virtual-value vote__prev-value" in:fade>{format(previous)}</span>
				<span class="vote__virtual-value" in:slide={{ up: value > previous }}>{format(value)}</span>
			{/if}
		</span>

		{@render button(reversed ? -1 : 1)}
	</div>
</ReactionPopup>

{#snippet button(sign: 1 | -1)}
	{@const custom = customVoteIconOf(reactions, sign)}
	{@const active = isVoted(sign)}
	{@const label = custom?.name ?? (sign < 0 ? 'Голос против' : 'Голос за')}
	<button
		type="button"
		class={['vote__button', sign < 0 ? 'vote__button--minus' : 'vote__button--plus']}
		title={label}
		aria-label={label}
		aria-pressed={active}
		onclick={() => vote(sign)}
	>
		<svg class={['icon', { 'icon--hidden': arrow?.vote === sign }]} aria-hidden="true">
			<use href="/icons.svg#{sign < 0 ? 'v_arrow_down' : 'v_arrow_up'}"></use>
		</svg>
		{#if custom}
			<img src={custom.url} class="vote__mini-badge" alt="" />
		{/if}
		{#if arrow?.vote === sign}
			<span class="animated-arrow" aria-hidden="true" use:lottie={{ load: arrow.load, oncomplete: () => (arrow = undefined) }}></span>
		{/if}
	</button>
{/snippet}

<style>
	.vote {
		--size-icon: 22px;
		--size-button: 22px;
		--height: 22px;
		--gap: 8px;
		--font-size: 15px;
		--button-inner-indent: 5px;
		--min-width-value: calc(42px - var(--gap) * 2);

		display: grid;
		grid-template-columns: var(--size-button) minmax(var(--min-width-value), 1fr) var(--size-button);
		gap: var(--gap);
		place-content: center start;
		align-items: center;
		margin-left: auto;
	}

	.vote--comment {
		--size-icon: 16px;
		--size-button: 16px;
		--button-inner-indent: 4px;
	}

	.vote__button {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: var(--size-button);
		color: var(--color-text, #595959);
		cursor: pointer;
		transition: color 0.1s;
	}

	/* Круг подсветки при наведении */
	.vote__button::before {
		content: '';
		position: absolute;
		width: calc(var(--size-button) + var(--button-inner-indent) * 2);
		height: calc(var(--size-button) + var(--button-inner-indent) * 2);
		border-radius: 50%;
		background-color: var(--color-background, transparent);
	}

	.vote--voted-positive .vote__button--plus {
		--color-text: var(--color-positive);
	}

	.vote--voted-negative .vote__button--minus {
		--color-text: var(--color-negative);
	}

	/* Наведение подсвечивает круг; цвет поставленной стрелки под курсором не меняется */
	@media (hover: hover) {
		.vote__button:hover {
			--color-background: var(--bg-card-hover);
		}

		/* Пока играет анимация клика, подсветки нет */
		.vote--animating-button-click .vote__button:hover {
			--color-background: transparent;
		}
	}

	.vote__button .icon {
		display: block;
		width: var(--size-icon);
		height: var(--size-icon);
	}

	.vote__button .icon--hidden {
		display: none;
	}

	.vote__mini-badge {
		position: absolute;
		bottom: -2px;
		right: -3px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background-color: var(--bg-card);
		box-shadow: 0 0 0 1px var(--bg-card);
		object-fit: contain;
		pointer-events: none;
		z-index: 2;
	}

	.vote--comment .vote__mini-badge {
		width: 11px;
		height: 11px;
		right: -2px;
	}

	/* Анимация больше иконки: 32px в комментарии, 44px у поста; по центру кнопки */
	.animated-arrow {
		--size: 32px;
		--ratio: 1;
		position: absolute;
		width: calc(var(--size) * var(--ratio));
		height: calc(var(--size) * var(--ratio));
		pointer-events: none;
	}

	.vote--content .animated-arrow {
		--ratio: 1.375;
	}

	.vote__value {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: var(--height);
		grid-column: 2;
		padding: 0;
		border-radius: 4px;
		color: var(--color-text, #595959);
		font-size: var(--font-size);
		line-height: 22px;
		font-weight: 500;
		cursor: default;
		z-index: 1;
	}

	.vote__actual-value--hidden {
		opacity: 0;
	}

	.vote__virtual-value {
		position: absolute;
		min-width: 100%;
		width: max-content;
		text-align: center;
		pointer-events: none;
	}

	.vote__prev-value {
		opacity: 0;
	}

	.vote--sum-positive .vote__value {
		--color-text: var(--color-positive);
	}

	.vote--sum-negative .vote__value {
		--color-text: var(--color-negative);
	}

	/* Расширенная зона нажатия на мобильных / тач-экранах */
	@media (pointer: coarse), (max-width: 859px) {
		.vote__button::after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 44px;
			height: 44px;
		}
	}
</style>
