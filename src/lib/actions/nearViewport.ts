/*
 * Далеко ли карточка от экрана. Лента из сотен постов держит сотни декодированных картинок и десяток видео,
 * от этого растёт память и тормозят переходы: карточка, ушедшая дальше окна, отдаёт медиа, а заглушка с
 * пропорциями остаётся, поэтому раскладка не меняется. Окно в несколько экранов: подгрузка успевает раньше взгляда.
 */
const MARGIN = '300% 0px';

const listeners = new WeakMap<Element, (near: boolean) => void>();
let observer: IntersectionObserver | undefined;

function observe() {
	return (observer ??= new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				// Пока карточка не рисуется (лента скрыта под постом, соседняя лента, слой в стеке), браузер считает её
				// невидимой, хотя она у самого экрана, а прямоугольник у неё нулевой. Это пропускаем: иначе при возврате
				// вся лента перезагрузила бы медиа
				if (entry.isIntersecting || entry.boundingClientRect.height > 0) listeners.get(entry.target)?.(entry.isIntersecting);
			}
		},
		{ rootMargin: MARGIN }
	));
}

/** `{@attach nearViewport((near) => …)}`: сообщает, попала ли карточка в окно вокруг экрана и вышла ли из него */
export const nearViewport = (onchange: (near: boolean) => void) => (el: Element) => {
	listeners.set(el, onchange);
	observe().observe(el);
	return () => {
		observer?.unobserve(el);
		listeners.delete(el);
	};
};
