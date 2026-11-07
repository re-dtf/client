import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { parseDtfUrl, dtfTargetToPath } from './dtfLinks';
import { feed, feedPath } from './feed.svelte';
import { scrollBehavior } from './motion';
import { markOrigin } from './pageTransition.svelte';
import { cachePost } from './postCache';
import type { Post } from '$lib/api/types';

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

export function getPostPath(post: { id: number; sourceId: string }, target?: number | 'comments') {
	const hash = target === 'comments' ? '#comments' : '';
	const commentId = typeof target === 'number' ? target : undefined;
	if (post.sourceId !== 'dtf') {
		const query = commentId ? `?source=${post.sourceId}&comment=${commentId}` : `?source=${post.sourceId}`;
		return `/post/${post.id}${query}${hash}`;
	}
	return commentId ? `/post/${post.id}?comment=${commentId}` : `/post/${post.id}${hash}`;
}

export function getProfilePath(id: number) {
	return `/u/${id}`;
}

export function getSettingsPath(page?: string, section?: string): string {
	const params = new URLSearchParams();
	if (page) params.set('page', page);
	if (section) params.set('section', section);
	const qs = params.toString();
	return qs ? `/settings?${qs}` : '/settings';
}

function overlayPath(overlay: Exclude<App.OverlayData, { type: 'lightbox' }>): string {
	switch (overlay.type) {
		case 'post':
			return getPostPath(
				{ id: overlay.data.postId, sourceId: overlay.data.sourceId },
				overlay.data.commentId ?? (overlay.data.toComments ? 'comments' : undefined)
			);
		case 'profile':
			return getProfilePath(overlay.data.profileId);
		case 'settings':
			return getSettingsPath(overlay.data?.page, overlay.data?.section);
		case 'notifications':
			return '/notifications';
		case 'login':
			return '/login';
		case 'editor':
			return '/write';
	}
}

