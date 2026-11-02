import { backdropIn, play } from '$lib/motion';
import { activeTheme } from '$lib/themes/index.svelte';

/*
 * Движение модальных окон, общее для оверлеев навигации (ModalShell) и локальных диалогов (Dialog).
 * Анимации окна берутся из motion активной темы.
 */

/** Подложка затемняется */
export function backdropShow(backdrop: Element) {
	play(backdrop, backdropIn);
}

/** Окно появляется. Обёртки display: contents анимировать нельзя, поэтому играем на их детях */
export function modalShow(parent: Element) {
	for (const child of parent.children) play(child, activeTheme.motion?.modalIn);
}

// Svelte вызывает функцию перехода не один раз, а уход должен стартовать однажды
const leaving = new WeakSet<Element>();

/** Svelte-переход ухода (`out:modalHide|global`): подложка остаётся, пока тема проигрывает анимацию; без неё исчезает сразу */
export function modalHide(node: Element) {
	const anim = activeTheme.motion?.modalOut;
	if (!anim) return { duration: 0 };
	if (!leaving.has(node)) {
		leaving.add(node);
		play(node, anim, 'forwards');
	}
	return { duration: anim.duration };
}
