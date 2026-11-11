import type { Attachment } from 'svelte/attachments';
import { createTension, haptics } from '$lib/haptics';
import { reducedMotion } from '$lib/motion';
import { EASE, swipe, translate } from '$lib/swipe';

/*
 * Свайп влево по комментарию, как в Telegram: комментарий едет за пальцем, справа выезжает значок ответа.
 * Дотянул до порога — отпускание выполняет действие. Пока порог пройден, палец вниз выбирает другое действие
 * из колонки (как в Telegram X): ответ стоит там, где сработал порог, остальные идут под ним.
 * Палец ведёт общий жест из `$lib/swipe`; вправо жест не наш — его забирает свайп «назад».
 */

/** Сдвиг, после которого отпускание выполняет действие */
export const ARM = 64;
/** Шаг пальца по вертикали между действиями колонки */
export const STEP = 60;
/** Запас сверх половины шага: дрожь пальца на границе не переключает действие туда-обратно */
const HYSTERESIS = 10;

/**
 * Действие под пальцем: 0 — ответ, дальше вниз по шагу, за краями колонки — крайнее. `dy` отсчитывается от точки,
 * где сработал порог. Нынешнее действие сменяется, только когда палец ушёл от него дальше половины шага с запасом
 */
export function slotAt(dy: number, current: number, last: number): number {
	if (Math.abs(dy - current * STEP) <= STEP / 2 + HYSTERESIS) return current;
	return Math.min(last, Math.max(0, Math.round(dy / STEP)));
}

/** Сдвиг комментария: до порога за пальцем, дальше туго */
const pull = (x: number) => (x <= ARM ? x : ARM + (x - ARM) * 0.25);

export interface SwipeView {
	key: string;
	armed: boolean;
	slot: number;
}

export interface CommentSwipeOptions {
	enabled: () => boolean;
	/** Ключ комментария, на который можно ответить (у удалённого и скрытого фильтром кнопки ответа нет) */
	keyOf: (item: HTMLElement) => string | undefined;
	/** Сколько действий в колонке, вместе с ответом */
	count: () => number;
	/** Слой колонки действий поверх списка. Высоту колонки жест ставит ему в `--swipe-y` */
	column: () => HTMLElement | undefined;
	/** Жест начался, порог пройден или сменилось действие; `null` — жест закончился */
	show: (view: SwipeView | null) => void;
	/** Палец отпущен на действии */
	run: (key: string, slot: number) => void;
}

export function commentSwipe(options: CommentSwipeOptions): Attachment<HTMLElement> {
	let view: SwipeView | undefined;
	let item: HTMLElement | undefined;
	let content: HTMLElement | undefined;
	let column: HTMLElement | undefined;
	let startY = 0;
	// Верх слоя колонки в окне и сдвиг пальца по вертикали, на котором сработал порог
	let layerTop = 0;
	let armY = 0;
	const tension = createTension('click');

	function render(x: number) {
		if (!content || !column) return;
		content.style.transform = translate(-pull(x));
		column.style.setProperty('--swipe', `${Math.min(1, x / ARM)}`);
	}

	return swipe({
		start(e) {
			const target = e.target as Element;
			const node = target.closest<HTMLElement>('.comment-item');
			if (!options.enabled() || !node || target.closest('input, textarea, select, [contenteditable], .comment-editor-container')) return false;
			const key = options.keyOf(node);
			if (!key) return false;
			item = node;
			startY = e.clientY;
			armY = 0;
			view = { key, armed: false, slot: 0 };
			return true;
		},
		begin(dx) {
			content = item?.querySelector<HTMLElement>(':scope > .comment-item__content') ?? undefined;
			column = options.column();
			if (dx > 0 || !item || !content || !column || !view) return false;
			// У виртуальных комментариев отрисовка обрезана по их рамке: уехавший влево аватар пропал бы
			item.style.contentVisibility = 'visible';
			content.style.willChange = 'transform';
			layerTop = column.getBoundingClientRect().top;
			column.style.setProperty('--swipe-y', `${startY - layerTop}px`);
			tension.reset();
			options.show(view);
			return true;
		},
		move(offset, dy) {
			const x = Math.max(0, -offset);
			render(x);
			const armed = x >= ARM;
			if (!view || !column) return;
			if (!armed && !view.armed) tension.move(x, ARM, false);
			// До порога колонка идёт за пальцем по вертикали, после — стоит, и палец выбирает в ней действие
			if (!armed) {
				column.style.setProperty('--swipe-y', `${startY + dy - layerTop}px`);
				if (view.armed) {
					haptics.soft();
					haptics.selectionEnd();
				}
			} else if (!view.armed) {
				armY = dy;
				haptics.selectionStart();
			}
			const slot = armed ? slotAt(dy - armY, view.slot, options.count() - 1) : 0;
			if (armed === view.armed && slot === view.slot) return;
			// Отдача — когда действие готово (чёткий щелчок) и когда палец сменил слот (микро-тик)
			if (armed) {
				if (!view.armed) haptics.click();
				else haptics.selectionChanged();
			}
			view = { ...view, armed, slot };
			options.show(view);
		},
		end(offset, v) {
			haptics.selectionEnd();
			const shown = view;
			const node = item;
			const moved = content;
			const icons = column;
			if (!shown || !node || !moved || !icons) return;
			if (v !== null && shown.armed) options.run(shown.key, shown.slot);
			const x = Math.max(0, -offset);
			let settled = false;
			let animations: Animation[] = [];
			const done = () => {
				if (settled) return;
				settled = true;
				animations.forEach((anim) => anim.cancel());
				node.style.contentVisibility = moved.style.transform = moved.style.willChange = '';
				icons.style.removeProperty('--swipe');
				icons.style.removeProperty('--swipe-y');
				view = item = content = column = undefined;
				armY = 0;
				options.show(null);
			};
			if (reducedMotion() || x < 1) return done();
			const timing = { duration: 220, easing: EASE, fill: 'forwards' } as const;
			animations = [
				moved.animate([{ transform: translate(-pull(x)) }, { transform: translate(0) }], timing),
				icons.animate([{ opacity: 1 }, { opacity: 0 }], timing)
			];
			// Отменённая анимация (новое касание уже завершило доезд) отклоняет промис: там делать нечего
			animations[0].finished.then(done, () => {});
			return done;
		}
	});
}
