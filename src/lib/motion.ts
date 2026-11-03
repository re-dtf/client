/*
 * Движение интерфейса. Тема описывает анимации данными (ThemeMotion в манифесте), ядро их проигрывает.
 * Тема без поля motion не анимирует ничего. Подробнее: docs/architecture/motion.md.
 */

/** Длительность в мс и кривая CSS */
export interface Timing {
	duration: number;
	easing: string;
}

/** Одна анимация: ключевые кадры Web Animations и время */
export interface Anim extends Timing {
	keyframes: Keyframe[];
	iterations?: number;
	direction?: PlaybackDirection;
}

/** Какие анимации есть у темы; чего нет, того не анимируем */
export interface ThemeMotion {
	/** Блок-заглушка загрузки заменяется содержимым: высота переезжает от заглушки к содержимому (см. Reveal) */
	grow?: Timing;
	/** Сколько мс заглушка загрузки тает поверх растущего блока */
	placeholderOut?: number;
	/** Окно (вход, настройки, редактор) готово и появляется */
	modalIn?: Anim;
	/** Окно закрывается: проигрывается на подложке вместе с окном */
	modalOut?: Anim;
	/** Содержимое экрана пришло: пост, комментарии */
	contentIn?: Anim;
	/** Пришёл список ленты */
	feedIn?: Anim;
	/** Картинка или видео в посте догрузились: проявляются поверх цветной заглушки, а не выскакивают */
	mediaIn?: Anim;
	/** Страницу закрыли: она остаётся на месте поверх слоя под ней и уходит, пока тот возвращается (`pageBack`) */
	pageOut?: Anim;
	/** Слой под закрытой страницей (лента или прежняя страница) возвращается на экран; без неё берётся `pageIn` */
	pageBack?: Anim;
	/** Страницу открыли или закрыли: слой, который встал наверх (страница или лента под ней), выходит на экран */
	pageIn?: Anim;

	/** Экран уходит вглубь при переходе на новую страницу (Recede) */
	recede?: Anim;
	/** Загрузка затянулась: старый экран плавно размывается (Hold) */
	wait?: Anim;
	/** Размытый экран мягко «дышит», пока ждём загрузку */
	breathe?: Anim;
	/** Старый экран окончательно растворяется и уходит, когда новый готов (Depart) */
	depart?: Anim;
	/** Новый экран приближается к зрителю (Approach) */
	approach?: Anim;
}

/** Поля ThemeMotion, которые являются анимациями (их проигрывает `play`) */
export type AnimKey =
	| 'modalIn'
	| 'modalOut'
	| 'contentIn'
	| 'feedIn'
	| 'mediaIn'
	| 'pageIn'
	| 'pageOut'
	| 'pageBack'
	| 'recede'
	| 'wait'
	| 'breathe'
	| 'depart'
	| 'approach';

/** Кривые: QuarticEase, Fluent и Material */
export const ease = {
	out: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
	inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
	decelerate: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
	accelerate: 'cubic-bezier(0.9, 0.1, 1, 0.2)',
	standard: 'cubic-bezier(0.8, 0, 0.2, 1)',
	emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
	emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
	smooth: 'cubic-bezier(0.2, 0, 0, 1)'
};

/** Готовый набор в духе Fluent: плавные «прилёты» с замедлением */
export const fluent: ThemeMotion = {
	modalIn: {
		keyframes: [
			{ opacity: 0, transform: 'scale(1.025)', filter: 'blur(4px)' },
			{ opacity: 1, transform: 'none', filter: 'blur(0px)' }
		],
		duration: 340,
		easing: ease.smooth
	},
	modalOut: {
		keyframes: [
			{ opacity: 1, transform: 'none', filter: 'blur(0px)' },
			{ opacity: 0, transform: 'scale(1.025)', filter: 'blur(4px)' }
		],
		duration: 240,
		easing: ease.smooth
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
	},
	recede: {
		keyframes: [
			{ transform: 'none', opacity: 1 },
			{ transform: 'scale(0.94)', opacity: 0.6 }
		],
		duration: 350,
		easing: ease.out
	},
	wait: {
		keyframes: [
			{ transform: 'scale(0.9)', opacity: 0.5, filter: 'blur(18px) saturate(1.2)' }
		],
		duration: 1200,
		easing: ease.emphasizedDecelerate
	},
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
	depart: {
		keyframes: [
			{ opacity: 0 }
		],
		duration: 280,
		easing: ease.out
	},
	approach: {
		keyframes: [
			{ transform: 'scale(0.94)', opacity: 0 },
			{ transform: 'scale(0.95)', opacity: 1, offset: 0.15 },
			{ transform: 'none', opacity: 1 }
		],
		duration: 500,
		easing: ease.out
	}
};

/**
 * Затемнение за окном: отклик на нажатие, поэтому играет у всех тем, а не только у тех, что задали motion.
 * Первый кадр — начальный, пустой последний берёт обычный стиль подложки. Один кадр стал бы конечным,
 * и подложка гасла бы до прозрачной, а потом снова темнела.
 */
export const backdropIn: Anim = {
	keyframes: [{ backgroundColor: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' }, {}],
	duration: 280,
	easing: ease.smooth
};

/**
 * Плавное растворение затемнения при закрытии окна в унисон с уходом самого окна.
 */
export const backdropOut: Anim = {
	keyframes: [{}, { backgroundColor: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' }],
	duration: 240,
	easing: ease.smooth
};

export const reducedMotion = () =>
	typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

/** Поведение программной прокрутки: плавная, если пользователь не просил уменьшить движение */
export const scrollBehavior = (): ScrollBehavior => (reducedMotion() ? 'auto' : 'smooth');

/**
 * Плавно изменить высоту блока с `from` до нынешней. Растёт не дальше `from` + экран: остальное ниже сгиба,
 * его не видно, а длинную ленту иначе пришлось бы «разворачивать» на десятки тысяч пикселей.
 */
export function grow(el: HTMLElement, from: number, timing?: Timing) {
	if (!timing || reducedMotion()) return;
	const to = Math.min(el.offsetHeight, from + innerHeight);
	if (Math.abs(to - from) < 2) return;
	el.style.overflow = 'clip';
	const animation = el.animate({ height: [`${from}px`, `${to}px`] }, { ...timing });
	animation.onfinish = animation.oncancel = () => el.style.removeProperty('overflow');
}

/**
 * Проиграть анимацию на элементе. Без анимации или при «уменьшить движение» в системе не делает ничего.
 * fill: 'forwards' для ухода, чтобы элемент не мелькнул прежним видом перед удалением.
 */
export function play(el: Element, anim?: Anim, fill: FillMode = 'none') {
	if (!anim || reducedMotion()) return;
	return el.animate(anim.keyframes, {
		duration: anim.duration,
		easing: anim.easing,
		fill,
		iterations: anim.iterations ?? 1,
		direction: anim.direction ?? 'normal'
	});
}

/**
 * Проиграть анимацию на детях элемента. Если у ребёнка `display: contents`,
 * анимируются его непосредственные потомки (обёртка `display: contents` не имеет геометрии).
 */
export function playChildren(parent: Element, anim?: Anim, fill: FillMode = 'none') {
	if (!anim || reducedMotion()) return;
	const isContents = (el: Element) =>
		typeof getComputedStyle === 'function' && getComputedStyle(el).display === 'contents';

	for (const child of parent.children) {
		const targets = isContents(child) ? Array.from(child.children) : [child];
		for (const el of targets) {
			if (isContents(el)) {
				playChildren(el, anim, fill);
			} else {
				play(el, anim, fill);
			}
		}
	}
}
