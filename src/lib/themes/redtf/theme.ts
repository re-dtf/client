import { fluent } from '$lib/motion';
import { defineTheme } from '../types';

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
			description: 'Ширина ленты, поста и комментариев на широких экранах.',
			steps: [640, 680, 720, 740, 820, 940],
			default: 640,
			unit: 'px',
			// Колонка текста у́же самой ленты на 40px (как у DTF: 600 при 640)
			cssVars: (width) => ({ '--content-width': `${width}px`, '--inner-content-width': `${width - 40}px` })
		}
	],
	motion: fluent,
});
