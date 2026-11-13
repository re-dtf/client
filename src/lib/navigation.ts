import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { parseDtfUrl, dtfTargetToPath, safeDecode } from './dtfLinks';
import { feed, feedPath, openFeedTab } from './feed.svelte';
import { scrollBehavior } from './motion';
import { markOrigin } from './pageTransition.svelte';
import { settings, DEFAULT_SHARE_SERVICE_URL } from '$lib/storage/settings.svelte';

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
	tag: 'page',
	search: 'page',
	drafts: 'page',
	login: 'modal',
	editor: 'modal',
	lightbox: 'fullscreen'
};

export function getPostPath(post: { id: number; sourceId: string }, target?: number | 'comments' | string) {
	const hash = target === 'comments'
		? '#comments'
		: typeof target === 'string' && target
			? (target.startsWith('#') ? `#${encodeURIComponent(target.slice(1))}` : `#${encodeURIComponent(target)}`)
			: '';
	const commentId = typeof target === 'number' ? target : undefined;
	if (post.sourceId !== 'dtf') {
		const query = commentId ? `?source=${post.sourceId}&comment=${commentId}` : `?source=${post.sourceId}`;
		return `/post/${post.id}${query}${hash}`;
	}
	return commentId ? `/post/${post.id}?comment=${commentId}` : `/post/${post.id}${hash}`;
}

/**
 * Формирует ссылку на пост для шеринга или копирования.
 * При включённой настройке `useSharePreview` (по умолчанию), наличии адреса сервиса превью
 * и для постов из источника DTF генерирует ссылку через сервис превью, чтобы соцсети и мессенджеры
 * показывали карточку статьи с обложкой.
 * Для сторонних источников, при отсутствии адреса сервиса или при выключенной настройке
 * возвращает прямой URL клиента.
 */
export function getPostShareUrl(
	post: { id: number; sourceId: string },
	target?: number | 'comments' | string,
	base?: string,
	shareServiceUrl: string = DEFAULT_SHARE_SERVICE_URL
): string {
	const path = getPostPath(post, target);
	if (!shareServiceUrl || !settings.value.useSharePreview || post.sourceId !== 'dtf') {
		const fallbackBase = base || (typeof location !== 'undefined' ? location.href : 'http://localhost');
		return new URL(resolve(path as any), fallbackBase).href;
	}
	return `${shareServiceUrl}${path}`;
}

export function getProfilePath(id: number | string) {
	return `/u/${encodeURIComponent(id)}`;
}

export function getTagPath(tag: string) {
	return `/tag/${encodeURIComponent(tag)}`;
}

