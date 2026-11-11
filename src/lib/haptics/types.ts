/**
 * Типы тактильного отклика:
 * - tick: ультракороткий микро-щелчок (вкладки, меню, скролл-выбор)
 * - soft: мягкий приглушённый отклик (снятие лайка/реакции/закладки, выключение тумблера)
 * - click: сухой чёткий щелчок (закладки, кнопки, включение тумблера)
 * - like: бодрый восходящий двойной импульс (лайк и плюсовые реакции)
 * - dislike: глухой нисходящий удар (дизлайк и минусовые реакции)
 * - heavy: плотный акцентный импульс (долгое нажатие, натяжение до порога)
 * - double: двойной импульс (успех, обновление ленты)
 * - error: предупреждающий импульс ошибки
 */
export type HapticType = 'tick' | 'soft' | 'click' | 'like' | 'dislike' | 'heavy' | 'double' | 'error';

export type HapticSignal = HapticType | number | number[];

export interface HapticsEngine {
	tick: () => boolean;
	soft: () => boolean;
	click: () => boolean;
	like: () => boolean;
	dislike: () => boolean;
	heavy: () => boolean;
	double: () => boolean;
	error: () => boolean;
	tension: (scale?: number) => boolean;
	trigger: (signal: HapticSignal) => boolean;
	selectionStart: () => boolean;
	selectionChanged: () => boolean;
	selectionEnd: () => boolean;
}
