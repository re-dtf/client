/*
 * Размеры медиа, как считал DTF (по архиву dtf.ru, март 2023):
 * - лента и встроенные посты: высота до 460px;
 * - страница поста: горизонтальные — на всю ширину страницы без ограничения высоты,
 *   квадратные и вертикальные — в колонке текста, высота до 460px;
 * - комментарии: высота до 300px.
 * Картинка никогда не растягивается шире своей натуральной ширины.
 */

export const FEED_MEDIA_MAX_HEIGHT = 460;
export const COMMENT_MEDIA_MAX_HEIGHT = 300;

export function mediaMaxWidth(width: number, height: number, maxHeight = Infinity): number {
	if (!width || !height) return width || 0;
	return Math.round(Math.min(width, (maxHeight * width) / height));
}

/** На странице поста горизонтальное медиа идёт на всю ширину, остальное — в колонке текста */
export function isWideMedia(width: number, height: number): boolean {
	return !height || width > height;
}
