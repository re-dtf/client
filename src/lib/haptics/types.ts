/**
 * Типы тактильного отклика:
 * - tick: ультракороткий микро-щелчок (вкладки, меню, переключатели)
 * - click: сухой чёткий щелчок (лайки, дизлайки, закладки, кнопки)
 * - heavy: плотный акцентный импульс (долгое нажатие, открытие модалок)
 * - double: двойной импульс (успех, подтверждение действия)
 * - error: предупреждающий импульс ошибки
 */
export type HapticType = 'tick' | 'click' | 'heavy' | 'double' | 'error';

export type HapticSignal = HapticType | number | number[];

export interface HapticsEngine {
	tick: () => boolean;
	click: () => boolean;
	heavy: () => boolean;
	double: () => boolean;
	error: () => boolean;
	trigger: (signal: HapticSignal) => boolean;
}
