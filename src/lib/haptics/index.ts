import { settings } from '$lib/storage/settings.svelte';
import { isNative } from '$lib/capacitor';
import { triggerWebHaptic, webHaptics, HAPTIC_PATTERNS } from './web';
import { triggerNativeHaptic, nativeHaptics } from './native';
import type { HapticSignal, HapticsEngine } from './types';

export type { HapticType, HapticSignal, HapticsEngine } from './types';
export { HAPTIC_PATTERNS, canVibrateWeb, triggerWebHaptic, webHaptics } from './web';
export { triggerNativeHaptic, nativeHaptics } from './native';

/**
 * Единая точка приёма сигнала тактильного отклика.
 * Проверяет пользовательские настройки и направляет вызов в активную среду:
 * нативный плагин NativeHaptics в Capacitor или Web Vibration API в PWA / браузере.
 */
export function triggerHaptic(signal: HapticSignal): boolean {
	if (settings.value.haptics === false) return false;
	return isNative() ? triggerNativeHaptic(signal) : triggerWebHaptic(signal);
}

export function selectionStart(): boolean {
	if (settings.value.haptics === false) return false;
	return isNative() ? nativeHaptics.selectionStart() : webHaptics.selectionStart();
}

export function selectionChanged(): boolean {
	if (settings.value.haptics === false) return false;
	return isNative() ? nativeHaptics.selectionChanged() : webHaptics.selectionChanged();
}

export function selectionEnd(): boolean {
	if (settings.value.haptics === false) return false;
	return isNative() ? nativeHaptics.selectionEnd() : webHaptics.selectionEnd();
}

export function triggerTension(scale = 0.3): boolean {
	if (settings.value.haptics === false) return false;
	return isNative() ? nativeHaptics.tension(scale) : false;
}

export const haptics: HapticsEngine = {
	tick: () => triggerHaptic('tick'),
	soft: () => triggerHaptic('soft'),
	click: () => triggerHaptic('click'),
	like: () => triggerHaptic('like'),
	dislike: () => triggerHaptic('dislike'),
	heavy: () => triggerHaptic('heavy'),
	double: () => triggerHaptic('double'),
	error: () => triggerHaptic('error'),
	tension: (scale) => triggerTension(scale),
	trigger: (signal) => triggerHaptic(signal),
	selectionStart: () => selectionStart(),
	selectionChanged: () => selectionChanged(),
	selectionEnd: () => selectionEnd()
};

export interface TensionController {
	readonly armed: boolean;
	reset: () => void;
	move: (distance: number, threshold: number, canCommit?: boolean) => boolean;
}

/**
 * Контроллер тактильного натяжения для жестов (паттерн Android Resist / Circle to Search).
 * По мере приближения к порогу `threshold` уплотняет шаг (16px → 6px) и наращивает силу
 * `PRIMITIVE_LOW_TICK` (0.08 → 0.62), а на пороге даёт отсечку `snap` (`click` или `heavy`).
 */
export function createTension(snap: 'click' | 'heavy' = 'click'): TensionController {
	let armed = false;
	let lastDistance = 0;
	let lastTime = 0;

	return {
		get armed() {
			return armed;
		},
		reset() {
			armed = false;
			lastDistance = 0;
			lastTime = 0;
		},
		move(distance: number, threshold: number, canCommit = true): boolean {
			const d = Math.max(0, distance);
			const now = performance.now();

			if (canCommit && threshold > 0) {
				const next = d >= threshold;
				if (next !== armed) {
					armed = next;
					lastDistance = d;
					lastTime = now;
					if (armed) haptics[snap]();
					else haptics.soft();
					return armed;
				}
				if (armed) {
					lastDistance = d;
					return true;
				}
			}

			const p = threshold > 0 ? Math.min(1, d / threshold) : 0;
			const delta = d - lastDistance;
			const step = (16 - 10 * p) * (delta >= 0 ? 1 : 1.4);

			if (Math.abs(delta) >= step) {
				lastDistance = d;
				if (now - lastTime >= 24) {
					lastTime = now;
					const scale = 0.08 + 0.54 * Math.pow(p, 1.2);
					haptics.tension(delta >= 0 ? scale : scale * 0.55);
				}
			}
			return armed;
		}
	};
}
