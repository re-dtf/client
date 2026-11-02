import { untrack } from 'svelte';
import { play, type ThemeMotion } from '$lib/motion';
import { activeTheme } from './index.svelte';

/**
 * Аттач `{@attach appear('contentIn')}`: проигрывает анимацию активной темы при появлении элемента.
 * Тема без такой анимации ничего не делает. Смена темы анимацию не перезапускает.
 */
export const appear = (key: keyof ThemeMotion) => (el: Element) => untrack(() => play(el, activeTheme.motion?.[key]));
