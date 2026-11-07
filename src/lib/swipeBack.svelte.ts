import { flushSync } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { page } from '$app/state';
import { closeOverlay } from './navigation';
import { reducedMotion } from './motion';
import { freeze, headerBottomOf, pageTransition } from './pageTransition.svelte';
import { EASE, glide, settle, swipe, translate } from './swipe';
import { activeTheme } from './themes/index.svelte';
import { getCurrentDevice } from './themes/types';

/*
 * Свайп «назад» по странице-оверлею (пост, профиль, уведомления) в мобильной раскладке. Палец тянет страницу вправо,
 * под ней сразу виден слой, на который вернёмся (страница под ней или лента), на своей прокрутке. После отпускания
 * страница уезжает и оверлей закрывается — или возвращается на место. Закрытие без анимации темы: её роль играет сам жест.
 *
 * Слой под страницей на время жеста зафиксирован по окну и прокручен внутри себя на ту позицию, на которую встанет окно
 * после закрытия. Закрытие «приземляется», когда layout сменил слои: он вызывает `land` до того, как прокрутит окно.
 */

/** Насколько слой под страницей сдвинут влево в начале жеста, доля ширины */
const PARALLAX = 0.3;
/** Затемнение слоя под страницей в начале жеста: к концу оно уходит */
const DIM = 0.1;
/** Сколько ждать смены слоёв после закрытия, прежде чем всё сбросить */
const LANDING_TIMEOUT = 1500;

export interface SwipeBackOptions {
	/** Прокрутка, на которую слой встанет, когда страницу над ним закроют */
	scrollOf: (layer: string) => number;
}

// Слой, который показан под верхней страницей (жест идёт или закрытие ждёт смены слоёв)
let preview = $state<string | null>(null);
// Закрытая жестом страница: её уход не анимируется
let swiped: string | undefined;
// Жест закрыл страницу и ждёт, когда layout покажет слой под ней
let landing: { layer: string; timer: ReturnType<typeof setTimeout> } | undefined;
// Снять всё, что жест поставил странице и слою под ней
let restorePage: (() => void) | undefined;
let restoreUnder: (() => void) | undefined;

const screenOf = (layer: string) => document.querySelector(`[data-layer="${layer}"]`)?.firstElementChild as HTMLElement | null | undefined;

/** Верхняя страница и слой под ней, если жест сейчас возможен. Под модалкой страница не листается */
function layers() {
	const overlays = page.state.overlays ?? [];
	const top = overlays.at(-1);
	if (!activeTheme.gestures || getCurrentDevice() !== 'mobile' || pageTransition.active || landing || top?.presentation !== 'page') return;
	const below = overlays.at(-2);
	if (below && below.presentation !== 'page') return;
	return { top: top.id, under: below?.id ?? '__feed__' };
}

/** Вернуть всё как до жеста. Слой под страницей сначала прячется: иначе на кадр он встанет в поток и толкнёт страницу */
function reset() {
	if (landing) clearTimeout(landing.timer);
	landing = undefined;
	flushSync(() => (preview = null));
	restorePage?.();
	restoreUnder?.();
	restorePage = restoreUnder = undefined;
}

export const swipeBack = {
	get preview() {
		return preview;
	},
	/** Закрыта ли эта страница жестом (её уход не анимируется) */
	swiped(layer: string | undefined) {
		return layer !== undefined && layer === swiped;
	},
	/**
	 * Layout показал слой `layer` и сейчас прокрутит окно. Если это приземление жеста, слой под страницей встаёт в поток.
	 * `true` — анимация появления не нужна: ею был сам жест
	 */
	land(layer: string): boolean {
		if (landing?.layer !== layer) return false;
		clearTimeout(landing.timer);
		landing = undefined;
		preview = null;
		// Закрытая страница уже скрыта и остаётся за краем экрана до размонтирования
		restoreUnder?.();
		restorePage = restoreUnder = undefined;
		return true;
	}
};

