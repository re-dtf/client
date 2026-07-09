import { resolve } from '$app/paths';

/**
 * Navigation state for inline post viewing.
 * 
 * When a post is opened from the feed, we push state and render the post
 * in-place (hiding the feed). The feed DOM stays alive — scroll preserved.
 */

let _activePostId = $state<number | null>(null);
let _savedScrollY = 0;

// Disable browser's native scroll restoration — we manage it ourselves
if (typeof history !== 'undefined') {
	history.scrollRestoration = 'manual';
}

export const navigation = {
	get activePostId(): number | null {
		return _activePostId;
	},

	openPost(id: number) {
		_savedScrollY = window.scrollY;
		_activePostId = id;
		history.pushState({ activePostId: id }, '', resolve(`/post/${id}`));
		window.scrollTo(0, 0);
	},

	closePost() {
		if (_activePostId === null) return;
		_activePostId = null;
		history.back();
	},

	/** Called from popstate handler — does NOT touch history */
	_handlePopState(state: unknown) {
		const s = state as { activePostId?: number } | null;
		const wasActive = _activePostId !== null;
		_activePostId = s?.activePostId ?? null;

		// Returning to feed from post — restore scroll
		if (wasActive && _activePostId === null) {
			requestAnimationFrame(() => window.scrollTo(0, _savedScrollY));
		}
		// Opening post from popstate (forward) — scroll to top
		if (!wasActive && _activePostId !== null) {
			window.scrollTo(0, 0);
		}
	}
};
