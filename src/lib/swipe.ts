import type { Attachment } from 'svelte/attachments';

/*
 * Горизонтальный жест пальцем: общая часть свайпа лент и свайпа «назад». Ведёт палец от касания до отпускания,
 * а что двигать и куда доезжать, решает потребитель. Ось выбирает браузер: у элемента под пальцем `touch-action: pan-y`,
 * вертикальный жест он забирает в прокрутку (и шлёт pointercancel), горизонтальный отдаёт нам. Работает только от пальца.
 */

export interface SwipeHooks {
	/** Можно ли начать жест с этого касания */
	start: (e: PointerEvent) => boolean;
	/** Палец пошёл по горизонтали на `dx`: `false` — жест не наш, палец остаётся браузеру */
	begin: (dx: number) => boolean;
	/** Сдвиг от точки, где жест начался (`dy` — по вертикали от касания); не чаще кадра */
	move: (offset: number, dy: number) => void;
	/**
	 * Палец отпущен со скоростью `velocity` (px/мс) или жест отменён (`null`: второй палец, система).
	 * Возвращает функцию, которая мгновенно завершает доезд: её вызовет новое касание
	 */
	end: (offset: number, velocity: number | null) => (() => void) | void;
	/**
	 * Палец коснулся посреди доезда: остановить его на месте и вернуть сдвиг, с которого жест продолжится без нового `begin`.
	 * Если палец так и не повёл, доезд продолжится оттуда (`end` со скоростью 0). Без хука или с `undefined` касание завершает доезд
	 */
	grab?: () => number | undefined;
}

/** У краёв экрана жест принадлежит системе («назад» в Android и iOS) */
const EDGE = 24;
/** Сдвиг, после которого понятно, что это жест, а не касание */
const SLOP = 10;
/** Скорость броска, px/мс: бросок решает сам, без нужного расстояния */
const FLING = 0.35;
/** Доля ширины, после которой медленный жест доводится до конца */
const DISTANCE = 0.35;
export const EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
/** За сколько мс страница догоняет палец после старта жеста: без скачка скорости с нуля и без рывка после тяжёлого первого кадра */
const RAMP = 120;

/** Доля сдвига пальца, которую показываем через `elapsed` мс после первого кадра жеста: плавно от 0 до 1 */
export const rampUp = (elapsed: number) => {
	const u = Math.min(1, Math.max(0, elapsed / RAMP));
	return u * u * (3 - 2 * u);
};

/**
 * Куда доехать после отпускания: к соседу слева (-1), справа (1) или назад (0).
 * `offset` и `velocity` положительны вправо: сдвиг вправо открывает то, что слева.
 */
export function settle(offset: number, velocity: number, width: number): -1 | 0 | 1 {
	const side = Math.sign(offset);
	if (!side) return 0;
	const fling = Math.abs(velocity) > FLING ? Math.sign(velocity) : 0;
	const go = fling ? fling === side : Math.abs(offset) > width * DISTANCE;
	return go ? (-side as -1 | 1) : 0;
}

/** Длительность доезда: начальная скорость кривой примерно равна скорости пальца — бросок долетает быстро, медленный отпуск плавно */
export const glide = (distance: number, velocity: number) => Math.min(360, Math.max(160, (3 * Math.abs(distance)) / Math.max(Math.abs(velocity), 0.01)));

export const translate = (x: number) => `translate3d(${x}px, 0, 0)`;

/** Жёсткость пружины доезда, 1/мс: доезд почти весь укладывается в 300 мс */
const OMEGA = 0.025;

/**
 * Доезд пружиной без колебаний (критическое затухание) от `from` к `to` со скоростью пальца `velocity` (px/мс):
 * положение через `t` мс. Скорость к цели урезана до той, с которой пружина не перелетает цель
 */
export function spring(from: number, to: number, velocity: number) {
	const x0 = from - to;
	const v0 = x0 * velocity < 0 ? Math.sign(velocity) * Math.min(Math.abs(velocity), OMEGA * Math.abs(x0)) : velocity;
	return (t: number) => to + (x0 + (v0 + OMEGA * x0) * t) * Math.exp(-OMEGA * t);
}

