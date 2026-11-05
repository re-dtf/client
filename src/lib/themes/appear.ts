import { untrack } from 'svelte';
import { play, type AnimKey } from '$lib/motion';
import { activeTheme } from './index.svelte';

const played = new WeakSet<Element>();
const handlers = new Map<AnimKey, (el: Element) => void>();

/**
 * Аттач `{@attach appear('contentIn')}`: проигрывает анимацию активной темы при появлении элемента.
 * Тема без такой анимации ничего не делает. Смена темы анимацию не перезапускает.
 */
export const appear = (key: AnimKey) => {
	let fn = handlers.get(key);
	if (!fn) {
		fn = (el: Element) => {
			if (played.has(el)) return;
			played.add(el);
			void untrack(() => play(el, activeTheme.motion?.[key]));
		};
		handlers.set(key, fn);
	}
	return fn;
};