export function swipeBackGesture(options: SwipeBackOptions): Attachment<HTMLElement> {
	let top: HTMLElement | undefined;
	let under: HTMLElement | undefined;
	// Затемнение поверх слоя под страницей. Не filter: тот на каждом кадре требует от GPU отдельного прохода по всему слою
	let dim: HTMLElement | undefined;
	let width = 0;
	let from: { top: string; under: string } | undefined;

	function move(x: number) {
		if (!top || !under || !dim) return;
		const p = Math.min(1, x / width);
		top.style.transform = translate(x);
		under.style.transform = translate(-PARALLAX * width * (1 - p));
		dim.style.opacity = `${DIM * (1 - p)}`;
	}

	return swipe({
		start(e) {
			from = layers();
			const target = e.target as Element;
			return Boolean(from && target.closest('[data-layer]')?.getAttribute('data-layer') === from.top && !target.closest('input, textarea, select, [contenteditable]'));
		},
		begin(dx) {
			if (dx < 0 || !from) return false;
			const a = screenOf(from.top);
			const b = screenOf(from.under);
			if (!a || !b) return false;
			top = a;
			under = b;
			width = innerWidth;

			// Сначала все чтения раскладки и стилей, потом записи: в кадре, где палец прошёл порог, иначе они пересчитываются по нескольку раз
			const rect = top.getBoundingClientRect();
			const margin = (el: Element) => parseFloat(getComputedStyle(el).marginTop) || 0;
			const bg = (el: Element) => getComputedStyle(el).backgroundColor;
			const transparent = (c: string) => c === 'transparent' || c === 'rgba(0, 0, 0, 0)';
			// У тем между «островами» страницы промежутки: без фона в них был бы виден слой под ней. Короткая страница тянется до низа окна
			const fill = [top, document.body, document.documentElement].map(bg).find((c) => !transparent(c)) ?? '';
			// Слой под страницей встаёт туда, где окажется после закрытия: прокрутка окна сменится на его собственную,
			// а в потоке он займёт место страницы (с поправкой на свой отступ сверху)
			const y = rect.top - margin(top) + margin(under) + scrollY - options.scrollOf(from.under);
			const headerBottom = headerBottomOf();
			// Стили ставятся, пока слой скрыт, а прокрутка внутри — когда он показан: ей нужна раскладка
			const unfreeze = freeze(under, new DOMRect(rect.left, y, rect.width, innerHeight), headerBottom);
			// Слой под страницей: страница поднимется над ним своим transform (порядок по DOM)
			under.style.zIndex = '';
			under.style.willChange = 'transform';
			flushSync(() => (preview = from!.under));
			under.scrollTop = parseFloat(under.style.top) - y;
			// Затемнение встаёт сразу за слоем: по порядку DOM оно выше слоя и ниже страницы
			const shade = document.createElement('div');
			Object.assign(shade.style, { position: 'fixed', inset: `${under.style.top} 0 0 0`, background: '#000', pointerEvents: 'none', willChange: 'opacity' });
			under.after(shade);
			dim = shade;
			restoreUnder = () => {
				unfreeze();
				shade.remove();
			};

			const style = top.style;
			const prev = { transform: style.transform, willChange: style.willChange, boxShadow: style.boxShadow, backgroundColor: style.backgroundColor, minHeight: style.minHeight };
			Object.assign(style, { willChange: 'transform', boxShadow: '0 0 24px rgba(0, 0, 0, 0.18)', backgroundColor: fill, minHeight: `${Math.max(0, innerHeight - rect.top)}px` });
			const screen = top;
			restorePage = () => Object.assign(screen.style, prev);
			// До первого движения слой уже стоит в начале параллакса
			move(0);
			return true;
		},
		move: (x) => move(Math.max(0, x)),
		end(offset, v) {
			const a = top;
			const b = under;
			const c = dim;
			const layer = from?.under;
			const closed = from?.top;
			if (!a || !b || !c || !layer || !restorePage) return;
			const x = Math.max(0, offset);
			const close = v !== null && settle(x, v, width) === -1;
			const end = close ? width : 0;
			let settled = false;
			let animations: Animation[] = [];
			const done = () => {
				if (settled) return;
				settled = true;
				animations.forEach((anim) => anim.cancel());
				if (!close) return reset();
				move(end);
				swiped = closed;
				landing = { layer, timer: setTimeout(reset, LANDING_TIMEOUT) };
				closeOverlay();
			};
			if (reducedMotion() || Math.abs(end - x) < 1) return done();
			const timing = { duration: glide(end - x, v ?? 0), easing: EASE, fill: 'forwards' } as const;
			const p = x / width;
			animations = [
				a.animate([{ transform: translate(x) }, { transform: translate(end) }], timing),
				b.animate([{ transform: translate(-PARALLAX * width * (1 - p)) }, { transform: translate(close ? 0 : -PARALLAX * width) }], timing),
				c.animate([{ opacity: DIM * (1 - p) }, { opacity: close ? 0 : DIM }], timing)
			];
			// Отменённая анимация (новое касание уже завершило доезд) отклоняет промис: там делать нечего
			animations[0].finished.then(done, () => {});
			return done;
		}
	});
}
