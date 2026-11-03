/*
 * Ожидание готовности интерфейса: когда отрисован кадр и когда загрузились картинки окна.
 * Нужно, чтобы показывать окна и страницы целиком, а не по частям.
 */

let feedShown!: () => void;
const feedLoaded = new Promise<void>((done) => (feedShown = done));

/** Лента сообщает, что первая загрузка постов закончилась (успешно или ошибкой). Повторные вызовы ничего не меняют */
export const markFeedLoaded = () => feedShown();

/**
 * Дожидается, пока лента покажет посты и догрузятся картинки страницы. Заставка держится до этого момента,
 * чтобы под ней была готовая лента, а не спиннеры. Без сети ожидание не прерывается, прерывает его
 * кнопка «Пропустить» заставки (см. holdSplash).
 */
export const pageReady = () => feedLoaded.then(nextPaint).then(() => assetsReady(document.body));

/** Адреса из значения background-image: `url("a"), linear-gradient(…)` → ['a'] */
export function bgUrls(value: string): string[] {
	return [...value.matchAll(/url\((["']?)(.*?)\1\)/g)].map((match) => match[2]);
}

function loadImage(src: string) {
	return new Promise<void>((done) => {
		const img = new Image();
		img.onload = img.onerror = () => done();
		img.src = src;
	});
}

/**
 * Дожидается картинок (теги и фоны) и шрифтов внутри root. Битая картинка не держит окно:
 * ошибка считается завершением, а по истечении timeout ждать перестаём в любом случае.
 */
export async function assetsReady(root: HTMLElement, timeout = 4000) {
	const pending: Promise<unknown>[] = [document.fonts.ready];
	const backgrounds = new Set<string>();

	for (const img of root.querySelectorAll<HTMLImageElement>('img')) {
		// Ленивая картинка далеко внизу не загрузится, пока до неё не доскроллят: ждать её до таймаута незачем
		const far = img.loading === 'lazy' && img.getBoundingClientRect().top > innerHeight + 800;
		if (!img.complete && !far) pending.push(img.decode().catch(() => {}));
	}

	for (const el of [root, ...root.querySelectorAll<HTMLElement>('[style*="background"]')]) {
		if (el.style?.backgroundImage) {
			bgUrls(el.style.backgroundImage).forEach((url) => backgrounds.add(url));
		}
	}
	backgrounds.forEach((url) => pending.push(loadImage(url)));

	await Promise.race([Promise.all(pending), new Promise((done) => setTimeout(done, timeout))]);
}

/**
 * Промис, который выполняется после ближайшей отрисовки. Пока вкладка скрыта, кадры не рисуются,
 * поэтому страхуемся таймером: не ждём дольше 100 мс.
 */
export function nextPaint() {
	return new Promise<void>((done) => {
		const fallback = setTimeout(done, 100);
		requestAnimationFrame(() =>
			setTimeout(() => {
				clearTimeout(fallback);
				done();
			})
		);
	});
}
