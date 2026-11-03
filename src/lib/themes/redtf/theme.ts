import { ease, fluent, type ThemeMotion } from '$lib/motion';
import { defineTheme } from '../types';

// Содержимое «материализуется» из размытия, как приветствие. Размытие только у страниц: на длинной ленте слой слишком велик.
// Страницы прикреплены к шапке и не сдвигаются
const motion: ThemeMotion = {
	...fluent,
	grow: { duration: 600, easing: ease.out },
	placeholderOut: 220,
	// Страница не смещается и не масштабируется (на краях картинок проступают полосы фона): проявляется на месте из размытия
	contentIn: {
		keyframes: [{ opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)' }],
		duration: 750,
		easing: ease.out
	},
	// Только прозрачность: слой (лента или страница) выходит на экран целиком, на длинной ленте не нужно ни размытия, ни сдвига
	pageIn: { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 450, easing: ease.out },
	// Уходящая страница чуть приближается, размывается и растворяется; слой под ней подплывает снизу.
	// Сдвиг только по вертикали и без масштаба: у длинной ленты центр масштаба был бы далеко от экрана
	pageOut: {
		keyframes: [
			{ opacity: 1, transform: 'none', filter: 'blur(0px)' },
			{ opacity: 0, transform: 'scale(1.06)', filter: 'blur(12px)' }
		],
		duration: 420,
		easing: ease.standard
	},
	pageBack: { keyframes: [{ opacity: 0, transform: 'translateY(36px)' }, { opacity: 1, transform: 'none' }], duration: 560, easing: ease.out },
	// Картинка или видео в посте догрузились: обратное растворение из размытия, как pageOut наоборот
	mediaIn: {
		keyframes: [
			{ opacity: 0, filter: 'blur(12px)', transform: 'scale(1.04)' },
			{ opacity: 1, filter: 'blur(0px)', transform: 'none' }
		],
		duration: 460,
		easing: ease.out
	},
	feedIn: { keyframes: [{ opacity: 0, transform: 'translateY(32px) scale(0.99)' }, { opacity: 1, transform: 'none' }], duration: 650, easing: ease.out },

	// Универсальный переход между страницами:
	// 1. Старый экран уходит вглубь
	recede: {
		keyframes: [
			{ transform: 'none', opacity: 1 },
			{ transform: 'scale(0.94)', opacity: 0.6 }
		],
		duration: 350,
		easing: ease.out
	},
	// 2. Если загрузка затянулась: размытие и легкое отдаление
	wait: {
		keyframes: [
			{ transform: 'scale(0.9)', opacity: 0.5, filter: 'blur(18px) saturate(1.2)' }
		],
		duration: 1200,
		easing: ease.emphasizedDecelerate
	},
	// 3. Живое «дыхание» размытого экрана
	breathe: {
		keyframes: [
			{ transform: 'scale(0.9)', opacity: 0.5 },
			{ transform: 'scale(0.915)', opacity: 0.42 }
		],
		duration: 2400,
		easing: 'ease-in-out',
		iterations: Infinity,
		direction: 'alternate'
	},
	// 4. Старый экран на заднем плане спокойно тает
	depart: {
		keyframes: [
			{ opacity: 0 }
		],
		duration: 280,
		easing: ease.out
	},
	// 5. Новый экран приближается к зрителю
	approach: {
		keyframes: [
			{ transform: 'scale(0.94)', opacity: 0 },
			{ transform: 'scale(0.95)', opacity: 1, offset: 0.15 },
			{ transform: 'none', opacity: 1 }
		],
		duration: 500,
		easing: ease.out
	},
	// 6. Раскрытие прямоугольника из карточки в экран
	container: {
		duration: 500,
		easing: ease.out
	}
};

export default defineTheme({
	// Форк
	extends: 'dtf2022',

	id: 'redtf',
	name: 'Re:DTF',
	description: 'Основная тема. Вдохновлена DTF 2023-24 года, но лучше, и с кастомизацией.',
	settings: [
		{
			key: 'votes',
			type: 'radio',
			title: 'Оценки',
			description: 'Как выглядят оценки постов и комментариев.',
			default: 'likes',
			options: [
				{ value: 'rating', title: 'Стрелки · осень 2022', description: 'Рейтинг со стрелками вверх и вниз у постов и комментариев' },
				{ value: 'likes', title: 'Лайки · начало 2023', description: 'Лайк и дизлайк, как в ленте весной 2023' },
				{ value: 'reactions', title: 'Реакции · как сейчас', description: 'Набор реакций, как на сайте сегодня' }
			]
		},
		{
			key: 'arrowsSide',
			type: 'radio',
			title: 'Стрелки оценки',
			description: 'С какой стороны стоят стрелки. Действует только на «Стрелки · осень 2022».',
			default: 'right',
			options: [
				{ value: 'right', title: 'Справа' },
				{ value: 'left', title: 'Слева' }
			]
		},
		{
			key: 'arrowsOrder',
			type: 'radio',
			title: 'Порядок стрелок',
			description: 'В каком порядке стоят стрелки. Действует только на «Стрелки · осень 2022».',
			default: 'down-up',
			options: [
				{ value: 'down-up', title: 'Вниз / вверх', description: 'Стрелка вниз слева, вверх — справа' },
				{ value: 'up-down', title: 'Вверх / вниз', description: 'Стрелка вверх слева, вниз — справа' }
			]
		},
		{
			key: 'editorFullscreen',
			type: 'toggle',
			title: 'Редактор на весь экран',
			description: 'Выключено — редактор открывается окном. Переключается и кнопкой в самом редакторе.',
			default: true
		},
		{
			key: 'contentWidth',
			type: 'slider',
			title: 'Ширина контента',
			description: 'Ширина ленты, поста, профиля и комментариев на широких экранах.',
			steps: [640, 680, 720, 740, 820, 940],
			default: 640,
			unit: 'px',
			// Колонка текста у́же самой ленты на 40px (как у DTF: 600 при 640)
			cssVars: (width) => ({ '--content-width': `${width}px`, '--inner-content-width': `${width - 40}px` })
		}
	],
	motion,
});
