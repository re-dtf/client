/*
 * Боковая панель на смартфоне: шапка стоит, а содержимое страницы уезжает вправо, и из-под него поднимаются пункты панели.
 * Нижняя строка на это время уходит вниз. Всё задаётся одним положением от 0 до 1: его ведут палец или доезд,
 * поэтому кнопка меню и свайп выглядят одинаково. Пишутся только transform и opacity: двигает композитор.
 */

/** Насколько содержимое панели отстаёт от ленты в начале, доля его ширины */
const LAG = 0.35;
/** Масштаб содержимого панели в начале: оно поднимается из глубины */
const DEPTH = 0.9;
const DURATION = 420;

/** Кривая доезда (та же, что у жестов): быстро трогается и плавно садится */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function pushDrawer(panel: HTMLElement, items: HTMLElement) {
	let p = 0;
	let target = 0;
	let frame = 0;
	// Что сдвигается вместе с панелью. Узлы берутся на старте: страницы и строка под ними пересоздаются
	let content: HTMLElement | null = null;
	let bar: HTMLElement | null = null;

	function render(next: number) {
		if (!p && next) {
			content = document.getElementById('content');
			bar = document.querySelector<HTMLElement>('.mobile-bar-container');
			panel.style.visibility = 'visible';
			// Лента ложится поверх панели своим фоном, без тени: граница — только разница фонов
			if (content) Object.assign(content.style, { position: 'relative', zIndex: '2', background: 'var(--bg-main)', willChange: 'transform' });
			if (bar) bar.style.willChange = 'transform';
		}
		p = next;
		if (!p) return clear();
		const width = panel.offsetWidth;
		if (content) content.style.transform = `translate3d(${p * width}px, 0, 0)`;
		if (bar) bar.style.transform = `translate3d(0, ${p * (bar.offsetHeight + 24)}px, 0)`;
		items.style.transform = `translate3d(${-(1 - p) * LAG * 100}%, 0, 0) scale(${DEPTH + (1 - DEPTH) * p})`;
		items.style.opacity = `${Math.max(0, p * 1.5 - 0.5)}`;
	}

	function clear() {
		for (const el of [content, bar]) if (el) Object.assign(el.style, { position: '', zIndex: '', background: '', willChange: '', transform: '' });
		panel.style.visibility = items.style.transform = items.style.opacity = '';
		content = bar = null;
	}

	return {
		progress: () => p,
		/** Поставить положение сразу (палец) */
		set(next: number) {
			cancelAnimationFrame(frame);
			target = next;
			render(next);
		},
		/** Доехать до открытой или закрытой панели. Повторный вызов с той же целью не перезапускает доезд */
		animate(open: boolean, ms = DURATION) {
			const to = open ? 1 : 0;
			if (to === target && (frame || p === to)) return;
			cancelAnimationFrame(frame);
			frame = 0;
			target = to;
			const from = p;
			if (ms <= 0 || from === to) return render(to);
			const start = performance.now();
			const step = (now: number) => {
				const t = Math.min(1, (now - start) / ms);
				render(from + (to - from) * easeOut(t));
				frame = t < 1 ? requestAnimationFrame(step) : 0;
			};
			frame = requestAnimationFrame(step);
		},
		/** Убрать всё сразу: окно выросло, и панель стала колонкой */
		reset() {
			cancelAnimationFrame(frame);
			frame = 0;
			target = p = 0;
			clear();
		}
	};
}
