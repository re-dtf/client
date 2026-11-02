import type { ThemeMotion } from '$lib/motion';

/** Описание темы. Лежит в `<тема>/theme.ts`, реестр находит его сам (см. registry.ts). */

interface FieldBase {
	/** Ключ в сохранённых настройках темы */
	key: string;
	title: string;
	description?: string;
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

export type SettingField = ChoiceField | ToggleField;
export type SettingValue = string | boolean;

export interface ThemeManifest {
	/** Совпадает с именем папки темы */
	id: string;
	name: string;
	description?: string;
	/**
	 * id темы-основы (форк). Недостающие компоненты, стили и настройки берутся у неё,
	 * так что исправления основы попадают в форк сами.
	 */
	extends?: string;
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
