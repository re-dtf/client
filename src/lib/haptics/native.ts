import { NativeHaptics } from './hardware';
import type { HapticSignal, HapticsEngine } from './types';

let selectionActive = false;

export function nativeSelectionStart(): boolean {
	selectionActive = true;
	return true;
}

export function nativeSelectionChanged(): boolean {
	try {
		selectionActive = true;
		NativeHaptics.tick().catch(() => {});
		return true;
	} catch {
		return false;
	}
}

export function nativeSelectionEnd(): boolean {
	selectionActive = false;
	return true;
}

export function nativeTension(scale = 0.3): boolean {
	try {
		NativeHaptics.tension({ scale }).catch(() => {});
		return true;
	} catch {
		return false;
	}
}

/**
 * Вызов нативного тактильного отклика через кастомный плагин NativeHaptics.
 * Запускается асинхронно без блокировки потока UI с перехватом возможных ошибок.
 */
export function triggerNativeHaptic(signal: HapticSignal): boolean {
	try {
		if (typeof signal === 'number') {
			NativeHaptics.testWaveform({ timings: [signal] }).catch(() => {});
			return true;
		}

		if (Array.isArray(signal)) {
			NativeHaptics.testWaveform({ timings: signal }).catch(() => {});
			return true;
		}

		switch (signal) {
			case 'tick':
				NativeHaptics.tick().catch(() => {});
				break;
			case 'soft':
				NativeHaptics.soft().catch(() => {});
				break;
			case 'click':
				NativeHaptics.click().catch(() => {});
				break;
			case 'like':
				NativeHaptics.like().catch(() => {});
				break;
			case 'dislike':
				NativeHaptics.dislike().catch(() => {});
				break;
			case 'heavy':
				NativeHaptics.heavy().catch(() => {});
				break;
			case 'double':
				NativeHaptics.doubleClick().catch(() => {});
				break;
			case 'error':
				NativeHaptics.error().catch(() => {});
				break;
			default:
				NativeHaptics.click().catch(() => {});
				break;
		}
		return true;
	} catch {
		return false;
	}
}

export const nativeHaptics: HapticsEngine = {
	tick: () => triggerNativeHaptic('tick'),
	soft: () => triggerNativeHaptic('soft'),
	click: () => triggerNativeHaptic('click'),
	like: () => triggerNativeHaptic('like'),
	dislike: () => triggerNativeHaptic('dislike'),
	heavy: () => triggerNativeHaptic('heavy'),
	double: () => triggerNativeHaptic('double'),
	error: () => triggerNativeHaptic('error'),
	tension: (scale) => nativeTension(scale),
	trigger: (signal) => triggerNativeHaptic(signal),
	selectionStart: () => nativeSelectionStart(),
	selectionChanged: () => nativeSelectionChanged(),
	selectionEnd: () => nativeSelectionEnd()
};
