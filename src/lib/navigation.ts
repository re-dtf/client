import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { parseDtfUrl } from './dtfLinks';
import { feed, feedPath } from './feed.svelte';
import { scrollBehavior } from './motion';
import { markOrigin } from './pageTransition.svelte';

/*
 * Навигация внутри приложения. Посты, профили, настройки, вход и редактор открываются
 * поверх ленты «оверлеями»: адрес меняется, а лента остаётся под ними и не теряет прокрутку.
 * Стек оверлеев лежит в page.state.overlays (тип — App.OverlayState в app.d.ts),
 * а рисует его src/routes/+layout.svelte.
 *
 * Всё открывается и закрывается через функции этого файла. Ссылки на оверлеи остаются
 * обычными <a href>, а клик с Ctrl/Cmd/Shift и средней кнопкой открывает их в новой вкладке.
 *
 * TODO: Предзагрузка на pointerdown — начинать api.getPost/getProfile по нажатию пальца/мыши за 100-200 мс до клика
 */

const PRESENTATION: Record<App.OverlayData['type'], App.OverlayState['presentation']> = {
	post: 'page',
	profile: 'page',
	settings: 'modal',
	notifications: 'page',
	login: 'modal',
	editor: 'modal',
	lightbox: 'fullscreen'
};

export function getPostPath(post: { id: number; sourceId: string }, commentId?: number) {
	if (post.sourceId !== 'dtf') return `/post/${post.id}?source=${post.sourceId}`;
	return commentId ? `/post/${post.id}?comment=${commentId}` : `/post/${post.id}`;
}

export function getProfilePath(id: number) {
	return `/u/${id}`;
}

function overlayPath(overlay: Exclude<App.OverlayData, { type: 'lightbox' }>): string {
	switch (overlay.type) {
		case 'post':
			return getPostPath({ id: overlay.data.postId, sourceId: overlay.data.sourceId }, overlay.data.commentId);
		case 'profile':
			return getProfilePath(overlay.data.profileId);
		case 'settings':
			return '/settings';
		case 'notifications':
			return '/notifications';
		case 'login':
			return '/login';
		case 'editor':
			return '/write';
	}
}

let overlayCounter = 0;

/** Открыть оверлей поверх текущего экрана */
export function openOverlay(overlay: App.OverlayData) {
	const opened: App.OverlayState = { ...overlay, id: `${overlay.type}-${overlayCounter++}`, presentation: PRESENTATION[overlay.type] };
	// Просмотр картинок остаётся на текущем адресе: это шаг истории для кнопки «Назад», а не страница.
	// page.url тут не годится: под оверлеями он остаётся адресом нижней страницы, а не поста
	const url = overlay.type === 'lightbox' ? location.href : resolve(overlayPath(overlay) as '/');
	return goto(url, {
		shallow: true,
		state: { overlays: [...(page.state.overlays ?? []), opened] }
	});
}

// Картинка, из которой раскрываем просмотр: в историю её не положить, поэтому передаём через модуль
let lightboxOrigin: HTMLImageElement | undefined;
let lightboxOpening = false;
let pswpPromise: Promise<[typeof import('photoswipe'), unknown]> | undefined;

/** Загрузить PhotoSwipe и стили заранее, чтобы при клике просмотр открывался сразу */
export function preloadLightbox() {
	if (typeof window === 'undefined') return;
	return (pswpPromise ??= Promise.all([import('photoswipe'), import('photoswipe/style.css')]));
}

/** Открыть просмотр картинок; origin — миниатюра, из которой разворачиваем (и в которую сворачиваем) кадр с номером index */
export function openLightbox(images: { uuid: string; width: number; height: number }[], index: number, origin?: HTMLImageElement) {
	if (lightboxOpening || page.state.overlays?.some((o) => o.type === 'lightbox')) return;
	lightboxOpening = true;
	lightboxOrigin = origin;
	return openOverlay({
		type: 'lightbox',
		data: { images: images.map(({ uuid, width, height }) => ({ uuid, width, height })), index }
	}).finally(() => {
		lightboxOpening = false;
	});
}

/** Миниатюра для анимации, которую запомнил openLightbox; после чтения забывается */
export function takeLightboxOrigin() {
	const origin = lightboxOrigin;
	lightboxOrigin = undefined;
	return origin?.isConnected ? origin : undefined;
}

/** Закрыть верхний оверлей: возвращаемся на шаг назад по истории, как кнопка «Назад» */
export function closeOverlay() {
	history.back();
}

/** Ctrl/Cmd/Shift/средняя кнопка: пусть браузер сам откроет ссылку в новой вкладке */
export function isNewTabClick(e: MouseEvent) {
	return e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0;
}

/** Обработчик клика по ссылке: открывает оверлей, если это обычный клик */
function openFromLink(e: MouseEvent, overlay: App.OverlayData) {
	if (isNewTabClick(e)) return;
	e.preventDefault();
	markOrigin(e);
	openOverlay(overlay);
}

/** Открыть пост поверх ленты (лента сохраняет прокрутку) */
export function openPost(e: MouseEvent, post: { id: number; sourceId: string }) {
	openFromLink(e, { type: 'post', data: { postId: post.id, sourceId: post.sourceId } });
}

/** Открыть страницу уведомлений */
export function openNotifications(e: MouseEvent) {
	openFromLink(e, { type: 'notifications' });
}

/** Открыть профиль пользователя или подсайта поверх текущего экрана */
export function openProfile(e: MouseEvent, id: number) {
	openFromLink(e, { type: 'profile', data: { profileId: id } });
}

/**
 * Клик по ссылке на dtf.ru: пост и профиль открываем у себя, остальное оставляем браузеру.
 * Возвращает true, если открыли у себя.
 */
export function openDtfLink(e: MouseEvent, href: string): boolean {
	const target = parseDtfUrl(href);
	if (!target || isNewTabClick(e)) return false;

	e.preventDefault();
	markOrigin(e);
	if (target.type === 'post') openOverlay({ type: 'post', data: { postId: target.postId, sourceId: 'dtf', commentId: target.commentId } });
	else openOverlay({ type: 'profile', data: { profileId: target.profileId } });
	return true;
}

/**
 * Клик по логотипу или «Главной». Над лентой открыты оверлеи — закрыть их все.
 * Уже на ленте — наверх и обновить. Из другого места ссылка работает как обычно.
 */
export function openFeed(e: MouseEvent) {
	if (page.state.overlays?.length) {
		e.preventDefault();
		const feedUrl = resolve(feedPath(feed.current) as '/');
		if (page.route.id === '/') {
			goto(feedUrl, { shallow: true, state: { overlays: [] } });
		} else {
			// Страницу открыли по прямой ссылке (например /post/1), под оверлеями ленты нет
			goto(feedUrl);
		}
		return;
	}

	if (page.route.id === '/') {
		e.preventDefault();
		window.scrollTo({ top: 0, behavior: scrollBehavior() });
		feed.refresh();
	}
}