export function swipe(hooks: SwipeHooks): Attachment<HTMLElement> {
	return (node) => {
		let start: { x: number; y: number } | undefined;
		// Палец, который ведёт жест: события остальных не трогают жест
		let pointer = -1;
		let dragging = false;
		let offset = 0;
		let dy = 0;
		// Сдвиг, который сейчас показан потребителю: в начале жеста он отстаёт от пальца (разгон), потом совпадает с ним
		let shown = 0;
		// Разгон после старта: `'pending'` — ждём первый кадр жеста, число — время этого кадра, `undefined` — разгона нет
		let ramp: 'pending' | number | undefined;
		let samples: { x: number; t: number }[] = [];
		let frame = 0;
		// Доезд после отпускания. Новое касание подхватывает его (`grab`) или завершает сразу, чтобы жесты шли подряд
		let finish: (() => void) | void;
		// Касание подхватило доезд, но палец ещё не повёл: сдвиг, на котором доезд остановлен
		let held: number | undefined;

		function render() {
			frame = 0;
			// Время берём своё, а не кадра: тяжёлый `begin` идёт до этого кадра и в разгон не входит
			const now = performance.now();
			if (ramp === 'pending') ramp = now;
			let k = 1;
			if (ramp !== undefined) {
				k = rampUp(now - ramp);
				if (k === 1) ramp = undefined;
				else frame = requestAnimationFrame(render);
			}
			shown = offset * k;
			hooks.move(shown, dy);
		}

		const stopClick = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
		};

		function velocity(now: number) {
			const recent = samples.filter((s) => now - s.t < 100);
			const first = recent[0];
			const last = recent.at(-1);
			return first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
		}

		function release(v: number | null) {
			cancelAnimationFrame(frame);
			// Кадр жеста ещё не был: быстрый бросок решает по реальному сдвигу, а не по нулевому
			if (ramp === 'pending') ramp = undefined;
			render();
			// Доезд идёт от показанного сдвига, а разгон на этом кончается
			cancelAnimationFrame(frame);
			frame = 0;
			ramp = undefined;
			start = undefined;
			dragging = false;
			// Палец мог отпустить жест над ссылкой: такой клик не должен её открыть
			node.addEventListener('click', stopClick, { capture: true, once: true });
			setTimeout(() => node.removeEventListener('click', stopClick, true), 300);
			finish = hooks.end(shown, v);
		}

		/** Касание кончилось, не став жестом. Подхваченный доезд продолжается с места, где его остановили */
		function letGo() {
			start = undefined;
			if (held === undefined) return;
			offset = held;
			held = undefined;
			release(0);
		}

		function onDown(e: PointerEvent) {
			if (e.pointerType !== 'touch') return;
			// Второй палец — это щипок, а не свайп. Палец без отпускания — потерянный прошлый жест: он отменяется
			if (dragging) release(null);
			else letGo();
			if (!e.isPrimary) return;
			node.removeEventListener('click', stopClick, true);
			held = finish ? hooks.grab?.() : undefined;
			const done = finish;
			finish = undefined;
			if (held === undefined) {
				done?.();
				if (e.clientX < EDGE || e.clientX > innerWidth - EDGE || !hooks.start(e)) return;
			}
			start = { x: e.clientX, y: e.clientY };
			pointer = e.pointerId;
			dy = 0;
			ramp = undefined;
			samples = [];
		}

		function onMove(e: PointerEvent) {
			if (!start || e.pointerId !== pointer) return;
			if (!dragging) {
				const dx = e.clientX - start.x;
				const dy = e.clientY - start.y;
				if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
				if (Math.abs(dy) >= Math.abs(dx) || (held === undefined && !hooks.begin(dx))) return letGo();
				dragging = true;
				// Дальше палец ведёт сам узел жеста: иначе события идут элементу под пальцем, и если его пересоздали
				// (лента подменила посты свежими), Firefox шлёт их удалённому узлу и жест замирает. Раньше нельзя: клик по ссылке ушёл бы узлу
				try {
					node.setPointerCapture(e.pointerId);
				} catch {
					// Палец уже отпущен: отпускание придёт следом
				}
				// Подхваченный доезд продолжается с места, где его остановили. Новый жест ведёт сдвиг от касания, а страница
				// догоняет палец плавным разгоном (`ramp`), а не прыгает на величину порога и не едет с места со скоростью пальца
				if (held === undefined) ramp = 'pending';
				else start.x = e.clientX - held;
				held = undefined;
			}
			offset = e.clientX - start.x;
			dy = e.clientY - start.y;
			samples.push({ x: e.clientX, t: e.timeStamp });
			if (samples.length > 8) samples.shift();
			frame ||= requestAnimationFrame(render);
		}

		function onUp(e: PointerEvent) {
			if (e.pointerId !== pointer) return;
			if (!dragging) return letGo();
			samples.push({ x: e.clientX, t: e.timeStamp });
			release(e.type === 'pointerup' ? velocity(e.timeStamp) : null);
		}

		// Узел потерял палец без отпускания (система забрала жест): жест не должен остаться посреди пути.
		// После обычного отпускания жест уже закончен, а потерю захвата детьми (её забрал узел) не считаем
		function onLost(e: PointerEvent) {
			if (e.target === node && e.pointerId === pointer && dragging) release(null);
		}

		node.addEventListener('pointerdown', onDown, { passive: true });
		node.addEventListener('pointermove', onMove, { passive: true });
		node.addEventListener('pointerup', onUp, { passive: true });
		node.addEventListener('pointercancel', onUp, { passive: true });
		node.addEventListener('lostpointercapture', onLost, { passive: true });
		return () => {
			finish?.();
			cancelAnimationFrame(frame);
			node.removeEventListener('pointerdown', onDown);
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerup', onUp);
			node.removeEventListener('pointercancel', onUp);
			node.removeEventListener('lostpointercapture', onLost);
			node.removeEventListener('click', stopClick, true);
		};
	};
}
