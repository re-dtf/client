import { defineTheme } from '../types';

export default defineTheme({
	id: 'dtf2022',
	name: 'DTF 2022',
	description: 'Копия дизайна DTF начала 2023 года',
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
			description: 'С какой стороны стоят стрелки.',
			default: 'right',
			dependsOn: { key: 'votes', value: 'rating' },
			options: [
				{ value: 'right', title: 'Справа' },
				{ value: 'left', title: 'Слева' }
			]
		},
		{
			key: 'arrowsOrder',
			type: 'radio',
			title: 'Порядок стрелок',
			description: 'В каком порядке стоят стрелки.',
			default: 'down-up',
			dependsOn: { key: 'votes', value: 'rating' },
			options: [
				{ value: 'down-up', title: 'Вниз / вверх', description: 'Стрелка вниз слева, вверх — справа' },
				{ value: 'up-down', title: 'Вверх / вниз', description: 'Стрелка вверх слева, вниз — справа' }
			]
		}
	]
});
