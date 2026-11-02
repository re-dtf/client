import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { parseDtfUrl } from './dtfLinks';
import { feed, feedPath } from './feed.svelte';

/*
 * Навигация внутри приложения. Посты, профили, настройки, вход и редактор открываются
 * поверх ленты «оверлеями»: адрес меняется, а лента остаётся под ними и не теряет прокрутку.
 * Стек оверлеев лежит в page.state.overlays (тип — App.OverlayState в app.d.ts),
 * а рисует его src/routes/+layout.svelte.
 *
 * Всё открывается и закрывается через функции этого файла. Ссылки на оверлеи остаются
 * обычными <a href>, а клик с Ctrl/Cmd/Shift и средней кнопкой открывает их в новой вкладке.
 */

const PRESENTATION: Record<App.OverlayData['type'], App.OverlayState['presentation']> = {
	post: 'page',
	profile: 'page',
	settings: 'modal',
	notifications: 'page',
	login: 'modal',
	editor: 'modal'
};

export function getPostPath(post: { id: number; sourceId: string }, commentId?: number) {
	if (post.sourceId !== 'dtf') return `/post/${post.id}?source=${post.sourceId}`;
	return commentId ? `/post/${post.id}?comment=${commentId}` : `/post/${post.id}`;
}

export function getProfilePath(id: number) {
	return `/u/${id}`;
}

function overlayPath(overlay: App.OverlayData): string {
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
	return goto(resolve(overlayPath(overlay) as '/'), {
		shallow: true,
		state: { overlays: [...(page.state.overlays ?? []), opened] }
	});
}

/** Закрыть верхний оверлей: возвращаемся на шаг назад по истории, как кнопка «Назад» */
export function closeOverlay() {
	history.back();
}

/** Ctrl/Cmd/Shift/средняя кнопка: пусть браузер сам откроет ссылку в новой вкладке */
function isNewTabClick(e: MouseEvent) {
	return e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0;
}

/** Обработчик клика по ссылке: открывает оверлей, если это обычный клик */
function openFromLink(e: MouseEvent, overlay: App.OverlayData) {
	if (isNewTabClick(e)) return;
	e.preventDefault();
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
		window.scrollTo({ top: 0, behavior: 'smooth' });
		feed.refresh();
	}
}
