/*
 * Универсальный переход между страницами (Recede → Hold → Approach).
 * Старый экран уходит вглубь при ожидании сети (>80мс), при задержке >1.5с плавно размывается и «дышит»,
 * а при готовности нового экрана плавно передает ему фокус.
 * Для быстрых переходов (из кэша) экран не отдаляется, а сразу плавно сменяется (fastDepart + fastApproach).
 * Анимации задаются данными темы (ThemeMotion).
 */

import { activeTheme } from '$lib/themes/index.svelte';
import { fluent, play, reducedMotion, type Anim } from '$lib/motion';
import { tick } from 'svelte';

export interface ClickOrigin {
	rect: DOMRect;
	point: { x: number; y: number };
}

const SLOW_DELAY = 1500; // Порог перехода в фазу Hold (живое размытие + спиннер)
const FAIL_SAFE_TIMEOUT = 12000; // Предохранитель от вечного зависания при сбое сети

let active = $state(false);
let slow = $state(false);
let outgoingId = $state<string | null>(null);
let incomingId = $state<string | null>(null);
let incomingHidden = $state(true);

let currentOrigin: ClickOrigin | null = null;
let failSafeTimer: ReturnType<typeof setTimeout> | undefined;

let outgoingScreen: HTMLElement | null = null;
let unfreezeOutgoing: (() => void) | null = null;

let currentRecedeAnim: Animation | undefined;
let currentWaitAnim: Animation | undefined;
let currentBreatheAnim: Animation | undefined;
let currentDepartAnim: Animation | undefined;
let currentIncomingAnim: Animation | undefined;

let transitionStartTime = 0;
let slowTimer: ReturnType<typeof setTimeout> | undefined;
let hadHoldBlur = false;

/** Проверить, поддерживает ли текущая тема анимацию перехода */
export function shouldTransition(): boolean {
	if (typeof window === 'undefined') return false;
	if (reducedMotion()) {
		console.warn('[reDTF] Переход между страницами пропущен: в системе активен prefers-reduced-motion');
		return false;
	}
	const m = activeTheme.motion;
	return Boolean(m?.recede && m?.approach);
}

/** Запомнить элемент и координаты клика */
export function markOrigin(e: MouseEvent) {
	if (typeof window === 'undefined') return;

	const target = e.currentTarget as HTMLElement | null;
	const rect = target ? target.getBoundingClientRect() : new DOMRect(e.clientX, e.clientY, 0, 0);

	currentOrigin = {
		rect,
		point: { x: e.clientX, y: e.clientY }
	};
}

/** Временно зафиксировать экран по размерам окна */
export function freeze(screen: HTMLElement, rect: DOMRect, headerBottom?: number): () => void {
	if (headerBottom === undefined) {
		const headerEl = typeof document !== 'undefined' ? (document.querySelector('header.header') ?? document.querySelector('header')) : null;
		headerBottom = headerEl ? Math.round(headerEl.getBoundingClientRect().bottom) : 0;
	}
	const top = Math.max(rect.top, headerBottom);
	const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
	const prev = {
		position: screen.style.position,
		top: screen.style.top,
		left: screen.style.left,
		width: screen.style.width,
		height: screen.style.height,
		overflow: screen.style.overflow,
		margin: screen.style.margin,
		zIndex: screen.style.zIndex,
		pointerEvents: screen.style.pointerEvents,
		transformOrigin: screen.style.transformOrigin,
		filter: screen.style.filter,
		opacity: screen.style.opacity,
		transform: screen.style.transform,
		willChange: screen.style.willChange
	};

	Object.assign(screen.style, {
		position: 'fixed',
		top: `${top}px`,
		left: `${rect.left}px`,
		width: `${rect.width}px`,
		height: `${winHeight - top}px`,
		overflow: 'hidden',
		margin: '0',
		zIndex: '10',
		pointerEvents: 'none',
		willChange: 'transform, opacity'
	});
	screen.scrollTop = top - rect.top;

	return () => {
		Object.assign(screen.style, prev);
	};
}

