import type { Attachment } from 'svelte/attachments';
import { createTension } from './haptics';
import { activeTheme } from './themes/index.svelte';
import { getCurrentDevice } from './themes/types';

/*
 * Обновление жестом: от самого верха страницы палец тянет её вниз, и отпускание за порогом обновляет содержимое.
 * Что обновлять, говорит страница (`pullRefresh`), как это выглядит — тема (`providePuller`): модуль ведёт только сдвиг.
 * Вертикальный жест браузер забирает себе в прокрутку, поэтому здесь не pointer-события, как в `swipe.ts`, а touch:
 * их движение можно отменить, пока прокрутка не началась. Горизонтальные свайпы при этом идут своим путём.
 */

export interface Puller {
	/**
	 * Взять страницу пальцем: сдвиг, с которого жест продолжится (0 в покое, текущий — посреди доезда),
	 * или `undefined`, если тема занята (открыта боковая панель, идёт загрузка)
	 */
	grab: () => number | undefined;
	/** Палец ведёт: страница сдвинута на `y` px (сопротивление уже учтено), `armed` — отпускание обновит */
	drag: (y: number, armed: boolean) => void;
	/** Отпустили за порогом: встать на место загрузки и ждать */
	hold: () => void;
	/** Закрыть: отпустили до порога, жест отменён или обновление закончилось */
	close: () => void;
}

let puller: Puller | undefined;

/** Тема сообщает, как рисовать обновление. Возвращает отписку */
export function providePuller(p: Puller) {
	puller = p;
	return () => {
		if (puller === p) puller = undefined;
	};
}

/** Сдвиг страницы, после которого отпускание обновляет */
export const THRESHOLD = 72;
/** Ход пальца, после которого понятно, что это жест, а не касание */
const SLOP = 10;
/** Сдвиг, к которому страница стремится, но не доходит: тянется туго */
const MAX = 260;
/** Загрузка не мелькает: щель с ней держится не меньше этого, мс */
const MIN_LOADING = 600;

/** Сдвиг страницы при ходе пальца `d`: сначала чуть медленнее пальца, дальше всё туже */
export const resist = (d: number) => MAX * (1 - 1 / (1 + (0.7 * Math.max(0, d)) / MAX));
/** Ход пальца, которому соответствует сдвиг `y`: жест подхватывает страницу посреди доезда без рывка */
export const unresist = (y: number) => (MAX / 0.7) * (1 / (1 - Math.min(y, MAX - 1) / MAX) - 1);

const allowed = () => activeTheme.gestures && getCurrentDevice() === 'mobile';

export interface PullRefreshOptions {
	/** Можно ли сейчас обновлять: страница на экране и поверх нет окон */
	enabled: () => boolean;
	/** Обновить. Загрузка видна, пока промис не выполнится */
	refresh: () => Promise<unknown>;
}

export function pullRefresh(options: PullRefreshOptions): Attachment<HTMLElement> {
	return (node) => {
		let p: Puller | undefined;
		let start: { x: number; y: number; id: number } | undefined;
		// Узел, которого коснулся палец: touch-события идут ему до самого отпускания. Если лента пересоздала посты, он уже
		// вне страницы и до `node` они не всплывают, поэтому жест слушает их на нём самом
		let target: EventTarget | null = null;
		let pulling = false;
		let armed = false;
		let busy = false;
		let y = 0;
		let frame = 0;
		const tension = createTension('heavy');

		const touch = (e: TouchEvent) => start && [...e.touches].find((t) => t.identifier === start!.id);

		function render() {
			frame = 0;
			if (pulling) p?.drag(y, armed);
		}

		function listen(on: boolean) {
			const method = on ? 'addEventListener' : 'removeEventListener';
			target?.[method]('touchmove', onMove as EventListener, { passive: false });
			target?.[method]('touchend', onEnd as EventListener);
			target?.[method]('touchcancel', onEnd as EventListener);
			if (!on) target = null;
		}

		function finish(go: boolean) {
			cancelAnimationFrame(frame);
			frame = 0;
			start = undefined;
			listen(false);
			if (!pulling) return;
			pulling = armed = false;
			tension.reset();
			const d = p!;
			if (!go) return d.close();
			busy = true;
			d.hold();
			const wait = new Promise((done) => setTimeout(done, MIN_LOADING));
			Promise.all([options.refresh().catch(() => {}), wait]).then(() => {
				busy = false;
				d.close();
			});
		}

		function onStart(e: TouchEvent) {
			// Второй палец — это щипок, а не обновление. Касание при живом жесте значит, что отпускание потерялось: жест закрывается
			if (start) return finish(false);
			const t = e.touches[0];
			p = puller;
			const el = e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement;
			if (
				e.touches.length > 1 ||
				busy ||
				scrollY > 1 ||
				!p ||
				!allowed() ||
				!options.enabled() ||
				el?.closest('.mobile-bar') ||
				p.grab() === undefined
			)
				return;
			start = { x: t.clientX, y: t.clientY, id: t.identifier };
			target = e.target;
			listen(true);
		}

		function onMove(e: TouchEvent) {
			const t = touch(e);
			if (!start || !t) return;
			const dx = t.clientX - start.x;
			const dy = t.clientY - start.y;
			if (!pulling) {
				if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) {
					// Браузер начинает свою пружину раньше нашего порога, и потом её уже не отменить: движение вниз придерживаем сразу.
					// Свайпу лент это не мешает, он ведётся pointer-событиями
					if (dy > 0 && e.cancelable) e.preventDefault();
					return;
				}
				// Вверх — прокрутка, вбок — свайп лент: жест не наш
				const from = dy > Math.abs(dx) && scrollY <= 1 ? p!.grab() : undefined;
				if (from === undefined) return finish(false);
				pulling = true;
				// Страница трогается с места захвата, а не прыгает на величину порога; посреди доезда — с того места, где она сейчас
				start.y = t.clientY - unresist(from);
			}
			if (e.cancelable) e.preventDefault();
			y = resist(t.clientY - start.y);
			armed = tension.move(y, THRESHOLD);
			frame ||= requestAnimationFrame(render);
		}

		function onEnd(e: TouchEvent) {
			if (!start || [...e.changedTouches].every((t) => t.identifier !== start!.id)) return;
			// Последний кадр пальца ещё не нарисован: рисуем его сейчас, а запланированный отменяем. Иначе он придёт после
			// отпускания и снова поставит тему под палец, прервав её доезд
			if (frame) {
				cancelAnimationFrame(frame);
				render();
			}
			finish(e.type === 'touchend' && armed);
		}

		window.addEventListener('touchstart', onStart, { passive: true });
		return () => {
			finish(false);
			window.removeEventListener('touchstart', onStart);
		};
	};
}
