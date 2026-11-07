import type { Attachment } from 'svelte/attachments';
import { activeTheme } from './themes/index.svelte';
import { neighborFeed, type FeedName } from './feed.svelte';
import { reducedMotion } from './motion';
import { getCurrentDevice } from './themes/types';
import { EASE, glide, settle, swipe, translate } from './swipe';
import { pullDrawer, type DrawerPull } from './drawerSwipe';

/*
 * Свайп между лентами главной. Палец тянет дорожку с лентами, соседняя лента стоит рядом сразу на своей прокрутке,
 * а после отпускания дорожка доезжает до неё или возвращается. Палец ведёт общий жест из `swipe.ts`.
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
				return true;
			},
			move(x) {
				if (pull) return pull.move(x);
				offset = x;
				if (offset) place(offset > 0 ? -1 : 1);
				track.style.transform = translate(shift());
			},
			end(x, v) {
				if (pull) {
					pull.end(x, v);
					pull = undefined;
					return;
				}
				const dir = v === null ? 0 : settle(offset, v, width);
				const target = dir && sides.get(dir) ? neighborFeed(from, dir) : undefined;
				const begin = shift();
				const end = target ? -dir * width : 0;
				let animation: Animation | undefined;
				let settled = false;
				const done = () => {
					if (settled) return;
					settled = true;
					animation?.cancel();
					clear();
					if (target) options.commit(target);
				};
				if (reducedMotion() || Math.abs(end - begin) < 1) return done();
				animation = track.animate([{ transform: translate(begin) }, { transform: translate(end) }], { duration: glide(end - begin, v ?? 0), easing: EASE, fill: 'forwards' });
				// Отменённая анимация (новое касание уже завершило доезд) отклоняет промис: там делать нечего
				animation.finished.then(done, () => {});
				return done;
			}
		})(track);
	};
}
