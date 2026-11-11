import { api } from '$lib/api/index.svelte';
import type { Post } from '$lib/api/types';

// Новости и подгруженные порции переживают пересоздание ленты и смену темы.
const STALE = 5 * 60_000;
let items = $state.raw<Post[]>([]);
let loading = $state(false);
let ready = $state(false);
let hasMore = $state(true);
let lastId = 0;
let updatedAt = 0;
let requestId = 0;
let pending: Promise<void> | undefined;
let pendingReplace = false;

function load(replace = false): Promise<void> {
	if (pending) {
		if (!replace || pendingReplace) return pending;
	}
	const id = ++requestId;
	loading = true;
	pendingReplace = replace;
	pending = api
		.getEditorialNews(replace ? 0 : lastId)
		.then((page) => {
			if (id !== requestId) return;
			items = replace ? page.items : [...items, ...page.items];
			lastId = page.lastId ?? (replace ? 0 : lastId);
			hasMore = page.items.length > 0;
			updatedAt = Date.now();
		})
		.catch((error) => {
			// Новости — дополнение: ошибка не мешает показать посты, уже загруженное остаётся.
			console.error('Не удалось загрузить новости:', error);
		})
		.finally(() => {
			if (id === requestId) {
				loading = false;
				ready = true;
				pending = undefined;
			}
		});
	return pending;
}

export const editorialNews = {
	get items() {
		return items;
	},
	get loading() {
		return loading;
	},
	get hasMore() {
		return hasMore;
	},
	get ready() {
		return ready;
	},
	loadInitial(force = false) {
		return !force && updatedAt && Date.now() - updatedAt < STALE ? Promise.resolve() : load(true);
	},
	loadMore: () => load()
};