export function getSearchPath(query: string) {
	return `/search?q=${encodeURIComponent(query)}`;
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
				overlay.data.commentId ?? (overlay.data.toComments ? 'comments' : overlay.data.anchor)
			);
		case 'profile':
			return getProfilePath(overlay.data.profileId);
		case 'settings':
			return getSettingsPath(overlay.data?.page, overlay.data?.section);
		case 'notifications':
			return '/notifications';
		case 'tag':
			return getTagPath(overlay.data.tag);
		case 'search':
			return getSearchPath(overlay.data.query);
		case 'drafts':
			return '/drafts';
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
					anchor: overlay.data.anchor,
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
			page.route?.id === '/post/[id]' &&
			Number(page.params?.id) === overlay.data.postId &&
			(page.url?.searchParams?.get('source') || 'dtf') === sourceId
		) {
			const url = resolve(
				getPostPath(
					{ id: overlay.data.postId, sourceId },
					overlay.data.commentId ?? (overlay.data.toComments ? 'comments' : overlay.data.anchor)
				) as '/'
			);
			return goto(url, {
				shallow: true,
				replace: true,
				state: page.state
			});
		}
	}

	// Новый поиск из открытого поиска заменяет его: в «Назад» не копятся запросы
	if (overlay.type === 'search') {
		const currentOverlays = page.state.overlays ?? [];
		const top = currentOverlays.at(-1);
		if (top?.type === 'search') {
			const updated: App.OverlayState = { ...top, data: overlay.data };
			return goto(resolve(overlayPath(overlay) as '/'), {
				shallow: true,
				replace: true,
				state: { overlays: [...currentOverlays.slice(0, -1), updated] }
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
export function openLightbox(images: Extract<App.OverlayData, { type: 'lightbox' }>['data']['images'], index: number, origin?: HTMLImageElement) {
	if (lightboxOpening || page.state.overlays?.some((o) => o.type === 'lightbox')) return;
	lightboxOpening = true;
	lightboxOrigin = origin;
	return openOverlay({
		type: 'lightbox',
		data: { images: images.map(({ uuid, width, height, type, video, caption }) => ({ uuid, width, height, type, video, caption })), index }
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
	post: { id: number; sourceId: string },
	options?: { commentId?: number; toComments?: boolean; anchor?: string }
) {
	openFromLink(e, {
		type: 'post',
		data: {
			postId: post.id,
			sourceId: post.sourceId,
			commentId: options?.commentId,
			toComments: options?.toComments,
			anchor: options?.anchor
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

/** Открыть записи с тегом (без `#`) */
export function openTag(e: MouseEvent, tag: string) {
	openFromLink(e, { type: 'tag', data: { tag } });
}

/** Открыть поиск; пустой запрос не ищется */
export function openSearch(query: string) {
	const trimmed = query.trim();
	if (trimmed) openOverlay({ type: 'search', data: { query: trimmed } });
}

/** Открыть черновики */
export function openDrafts(e: MouseEvent) {
	openFromLink(e, { type: 'drafts' });
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
 * Открыть ссылку или целевой объект dtf.ru или redtf.org внутри приложения (для deep links и программных переходов).
 * Возвращает true, если цель поддерживается и открыта.
 */
export function openDtfUrl(href: string): boolean {
	const target = parseDtfUrl(href);
	if (!target) return false;

	if (target.type === 'feed') {
		if (page.state.overlays?.length) {
			clearSubstates();
			const feedUrl = resolve((target.feed && target.feed !== 'popular' ? `/?feed=${target.feed}` : '/') as '/');
			goto(feedUrl, { shallow: true, state: { overlays: [] } });
		} else if (target.feed) {
			openFeedTab(target.feed);
		}
		return true;
	}

	if (target.type === 'notifications') {
		openOverlay({ type: 'notifications' });
		return true;
	}

	if (target.type === 'post') {
		openOverlay({
			type: 'post',
			data: {
				postId: target.postId,
				sourceId: target.sourceId || 'dtf',
				commentId: target.commentId,
				toComments: target.toComments,
				anchor: target.anchor
			}
		});
	} else if (target.type === 'tag') {
		openOverlay({ type: 'tag', data: { tag: target.tag } });
	} else {
		openOverlay({ type: 'profile', data: { profileId: target.profileId } });
	}
	return true;
}

/**
 * Клик по ссылке на dtf.ru или redtf.org: поддерживаемые цели открываем у себя, остальное оставляем браузеру.
 * Возвращает true, если открыли у себя.
 */
export function openDtfLink(e: MouseEvent, href: string): boolean {
	if (e.defaultPrevented) return false;
	if (href.startsWith('#')) {
		const hash = href.slice(1);
		if (!hash) return false;
		const currentOverlays = page.state.overlays ?? [];
		const top = currentOverlays.findLast((o) => o.presentation === 'page');
		const isStandalone = page.route.id === '/post/[id]';
		if (top?.type !== 'post' && !isStandalone) return false;
		if (isNewTabClick(e)) return false;
		e.preventDefault();

		const postId = top?.type === 'post' ? top.data.postId : Number(page.params.id);
		const sourceId = (top?.type === 'post' ? top.data.sourceId : page.url.searchParams.get('source')) || 'dtf';
		const commentParam = /^comment[=-](\d+)$/i.exec(hash);
		const commentId = commentParam ? Number(commentParam[1]) : undefined;
		const toComments = hash === 'comments' || hash === 'comment';
		const anchor = !commentId && !toComments ? safeDecode(hash) : undefined;

		openOverlay({
			type: 'post',
			data: { postId, sourceId, commentId, toComments, anchor }
		});
		return true;
	}

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
	return openDtfUrl(href);
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