/** Запустить переход от старого слоя к новому */
export function startTransition(fromId: string, toId: string, screenEl: HTMLElement, isInstant = false) {
	cleanup();

	if (!shouldTransition()) return;

	active = true;
	slow = false;
	incomingHidden = true;
	outgoingId = fromId;
	incomingId = toId;
	outgoingScreen = screenEl;
	hadHoldBlur = false;
	transitionStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

	const headerEl = typeof document !== 'undefined' ? (document.querySelector('header.header') ?? document.querySelector('header')) : null;
	const headerBottom = headerEl ? Math.round(headerEl.getBoundingClientRect().bottom) : 0;
	const rect = screenEl.getBoundingClientRect();
	const top = Math.max(rect.top, headerBottom);
	const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
	const visibleHeight = Math.max(100, winHeight - top);

	unfreezeOutgoing = freeze(screenEl, rect, headerBottom);

	// Оптический центр масштабирования по оси глубины Z
	screenEl.style.transformOrigin = `50% ${Math.round(visibleHeight * 0.4)}px`;

	// Предохранитель от зависания при упавшей сети
	failSafeTimer = setTimeout(() => {
		if (active) abortTransition();
	}, FAIL_SAFE_TIMEOUT);

	// Фаза Recede: уход вглубь запускается ТОЛЬКО при ожидании сети.
	// Для мгновенных (кэшированных) переходов экран не отдаляется, исключая рывок назад-вперед.
	if (!isInstant) {
		const motion = activeTheme.motion;
		const recedeAnim = motion?.recede;
		if (recedeAnim) {
			currentRecedeAnim = play(screenEl, recedeAnim, 'forwards');
		}

		// Таймер Hold: если загрузка дольше SLOW_DELAY
		slowTimer = setTimeout(() => {
			if (!active || outgoingId !== fromId) return;
			slow = true;
			hadHoldBlur = true;

			// Плавно нарастает размытие
			const waitAnim = motion?.wait;
			if (waitAnim && outgoingScreen) {
				currentWaitAnim = play(outgoingScreen, waitAnim, 'forwards');
				currentWaitAnim?.finished.then(() => {
					if (!active || outgoingId !== fromId || !outgoingScreen) return;
					// Дыхание на чистых transform и opacity
					const breatheAnim = motion?.breathe;
					if (breatheAnim) {
						currentBreatheAnim = play(outgoingScreen, breatheAnim);
					}
				}).catch(() => {});
			}
		}, SLOW_DELAY);
	}
}

/** Сообщить, что входящий слой готов к показу */
export async function incomingReady(layerId: string, incomingScreen: HTMLElement): Promise<void> {
	if (!active || incomingId !== layerId || !outgoingScreen || !activeTheme.motion) {
		return;
	}

	if (slowTimer) {
		clearTimeout(slowTimer);
		slowTimer = undefined;
	}

	// Останавливаем дыхание
	if (currentBreatheAnim) {
		currentBreatheAnim.cancel();
		currentBreatheAnim = undefined;
	}

	const isFast = !slow;
	const motion = activeTheme.motion;
	const promises: Promise<unknown>[] = [];

	// 1. Анимация ухода старого экрана
	if (outgoingScreen) {
		if (isFast) {
			const fastDepartAnim = motion?.fastDepart ?? fluent.fastDepart;
			if (fastDepartAnim) {
				currentRecedeAnim?.cancel();
				currentRecedeAnim = undefined;

				currentDepartAnim = play(outgoingScreen, fastDepartAnim, 'forwards');
				if (currentDepartAnim) promises.push(currentDepartAnim.finished.catch(() => {}));
			}
		} else if (motion?.depart) {
			try {
				currentRecedeAnim?.commitStyles?.();
				currentWaitAnim?.commitStyles?.();
			} catch {}
			currentRecedeAnim?.cancel();
			currentWaitAnim?.cancel();

			currentDepartAnim = play(outgoingScreen, motion.depart, 'forwards');
			if (currentDepartAnim) promises.push(currentDepartAnim.finished.catch(() => {}));
		}
	}

	// Делаем входящий экран видимым перед началом анимации
	incomingHidden = false;
	const parentLayer = incomingScreen.closest('[data-layer]') as HTMLElement | null;
	if (parentLayer) {
		parentLayer.style.visibility = 'visible';
	}
	incomingScreen.style.visibility = 'visible';
	incomingScreen.style.willChange = 'transform, opacity';
	await tick();

	// 2. Анимация появления нового экрана
	const approachAnim = isFast ? (motion?.fastApproach ?? fluent.fastApproach) : motion?.approach;
	if (approachAnim) {
		const incomingRect = incomingScreen.getBoundingClientRect();
		const visibleTop = Math.max(0, incomingRect.top);
		const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
		const visibleHeight = Math.max(100, winHeight - visibleTop);
		const originY = Math.round(visibleHeight * 0.4);

		incomingScreen.style.zIndex = '30';
		incomingScreen.style.position = 'relative';
		incomingScreen.style.transformOrigin = `50% ${originY}px`;

		let keyframes: Keyframe[] = approachAnim.keyframes.map((kf) => ({ ...kf }));
		if (!isFast && hadHoldBlur) {
			keyframes = keyframes.map((kf, i, arr) => {
				const progress = i / (arr.length - 1);
				const blur = Math.round(14 * (1 - progress));
				return { ...kf, filter: `blur(${blur}px)` };
			});
		}

		const anim: Anim = {
			keyframes,
			duration: approachAnim.duration,
			easing: approachAnim.easing
		};

		currentIncomingAnim = play(incomingScreen, anim, 'forwards');
		if (currentIncomingAnim) {
			promises.push(
				currentIncomingAnim.finished
					.then(() => {
						incomingScreen.style.removeProperty('z-index');
						incomingScreen.style.removeProperty('position');
						incomingScreen.style.removeProperty('transform-origin');
						incomingScreen.style.removeProperty('will-change');
					})
					.catch(() => {
						incomingScreen.style.removeProperty('z-index');
						incomingScreen.style.removeProperty('position');
						incomingScreen.style.removeProperty('transform-origin');
						incomingScreen.style.removeProperty('will-change');
					})
			);
		}
	}

	await Promise.all(promises);

	// Завершение перехода
	cleanup();
}

