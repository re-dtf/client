/*
 * Заставка из app.html: логотип и размытая подложка. Здесь только управление ею, оформление лежит в app.html.
 * Подробнее: docs/architecture/splash.md.
 */

/** Сколько заставка показывается от начала загрузки страницы: за это время логотип успевает появиться */
const MIN_SHOW = 1300;

const splash = () => document.getElementById('splash');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Через столько от начала загрузки страницы заставка предлагает не ждать */
const HINT_AFTER = 7500;

/** Минимальное время показа прошло */
export const introDone = () => wait(MIN_SHOW - performance.now());

/**
 * Держит заставку, пока не выполнится ready. Если загрузка затянулась, показывает подсказку
 * с кнопкой «Пропустить»: она отпускает заставку, не дожидаясь ready.
 */
export async function holdSplash(ready: Promise<unknown>) {
	const hint = splash()?.querySelector<HTMLElement>('.splash-hint');
	if (!hint) return ready;
	const timer = setTimeout(() => hint.setAttribute('data-show', ''), HINT_AFTER - performance.now());
	const skipped = new Promise((resolve) => hint.querySelector('button')?.addEventListener('click', resolve, { once: true }));
	await Promise.race([ready, skipped]);
	clearTimeout(timer);
	hint.removeAttribute('data-show');
}

/**
 * Дождаться, пока точки логотипа закончат очередной цикл парения: двигать логотип посреди движения нельзя,
 * он дёрнется. Без анимации (уменьшить движение) ждать нечего.
 */
export function dotsAtRest(): Promise<void> {
	const dot = splash()?.querySelector('.dot');
	if (!dot || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
	return new Promise((resolve) => {
		const done = () => {
			clearTimeout(timer);
			dot.removeEventListener('animationiteration', done);
			resolve();
		};
		const timer = setTimeout(done, 1800);
		dot.addEventListener('animationiteration', done);
	});
}

/** Перевести заставку в приветствие: логотип уезжает наверх, фон размывается */
export const showWelcomeBackdrop = () => splash()?.setAttribute('data-state', 'welcome');

/** Убрать заставку: растворить и удалить из DOM */
export async function hideSplash() {
	splash()?.setAttribute('data-leaving', '');
	await wait(700);
	splash()?.remove();
}
