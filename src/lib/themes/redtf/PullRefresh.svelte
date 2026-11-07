<script lang="ts">
	import { providePuller, THRESHOLD } from '$lib/pullRefresh';
	import { reducedMotion } from '$lib/motion';
	import Preloader from '../dtf2022/ui/Preloader.svelte';
	import { sidebar } from '../dtf2022/sidebar.svelte';

	/*
	 * Обновление жестом на смартфоне, тем же приёмом, что боковая панель (pushDrawer.ts): шапка стоит, страница уезжает вниз,
	 * а из глубины под ней поднимается подсказка. Отпустили за порогом — страница встаёт чуть ниже обычного, и в щели идёт
	 * загрузка; обновилось — щель закрывается. Пишутся только transform и opacity: двигает композитор.
	 */

	/** Масштаб подсказки в начале: она поднимается из глубины */
	const DEPTH = 0.9;
	/** Щель, в которой идёт загрузка */
	const LOADING = 56;
	const DURATION = 380;
	const easeOut = (t: number) => 1 - (1 - t) ** 3;

	let area = $state<HTMLElement>();
	let inner = $state<HTMLElement>();
	let loading = $state(false);
	let y = 0;
	let frame = 0;
	// Страница, которая уезжает. Берётся на старте: страницы пересоздаются
	let content: HTMLElement | null = null;

	function render(next: number) {
		if (!area || !inner) return;
		if (!y && next) {
			content = document.getElementById('content');
			area.style.visibility = 'visible';
			// Страница ложится поверх щели своим фоном, без тени: граница — только разница фонов
			if (content) Object.assign(content.style, { position: 'relative', zIndex: '2', background: 'var(--bg-main)', willChange: 'transform' });
		}
		y = next;
		if (!y) return clear();
		if (content) content.style.transform = `translate3d(0, ${y}px, 0)`;
		// Подсказка стоит посередине щели и выходит из глубины к порогу; загрузка — к своей щели
		const q = Math.min(1, y / (loading ? LOADING : THRESHOLD));
		inner.style.transform = `translate3d(0, ${y / 2}px, 0) scale(${DEPTH + (1 - DEPTH) * q})`;
		inner.style.opacity = `${Math.max(0, q * 1.5 - 0.5)}`;
	}

	function clear() {
		if (content) Object.assign(content.style, { position: '', zIndex: '', background: '', willChange: '', transform: '' });
		if (area) area.style.visibility = '';
		if (inner) inner.style.transform = inner.style.opacity = '';
		content = null;
		loading = false;
	}

	function animate(to: number) {
		cancelAnimationFrame(frame);
		frame = 0;
		const from = y;
		if (reducedMotion() || from === to) return render(to);
		const start = performance.now();
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / DURATION);
			render(from + (to - from) * easeOut(t));
			frame = t < 1 ? requestAnimationFrame(step) : 0;
		};
		frame = requestAnimationFrame(step);
	}

	$effect(() => {
		const stop = providePuller({
			// В покое страницу может двигать боковая панель: тогда её сдвиг не наш. Посреди закрытия палец подхватывает страницу
			grab: () => (loading || sidebar.open || (!y && document.getElementById('content')?.style.transform) ? undefined : y),
			drag(next) {
				cancelAnimationFrame(frame);
				frame = 0;
				render(next);
			},
			hold() {
				loading = true;
				animate(LOADING);
			},
			close: () => animate(0)
		});
		return () => {
			stop();
			cancelAnimationFrame(frame);
			frame = y = 0;
			clear();
		};
	});
</script>

<div class="pull" bind:this={area} aria-hidden="true">
	<div class="pull__inner" bind:this={inner}>
		<span class={['pull__hint', { 'pull__hint--hidden': loading }]}>Отпустите, чтобы перезагрузить</span>
		{#if loading}
			<span class="pull__loader"><Preloader /></span>
		{/if}
	</div>
</div>

<style>
	/* Глубина под страницей: тот же плоский фон, что у боковой панели на смартфоне. Шире смартфона жеста нет */
	.pull {
		display: none;
	}

	@media (max-width: 719px) {
		.pull {
			display: block;
			position: fixed;
			top: var(--header-height);
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 1;
			visibility: hidden;
			background: var(--bg-sidebar-deep);
			pointer-events: none;
		}
	}

	/* Нулевой высоты: всё, что внутри, стоит по центру линии, которую сдвиг ставит посередине щели */
	.pull__inner {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pull__hint,
	.pull__loader {
		position: absolute;
	}

	.pull__hint {
		font-size: 15px;
		line-height: 20px;
		color: var(--text-secondary);
		white-space: nowrap;
		transition: opacity 0.2s ease;
	}

	.pull__hint--hidden {
		opacity: 0;
	}

	.pull__loader {
		display: flex;
		animation: pull-loader-in 0.25s ease backwards;
	}

	@keyframes pull-loader-in {
		from {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pull__hint,
		.pull__loader {
			transition: none;
			animation: none;
		}
	}
</style>