function nextOverlayId(type: string): string {
	return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function findActivePostIndex(postId: number, sourceId: string, overlays: App.OverlayState[]): number {
	const topPageIndex = overlays.findLastIndex((o) => o.presentation === 'page');
	if (topPageIndex < 0) return -1;
	const top = overlays[topPageIndex];
	if (top.type === 'post' && top.data.postId === postId && (top.data.sourceId ?? 'dtf') === sourceId) {
		return topPageIndex;
	}
	if (top.type === 'notifications' && topPageIndex > 0) {
		const under = overlays[topPageIndex - 1];
		if (under.type === 'post' && under.data.postId === postId && (under.data.sourceId ?? 'dtf') === sourceId) {
			return topPageIndex - 1;
		}
	}
	return -1;
}

/** Открыть оверлей поверх текущего экрана */
export function openOverlay(overlay: App.OverlayData) {
	if (overlay.type === 'post') {
		const currentOverlays = page.state.overlays ?? [];
		const sourceId = overlay.data.sourceId ?? 'dtf';
		const activePostIndex = findActivePostIndex(overlay.data.postId, sourceId, currentOverlays);

		if (activePostIndex >= 0 && currentOverlays[activePostIndex].type === 'post') {
			const existing = currentOverlays[activePostIndex] as Extract<App.OverlayState, { type: 'post' }>;
			const updated: App.OverlayState = {
				...existing,
				data: {
					...existing.data,
					commentId: overlay.data.commentId,
					toComments: overlay.data.toComments,
					focusNonce: Date.now()
				}
			};
			const nextOverlays = [...currentOverlays.slice(0, activePostIndex), updated];
			const url = resolve(overlayPath(updated) as '/');
			return goto(url, {
				shallow: true,
				replace: true,
				state: { overlays: nextOverlays }
			});
		}

		if (
			currentOverlays.length === 0 &&
			page.route.id === '/post/[id]' &&
			Number(page.params.id) === overlay.data.postId &&
			(page.url.searchParams.get('source') || 'dtf') === sourceId
		) {
			const url = resolve(
				getPostPath(
					{ id: overlay.data.postId, sourceId },
					overlay.data.commentId ?? (overlay.data.toComments ? 'comments' : undefined)
				) as '/'
			);
			return goto(url, {
				shallow: true,
				replace: true,
				state: page.state
			});
		}
	}

	const opened: App.OverlayState = { ...overlay, id: nextOverlayId(overlay.type), presentation: PRESENTATION[overlay.type] };
	// Просмотр картинок остаётся на текущем адресе: это шаг истории для кнопки «Назад», а не страница.
	// page.url тут не годится: под оверлеями он остаётся адресом нижней страницы, а не поста
	const url = overlay.type === 'lightbox' ? location.href : resolve(overlayPath(overlay) as '/');
	const currentOverlays = page.state.overlays ?? [];
	const MAX_OVERLAYS = 20;
	// При превышении лимита отбрасываем самый старый оверлей, сохраняя последние 20 слоёв
	const nextOverlays =
		currentOverlays.length >= MAX_OVERLAYS
			? [...currentOverlays.slice(currentOverlays.length - (MAX_OVERLAYS - 1)), opened]
			: [...currentOverlays, opened];
	return goto(url, {
		shallow: true,
		state: { overlays: nextOverlays }
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
export function openLightbox(images: { uuid: string; width: number; height: number; type?: string }[], index: number, origin?: HTMLImageElement) {
	if (lightboxOpening || page.state.overlays?.some((o) => o.type === 'lightbox')) return;
	lightboxOpening = true;
	lightboxOrigin = origin;
	return openOverlay({
		type: 'lightbox',
		data: { images: images.map(({ uuid, width, height, type }) => ({ uuid, width, height, type })), index }
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

interface SubstateEntry {
	overlayId: string;
	onBack: () => void;
}

const substateStack: SubstateEntry[] = [];
let popstateListening = false;

function getCurrentTopOverlay(): App.OverlayState | undefined {
	try {
		const currentOverlays = page.state.overlays ?? [];
		return currentOverlays[currentOverlays.length - 1];
	} catch {
		return undefined;
	}
}

function initPopstateListener() {
	if (popstateListening || typeof window === 'undefined') return;
	popstateListening = true;
	window.addEventListener('popstate', () => {
		if (substateStack.length === 0) return;
		const currentTop = getCurrentTopOverlay();
		const topEntry = substateStack[substateStack.length - 1];

		if (topEntry && topEntry.overlayId === (currentTop?.id ?? '')) {
			substateStack.pop();
			topEntry.onBack();
		} else if (topEntry && (!currentTop || topEntry.overlayId !== currentTop.id)) {
			// Оверлей закрылся или сменился снаружи — сбрасываем устаревшие шаги
			substateStack.length = 0;
		}
	});
}

/**
 * Зарегистрировать вложенный шаг навигации внутри текущего оверлея (раздел на мобильном, solo mode, шаг входа).
 * При системном жесте «Назад» или кнопке браузера вызовется onBack вместо закрытия оверлея.
 */
export function pushSubstate(onBack: () => void) {
	if (typeof window === 'undefined') return;
	initPopstateListener();
	const currentTop = getCurrentTopOverlay();
	const overlayId = currentTop?.id ?? '';
	substateStack.push({ overlayId, onBack });
	let currentState: App.PageState = {};
	try {
		currentState = page.state;
	} catch {}
	return goto(window.location.href, {
		shallow: true,
		reset: false,
		state: currentState
	});
}

/**
 * Очистить стек вложенных шагов без выполнения переходов в истории.
 */
export function clearSubstates() {
	substateStack.length = 0;
}

/**
 * Закрыть текущий вложенный шаг (для экранных кнопок возврата «Назад»).
 * Возвращает true, если был активный вложенный шаг (и запущен шаг назад по истории).
 */
export function popSubstate(): boolean {
	if (typeof window === 'undefined') return false;
	const currentTop = getCurrentTopOverlay();
	const topEntry = substateStack[substateStack.length - 1];
	if (topEntry && topEntry.overlayId === (currentTop?.id ?? '')) {
		history.back();
		return true;
	}
	return false;
}

/**
 * Сбросить все вложенные шаги текущего оверлея в истории браузера (например, при программном возврате к началу).
 */
export function resetSubstates() {
	if (typeof window === 'undefined') return;
	const currentTop = getCurrentTopOverlay();
	const overlayId = currentTop?.id ?? '';
	let depth = 0;
	while (substateStack.length > 0 && substateStack[substateStack.length - 1].overlayId === overlayId) {
		substateStack.pop();
		depth++;
	}
	if (depth > 0) {
		history.go(-depth);
	}
}

/**
 * Закрыть верхний оверлей: если внутри оверлея были вложенные шаги,
 * закрывает оверлей целиком за один переход, возвращаясь на экран под ним.
 */
export function closeOverlay() {
	if (typeof window === 'undefined') return;
	const currentTop = getCurrentTopOverlay();
	const overlayId = currentTop?.id ?? '';
	let depth = 0;
	while (substateStack.length > 0 && substateStack[substateStack.length - 1].overlayId === overlayId) {
		substateStack.pop();
		depth++;
	}
	if (depth > 0) {
		history.go(-(depth + 1));
	} else {
		history.back();
	}
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
export function openPost(
	e: MouseEvent,
	post: { id: number; sourceId: string } & Partial<Post>,
	options?: { commentId?: number; toComments?: boolean }
) {
	if ('blocks' in post && Array.isArray((post as Post).blocks)) {
		cachePost(post as Post);
	}
	openFromLink(e, {
		type: 'post',
		data: {
			postId: post.id,
			sourceId: post.sourceId,
			commentId: options?.commentId,
			toComments: options?.toComments
		}
	});
}

/** Открыть страницу уведомлений */
export function openNotifications(e: MouseEvent) {
	openFromLink(e, { type: 'notifications' });
}

/** Открыть профиль пользователя или подсайта поверх текущего экрана */
export function openProfile(e: MouseEvent, id: number) {
	openFromLink(e, { type: 'profile', data: { profileId: id } });
}

/** Открыть окно настроек (опционально конкретную страницу или секцию) */
export function openSettings(e?: MouseEvent, page?: string, section?: string) {
	if (e) {
		openFromLink(e, { type: 'settings', data: page || section ? { page, section } : undefined });
	} else {
		openOverlay({ type: 'settings', data: page || section ? { page, section } : undefined });
	}
}

/**
 * Клик по ссылке на dtf.ru: пост и профиль открываем у себя, остальное оставляем браузеру.
 * Возвращает true, если открыли у себя.
 */
export function openDtfLink(e: MouseEvent, href: string): boolean {
	const target = parseDtfUrl(href);
	if (!target) return false;

	if (isNewTabClick(e)) {
		e.preventDefault();
		const path = resolve(dtfTargetToPath(target) as '/');
		window.open(path, '_blank');
		return true;
	}

	e.preventDefault();
	markOrigin(e);
	if (target.type === 'post') openOverlay({ type: 'post', data: { postId: target.postId, sourceId: 'dtf', commentId: target.commentId, toComments: target.toComments } });
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
		substateStack.length = 0;
		const feedUrl = resolve(feedPath(feed.current, feed.period) as '/');
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
