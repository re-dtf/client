import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { HapticSignal, HapticsEngine } from './types';

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
				Haptics.selectionChanged().catch(() => {});
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
	trigger: (signal) => triggerNativeHaptic(signal)
};
