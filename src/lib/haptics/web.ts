import type { HapticType, HapticSignal, HapticsEngine } from './types';

/** Паттерны вибрации в миллисекундах для PWA / Web */
export const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
	/** Микро-щелчок (2 мс) — сухой острый тик для вкладок, меню и переключателей */
	tick: 2,
	/** Сухой щелчок (5 мс) — чёткий таптик для лайков, реакций и закладок без хвоста гудения */
	click: 5,
	/** Плотный импульс (10 мс) — акцентный тап для долгого нажатия и модалок */
	heavy: 10,
	/** Двойной микро-клик — завершение действия, обновление */
	double: [3, 35, 4],
	/** Двойной резкий импульс ошибки */
	error: [6, 35, 6]
};

export function canVibrateWeb(): boolean {
	return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function triggerWebHaptic(signal: HapticSignal): boolean {
	if (!canVibrateWeb()) return false;
	try {
		const pattern = typeof signal === 'string' ? HAPTIC_PATTERNS[signal] : signal;
		return navigator.vibrate(pattern);
	} catch {
		return false;
	}
}

export const webHaptics: HapticsEngine = {
	tick: () => triggerWebHaptic('tick'),
	click: () => triggerWebHaptic('click'),
	heavy: () => triggerWebHaptic('heavy'),
	double: () => triggerWebHaptic('double'),
	error: () => triggerWebHaptic('error'),
	trigger: (signal) => triggerWebHaptic(signal),
	selectionStart: () => canVibrateWeb(),
	selectionChanged: () => triggerWebHaptic('tick'),
	selectionEnd: () => canVibrateWeb()
};
