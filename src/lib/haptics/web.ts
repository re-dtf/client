import type { HapticType, HapticSignal, HapticsEngine } from './types';

/** Паттерны вибрации в миллисекундах для PWA / Web */
export const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
	/** Микро-щелчок (2 мс) — сухой острый тик для вкладок, меню и навигации */
	tick: 2,
	/** Мягкий отклик (1 мс) — снятие лайка/реакции/закладки, выключение тумблера */
	soft: 1,
	/** Сухой щелчок (5 мс) — чёткий таптик для закладок и кнопок */
	click: 5,
	/** Бодрый восходящий двойной импульс — лайк и плюсовые реакции */
	like: [2, 25, 5],
	/** Плотное нисходящее эхо — дизлайк и минусовые реакции */
	dislike: [4, 30, 8],
	/** Плотный импульс (10 мс) — акцентный тап для долгого нажатия и натяжения */
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
	soft: () => triggerWebHaptic('soft'),
	click: () => triggerWebHaptic('click'),
	like: () => triggerWebHaptic('like'),
	dislike: () => triggerWebHaptic('dislike'),
	heavy: () => triggerWebHaptic('heavy'),
	double: () => triggerWebHaptic('double'),
	error: () => triggerWebHaptic('error'),
	tension: () => false,
	trigger: (signal) => triggerWebHaptic(signal),
	selectionStart: () => canVibrateWeb(),
	selectionChanged: () => triggerWebHaptic('tick'),
	selectionEnd: () => canVibrateWeb()
};
