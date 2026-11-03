import { settings } from '$lib/storage/settings.svelte';

export type HapticType = 'tick' | 'click' | 'heavy' | 'double' | 'error';

/** Паттерны вибрации в миллисекундах: число для одиночного импульса или [вибрация, пауза, ...] */
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

function canVibrate(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		'vibrate' in navigator &&
		settings.value.haptics !== false
	);
}

export function triggerHaptic(type: HapticType | number | number[]): boolean {
	if (!canVibrate()) return false;
	try {
		const pattern = typeof type === 'string' ? HAPTIC_PATTERNS[type] : type;
		return navigator.vibrate(pattern);
	} catch {
		return false;
	}
}

export const haptics = {
	tick: () => triggerHaptic('tick'),
	click: () => triggerHaptic('click'),
	heavy: () => triggerHaptic('heavy'),
	double: () => triggerHaptic('double'),
	error: () => triggerHaptic('error'),
	trigger: (pattern: HapticType | number | number[]) => triggerHaptic(pattern)
};
