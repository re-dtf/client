/*
 * Движение интерфейса. Тема описывает анимации данными (ThemeMotion в манифесте), ядро их проигрывает.
 * Тема без поля motion не анимирует ничего. Подробнее: docs/architecture/motion.md.
 */

/** Одна анимация: ключевые кадры Web Animations, длительность в мс и кривая CSS */
export interface Anim {
	keyframes: Keyframe[];
	duration: number;
	easing: string;
}

/** Какие анимации есть у темы; чего нет, того не анимируем */
export interface ThemeMotion {
	/** Окно (вход, настройки, редактор) готово и появляется */
	modalIn?: Anim;
	/** Окно закрывается: проигрывается на подложке вместе с окном */
	modalOut?: Anim;
	/** Содержимое экрана пришло: пост, комментарии */
	contentIn?: Anim;
	/** Пришёл список ленты */
	feedIn?: Anim;
}

/** Кривые: QuarticEase и Fluent */
export const ease = {
	out: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
	inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
	decelerate: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
	accelerate: 'cubic-bezier(0.9, 0.1, 1, 0.2)',
	standard: 'cubic-bezier(0.8, 0, 0.2, 1)'
};

/** Готовый набор в духе Fluent: плавные «прилёты» с замедлением */
export const fluent: ThemeMotion = {
	// Fluent-кривая decelerate тратит почти всё движение в первую четверть времени и выглядит как рывок,
	// поэтому появление идёт по QuarticEase Out: она дольше «досматривается»
	modalIn: {
		keyframes: [{ opacity: 0, transform: 'translateY(48px) scale(0.94)' }, { opacity: 1, transform: 'none' }],
		duration: 450,
		easing: ease.out
	},
	modalOut: {
		keyframes: [{ opacity: 1 }, { opacity: 0 }],
		duration: 200,
		easing: ease.accelerate
	},
	contentIn: {
		keyframes: [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }],
		duration: 520,
		easing: ease.out
	},
	feedIn: {
		keyframes: [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }],
		duration: 480,
		easing: ease.out
	}
};

/**
 * Затемнение за окном: отклик на нажатие, поэтому играет у всех тем, а не только у тех, что задали motion.
 * Первый кадр — начальный, пустой последний берёт обычный стиль подложки. Один кадр стал бы конечным,
 * и подложка гасла бы до прозрачной, а потом снова темнела.
 */
export const backdropIn: Anim = {
	keyframes: [{ backgroundColor: 'transparent', backdropFilter: 'none' }, {}],
	duration: 200,
	easing: ease.out
};

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Поведение программной прокрутки: плавная, если пользователь не просил уменьшить движение */
export const scrollBehavior = (): ScrollBehavior => (reducedMotion() ? 'auto' : 'smooth');

/**
 * Проиграть анимацию на элементе. Без анимации или при «уменьшить движение» в системе не делает ничего.
 * fill: 'forwards' для ухода, чтобы элемент не мелькнул прежним видом перед удалением.
 */
export function play(el: Element, anim?: Anim, fill: FillMode = 'none') {
	if (!anim || reducedMotion()) return;
	el.animate(anim.keyframes, { duration: anim.duration, easing: anim.easing, fill });
}
