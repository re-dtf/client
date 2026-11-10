import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { HapticSignal, HapticsEngine } from './types';

let selectionActive = false;

export function nativeSelectionStart(): boolean {
	try {
		selectionActive = true;
		Haptics.selectionStart().catch(() => {});
		return true;
	} catch {
		return false;
	}
}

export function nativeSelectionChanged(): boolean {
	try {
		if (!selectionActive) {
			selectionActive = true;
			Haptics.selectionStart().catch(() => {});
		}
		Haptics.selectionChanged().catch(() => {});
		return true;
	} catch {
		return false;
	}
}

export function nativeSelectionEnd(): boolean {
	try {
		selectionActive = false;
		Haptics.selectionEnd().catch(() => {});
		return true;
	} catch {
		return false;
	}
}

/**
 * Вызов нативного тактильного отклика через Capacitor Haptics.
 * Запускается асинхронно без блокировки потока UI с перехватом возможных ошибок.
 */
export function triggerNativeHaptic(signal: HapticSignal): boolean {
	try {
		if (typeof signal === 'number') {
			Haptics.vibrate({ duration: signal }).catch(() => {});
			return true;
		}

		if (Array.isArray(signal)) {
			const duration = signal[0] ?? 10;
			Haptics.vibrate({ duration }).catch(() => {});
			return true;
		}

		switch (signal) {
			case 'tick':
				nativeSelectionChanged();
				break;
			case 'click':
				Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
				break;
			case 'heavy':
				Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
				break;
			case 'double':
				Haptics.notification({ type: NotificationType.Success }).catch(() => {});
				break;
			case 'error':
				Haptics.notification({ type: NotificationType.Error }).catch(() => {});
				break;
			default:
				Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
				break;
		}
		return true;
	} catch {
		return false;
	}
}

export const nativeHaptics: HapticsEngine = {
	tick: () => triggerNativeHaptic('tick'),
	click: () => triggerNativeHaptic('click'),
	heavy: () => triggerNativeHaptic('heavy'),
	double: () => triggerNativeHaptic('double'),
	error: () => triggerNativeHaptic('error'),
	trigger: (signal) => triggerNativeHaptic(signal),
	selectionStart: () => nativeSelectionStart(),
	selectionChanged: () => nativeSelectionChanged(),
	selectionEnd: () => nativeSelectionEnd()
};
