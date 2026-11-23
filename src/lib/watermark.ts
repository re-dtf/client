/**
 * Невидимая сигнатура reDTF на символах нулевой ширины, которая позволяет определять пользователей клиента без лишних запросов.
 *
 * Последовательность:
 * WJ (\u2060, Word Joiner) +
 * ZWJ (\u200D, Zero-Width Joiner) +
 * ZWNJ (\u200C, Zero-Width Non-Joiner) +
 * ZWJ (\u200D, Zero-Width Joiner) +
 * WJ (\u2060, Word Joiner)
 *
 * Сигнатура:
 * Невидима на любых экранах и устройствах.
 * Не встречается в обычных условиях.
 * Не вырезается бэкендом DTF (по крайней мере сейчас).
 * Находясь в конце текста, не нарушает перенос строк и поиск по словам.
 */
export const REDTF_WATERMARK = '\u2060\u200D\u200C\u200D\u2060';

/** Марка вместе с пробелом перед ней (его ставит `addWatermark`, при чтении убирается вместе с маркой) */
const WATERMARK_PATTERN = new RegExp(` ?${REDTF_WATERMARK}`, 'g');

/**
 * Добавляет марку в самый конец текста.
 * Если марка уже присутствовала в тексте (например, после частичного редактирования на сайте DTF),
 * она удаляется из середины и перемещается строго в конец.
 * От текста марка отделена пробелом: иначе, если комментарий кончается ссылкой, DTF втягивает невидимые
 * символы в адрес, и ссылка ведёт на 404.
 */
export function addWatermark(text: string): string {
	if (!text) return text;
	const stripped = text.replace(WATERMARK_PATTERN, '');
	return `${stripped.trimEnd()} ${REDTF_WATERMARK}`;
}

/**
 * Проверяет наличие марки и возвращает очищенный текст.
 */
export function extractWatermark(text: string): { text: string; isRedtf: boolean } {
	if (!text || !text.includes(REDTF_WATERMARK)) {
		return { text: text ?? '', isRedtf: false };
	}
	return {
		text: text.replace(WATERMARK_PATTERN, ''),
		isRedtf: true
	};
}
