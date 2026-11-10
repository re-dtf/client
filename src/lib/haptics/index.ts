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
 * Capacitor Native Haptics в нативном приложении или Web Vibration API в PWA / браузере.
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

export const haptics: HapticsEngine = {
	tick: () => triggerHaptic('tick'),
	click: () => triggerHaptic('click'),
	heavy: () => triggerHaptic('heavy'),
	double: () => triggerHaptic('double'),
	error: () => triggerHaptic('error'),
	trigger: (signal) => triggerHaptic(signal),
	selectionStart: () => selectionStart(),
	selectionChanged: () => selectionChanged(),
	selectionEnd: () => selectionEnd()
};