/** Отмена перехода при нажатии «Назад» до завершения */
export function abortTransition() {
	if (!active || !outgoingScreen) return;

	if (failSafeTimer) {
		clearTimeout(failSafeTimer);
		failSafeTimer = undefined;
	}
	if (slowTimer) {
		clearTimeout(slowTimer);
		slowTimer = undefined;
	}
	currentBreatheAnim?.cancel();
	currentRecedeAnim?.cancel();
	currentWaitAnim?.cancel();
	currentDepartAnim?.cancel();
	currentIncomingAnim?.cancel();

	// Возврат к нормальному виду старого экрана
	const returnAnim = outgoingScreen.animate([
		{ transform: 'none', opacity: 1, filter: 'none' }
	], {
		duration: 250,
		easing: 'cubic-bezier(0.165, 0.84, 0.44, 1)'
	});

	returnAnim.finished.finally(() => {
		returnAnim.cancel();
		cleanup();
	});
}

function cleanup() {
	if (failSafeTimer) {
		clearTimeout(failSafeTimer);
		failSafeTimer = undefined;
	}
	if (slowTimer) {
		clearTimeout(slowTimer);
		slowTimer = undefined;
	}
	currentRecedeAnim?.cancel();
	currentRecedeAnim = undefined;

	currentWaitAnim?.cancel();
	currentWaitAnim = undefined;

	currentBreatheAnim?.cancel();
	currentBreatheAnim = undefined;

	currentDepartAnim?.cancel();
	currentDepartAnim = undefined;

	currentIncomingAnim?.cancel();
	currentIncomingAnim = undefined;

	if (outgoingScreen) {
		const parentLayer = outgoingScreen.closest('[data-layer]') as HTMLElement | null;
		if (parentLayer) {
			parentLayer.style.display = 'none';
		}
		outgoingScreen.style.removeProperty('filter');
		outgoingScreen.style.removeProperty('transform');
		outgoingScreen.style.removeProperty('opacity');
		outgoingScreen.style.removeProperty('transform-origin');
		outgoingScreen.style.removeProperty('will-change');
	}

	if (unfreezeOutgoing) {
		unfreezeOutgoing();
		unfreezeOutgoing = null;
	}
	outgoingScreen = null;
	active = false;
	slow = false;
	incomingHidden = true;
	outgoingId = null;
	incomingId = null;
	currentOrigin = null;
	hadHoldBlur = false;
	transitionStartTime = 0;
}

export const pageTransition = {
	get active() {
		return active;
	},
	get slow() {
		return slow;
	},
	get outgoingId() {
		return outgoingId;
	},
	get incomingId() {
		return incomingId;
	},
	get incomingHidden() {
		return incomingHidden;
	},
	isOutgoing(id: string) {
		return active && outgoingId === id;
	},
	isIncoming(id: string) {
		return active && incomingId === id;
	}
};
