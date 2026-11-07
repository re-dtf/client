import type { Attachment } from 'svelte/attachments';
import { reducedMotion } from './motion';
import { glide, settle, swipe } from './swipe';
import { activeTheme } from './themes/index.svelte';
import { getCurrentDevice } from './themes/types';

/*
 * Боковая панель, которую выдвигают пальцем: свайп вправо по первой ленте открывает её, свайп влево по открытой закрывает.
 * Только в мобильной раскладке тем с жестами. Как панель выглядит и что при этом двигается, решает тема: модуль ведёт
 * только положение от 0 (закрыта) до 1 (открыта).
 */

export interface Drawer {
	/** Ход пальца от закрытой панели до открытой */
	width: () => number;
	/** Положение сейчас, даже посреди доезда: жест подхватывает панель, а не прыгает */
	progress: () => number;
	/** Палец ведёт панель: поставить положение `p` без анимации */
	drag: (p: number) => void;
	/** Палец отпущен: доехать до открытой или закрытой панели за `ms` */
	settle: (open: boolean, ms: number) => void;
}

let drawer: Drawer | undefined;

/** Тема сообщает панель, которую можно тянуть. Возвращает отписку */
export function provideDrawer(d: Drawer) {
	drawer = d;
	return () => {
		if (drawer === d) drawer = undefined;
	};
}

const allowed = () => activeTheme.gestures && getCurrentDevice() === 'mobile';

export interface DrawerPull {
	/** Сдвиг пальца от начала жеста, вправо — положительный */
	move: (offset: number) => void;
	end: (offset: number, velocity: number | null) => void;
}

/** Взять панель пальцем */
export function pullDrawer(): DrawerPull | undefined {
	const d = drawer;
	if (!d || !allowed()) return;
	const from = d.progress();
	const width = d.width() || innerWidth;
	let p = from;
	d.drag(p);
	return {
		move(offset) {
			p = Math.min(1, Math.max(0, from + offset / width));
			d.drag(p);
		},
		end(offset, v) {
			const dir = v === null ? 0 : settle(offset, v, width);
			const open = dir ? dir < 0 : from >= 0.5;
			d.settle(open, reducedMotion() ? 0 : glide(((open ? 1 : 0) - p) * width, v ?? 0));
		}
	};
}

/** Закрытие свайпом влево по открытой панели */
export function drawerSwipe(isOpen: () => boolean): Attachment<HTMLElement> {
	let pull: DrawerPull | undefined;
	return swipe({
		start: () => isOpen() && allowed(),
		begin(dx) {
			pull = dx < 0 ? pullDrawer() : undefined;
			return !!pull;
		},
		move: (offset) => pull?.move(offset),
		end(offset, v) {
			pull?.end(offset, v);
			pull = undefined;
		}
	});
}
