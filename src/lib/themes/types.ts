import type { ThemeMotion } from '$lib/motion';

/** Описание темы. Лежит в `<тема>/theme.ts`, реестр находит его сам (см. registry.ts). */

export interface FieldDependency {
	/** Ключ поля, от которого зависит видимость */
	key: string;
	/** Значение или список значений, при которых поле видимо */
	value: SettingValue | SettingValue[];
}

/** Брейкпоинт мобильных устройств (смартфонов). До 719px включительно — мобильный режим, выше — десктоп */
export const MOBILE_BREAKPOINT = 719;

/** Устройство, на котором отображается настройка */
export type SettingDevice = 'mobile' | 'desktop';

interface FieldBase {
	/** Ключ в сохранённых настройках темы */
	key: string;
	title: string;
	description?: string;
	/** Условие показа: поле отображается только если значение другого поля совпадает с указанным */
	dependsOn?: FieldDependency;
	/** Устройство, на котором доступна настройка: только смартфоны ('mobile') или десктопы ('desktop') */
	device?: SettingDevice | SettingDevice[];
}

export interface ChoiceOption {
	value: string;
	title: string;
	description?: string;
}

/** Выбор одного из вариантов (радиокнопки или выпадающий список) */
export interface ChoiceField extends FieldBase {
	type: 'radio' | 'select';
	options: ChoiceOption[];
	default: string;
}

/** Переключатель вкл/выкл */
export interface ToggleField extends FieldBase {
	type: 'toggle';
	default: boolean;
}

/** Ползунок с делениями: выбирается одно из чисел `steps` */
export interface SliderField extends FieldBase {
	type: 'slider';
	steps: number[];
	default: number;
	/** Подпись к значению, например `px` */
	unit?: string;
	/** CSS-переменные корня, которые выставляются по значению */
	cssVars: (value: number) => Record<string, string>;
}

export type SettingField = ChoiceField | ToggleField | SliderField;
export type SettingValue = string | boolean | number;

/** Определяет текущий тип устройства по медиавыражению ширины экрана (<= 719px — mobile, иначе desktop) */
export function getCurrentDevice(): SettingDevice {
	if (typeof window !== 'undefined') {
		if (typeof window.matchMedia === 'function') {
			return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ? 'mobile' : 'desktop';
		}
		if (typeof window.innerWidth === 'number') {
			return window.innerWidth <= MOBILE_BREAKPOINT ? 'mobile' : 'desktop';
		}
	}
	return 'desktop';
}

/** Проверяет, должно ли отображаться поле с учётом его зависимости `dependsOn` и ограничения по устройству `device` */
export function isFieldVisible(
	field: SettingField,
	values: Record<string, any> = {},
	allFields?: SettingField[],
	device?: SettingDevice
): boolean {
	if (field.device) {
		const currentDevice = device ?? getCurrentDevice();
		const matches = Array.isArray(field.device)
			? field.device.includes(currentDevice)
			: field.device === currentDevice;
		if (!matches) return false;
	}

	if (!field.dependsOn) return true;
	let current = values[field.dependsOn.key];
	if (current === undefined && allFields) {
		const target = allFields.find((f) => f.key === field.dependsOn?.key);
		if (target) current = target.default;
	}
	if (Array.isArray(field.dependsOn.value)) {
		return field.dependsOn.value.includes(current);
	}
	return current === field.dependsOn.value;
}

export interface ThemeColors {
	/** Фирменный цвет для светлого режима (например, цвет шапки) */
	light: string;
	/** Фирменный цвет для тёмного режима (например, цвет шапки) */
	dark: string;
}

export interface ThemeManifest {
	/** Совпадает с именем папки темы */
	id: string;
	name: string;
	/** Поддерживает ли тема тёмный режим */
	supportsDarkMode?: boolean;
	/** Жесты пальцем в мобильной раскладке: свайп лент и свайп «назад». Форк не наследует поле, включает сам */
	gestures?: boolean;
	description?: string;
	/**
	 * id темы-основы (форк). Недостающие компоненты, стили и настройки берутся у неё,
	 * так что исправления основы попадают в форк сами.
	 */
	extends?: string;
	/** Фирменные цвета темы в светлом и тёмном режимах */
	colors?: ThemeColors;
	/**
	 * Анимации темы (docs/architecture/motion.md), например `fluent` из `$lib/motion`. Не указаны —
	 * тема не анимирует ничего, кроме затемнения за окном. Форк не наследует поле: dtf2022 остаётся без анимаций.
	 */
	motion?: ThemeMotion;
	/** Настройки, которые тема показывает на своей вкладке в настройках */
	settings?: SettingField[];
}

/** Нужна только ради подсказок типов в theme.ts */
export function defineTheme(manifest: ThemeManifest): ThemeManifest {
	return manifest;
}
