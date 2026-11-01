import { resolve } from '$app/paths';
import { pushState } from '$app/navigation';
import { page } from '$app/state';

export function pushOverlay(type: App.OverlayState['type'], path: string, data?: Record<string, any>, presentation: App.OverlayState['presentation'] = 'modal') {
	const overlays = page.state.overlays || [];
	pushState(resolve(path as any), {
		overlays: [
			...overlays,
			{ id: `${type}-${Date.now()}`, type, presentation, data }
		]
	});
}

/** Клик по логотипу/«Главной»: закрыть оверлеи, а на самой ленте — наверх и обновить. */
export function openFeed(e: MouseEvent) {
	if (page.state.overlays?.length) {
		e.preventDefault();
		pushState(resolve('/'), { overlays: [] });
		return;
	}

	if (page.url.pathname === resolve('/')) {
		e.preventDefault();
		window.scrollTo({ top: 0, behavior: 'smooth' });
		window.dispatchEvent(new CustomEvent('refreshFeed'));
	}
}

export function getPostPath(post: { id: number; sourceId: string }) {
	return post.sourceId !== 'dtf' ? `/post/${post.id}?source=${post.sourceId}` : `/post/${post.id}`;
}

/** Ctrl/Cmd/Shift/средняя кнопка — пусть браузер сам откроет ссылку в новой вкладке */
function isNewTabClick(e: MouseEvent) {
	return e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0;
}

function pushPageOverlay(e: MouseEvent, path: string, overlay: Omit<App.OverlayState, 'presentation'>) {
	if (isNewTabClick(e)) return;
	e.preventDefault();
	pushState(resolve(path as any), { overlays: [...(page.state.overlays || []), overlay] });
}

/** Открыть пост поверх ленты (страничный оверлей, лента сохраняет скролл). */
export function openPost(e: MouseEvent, post: { id: number; sourceId: string }) {
	pushPageOverlay(e, getPostPath(post), {
		id: `post-${post.sourceId}-${post.id}-${Date.now()}`,
		type: 'post',
		data: { postId: post.id, sourceId: post.sourceId }
	});
}

export function getProfilePath(id: number) {
	return `/u/${id}`;
}

/** Открыть профиль пользователя или подсайта поверх текущего экрана. */
export function openProfile(e: MouseEvent, id: number) {
	pushPageOverlay(e, getProfilePath(id), { id: `profile-${id}-${Date.now()}`, type: 'profile', data: { profileId: id } });
}
