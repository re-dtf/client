import type { Attachment } from 'svelte/attachments';
import { activeTheme } from './themes/index.svelte';
import { neighborFeed, type FeedName } from './feed.svelte';
import { reducedMotion } from './motion';
import { getCurrentDevice } from './themes/types';
import { createTension, haptics } from './haptics';
import { DISTANCE, settle, spring, swipe, translate } from './swipe';
import { pullDrawer, type DrawerPull } from './drawerSwipe';

/*
 * Свайп между лентами главной. Палец тянет дорожку с лентами, соседняя лента стоит рядом сразу на своей прокрутке,
 * а после отпускания дорожка доезжает до неё или возвращается. Касание посреди доезда подхватывает дорожку с места.
 * Палец ведёт общий жест из `swipe.ts`.
 * Слева от первой ленты соседа нет: там свайп выдвигает боковую панель, если тема её дала (`drawerSwipe.ts`).
 */

export interface FeedSwipeOptions {
	/** Можно ли сейчас листать: лента на экране и поверх нет окон */
	enabled: () => boolean;
	current: () => FeedName;
	/** Узел ленты на дорожке. Если ленты ещё нет, страница строит её сразу */
	slot: (name: FeedName) => HTMLElement | null;
	scrollOf: (name: FeedName) => number;
	/** Открыть ленту, на которую доехали. Синхронно, до следующего кадра: иначе мелькнёт прежняя */
	commit: (name: FeedName) => void;
}

/**
 * Ленты листаются только в мобильной раскладке (граница та же, что у настроек «для смартфонов»): на широком экране
 * вкладки лент видны в боковой колонке. `false` — свайп на любой ширине.
 */
const SWIPE_ONLY_MOBILE = true;

/** Свайп возможен в этой теме и при нынешней ширине экрана. Им же решается, готовить ли соседние ленты заранее */
export const swipeAllowed = () => activeTheme.gestures && (!SWIPE_ONLY_MOBILE || getCurrentDevice() === 'mobile');

/** Сопротивление там, где соседа нет: сдвиг растёт всё медленнее и не доходит до половины ширины */
const rubber = (x: number, width: number) => Math.sign(x) * (1 - 1 / ((Math.abs(x) * 0.55) / width + 1)) * width;

export function feedSwipe(options: FeedSwipeOptions): Attachment<HTMLElement> {
	return (track) => {
		let from: FeedName = options.current();
		let offset = 0;
		let width = 0;
		// Соседи, выставленные рядом с дорожкой (null — соседа нет)
		const sides = new Map<-1 | 1, HTMLElement | null>();
		// Жест достался боковой панели: дорожка стоит
		let pull: DrawerPull | undefined;
		// Идущий доезд: остановить его там, где он сейчас
		let halt: (() => void) | undefined;
		const tension = createTension('click');

		const shift = () => (sides.get(offset > 0 ? -1 : 1) ? offset : rubber(offset, width));

		/** Поставить соседнюю ленту рядом: сбоку от дорожки и на той высоте, где её оставили. Абсолютной она стоит и скрытой (CSS страницы) */
		function place(dir: -1 | 1) {
			if (sides.has(dir)) return;
			const name = neighborFeed(from, dir);
			const el = name ? options.slot(name) : null;
			if (name && el) {
				Object.assign(el.style, {
					display: 'block',
					contentVisibility: 'visible',
					top: `${scrollY - options.scrollOf(name)}px`,
					left: `${dir * 100}%`
				});
			}
			sides.set(dir, el);
		}

		/** Убрать всё, что поставил жест: ленты возвращаются к своим классам */
		function clear() {
			track.style.transform = track.style.willChange = '';
			for (const el of sides.values()) if (el) el.style.cssText = '';
			sides.clear();
		}

		return swipe({
			start: () => options.enabled() && swipeAllowed(),
			begin(dx) {
				from = options.current();
				pull = dx > 0 && !neighborFeed(from, -1) ? pullDrawer() : undefined;
				if (pull) return true;
				width = track.clientWidth;
				track.style.willChange = 'transform';
				tension.reset();
				return true;
			},
			move(x) {
				if (pull) return pull.move(x);
				offset = x;
				const dir = offset > 0 ? -1 : 1;
				if (offset) place(dir);
				const s = shift();
				track.style.transform = translate(s);
				tension.move(Math.abs(s), width * DISTANCE, Boolean(sides.get(dir)));
			},
			end(x, v) {
				if (pull) {
					pull.end(x, v);
					pull = undefined;
					return;
				}
				const dir = v === null ? 0 : settle(offset, v, width);
				const target = dir && sides.get(dir) ? neighborFeed(from, dir) : undefined;
				if (target && !tension.armed) haptics.tick();
				const to = target ? -dir * width : 0;
				// Доезд ведёт тот же сдвиг, что и палец, по кадрам: касание останавливает его где угодно и ведёт дальше
				const at = spring(offset, to, v ?? 0);
				const t0 = performance.now();
				let frame = 0;
				const stop = () => {
					cancelAnimationFrame(frame);
					if (halt === stop) halt = undefined;
				};
				const done = () => {
					stop();
					clear();
					if (target) options.commit(target);
				};
				halt = stop;
				if (reducedMotion() || Math.abs(to - offset) < 1) return done();
				const tick = (now: number) => {
					offset = at(Math.max(0, now - t0));
					if (Math.abs(to - offset) < 0.5) return done();
					track.style.transform = translate(shift());
					frame = requestAnimationFrame(tick);
				};
				frame = requestAnimationFrame(tick);
				return () => {
					if (halt === stop) done();
				};
			},
			grab() {
				if (!halt) return;
				halt();
				return offset;
			}
		})(track);
	};
}
