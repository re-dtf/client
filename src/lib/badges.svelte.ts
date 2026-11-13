import { api } from '$lib/api/index.svelte';

// Каталог бейджей DTF: id → картинка. Грузится один раз и только когда нужны свои бейджи
let urls = $state.raw<Record<string, string>>({});
let requested = false;

export const badges = {
	/** Картинка бейджа; пока каталог не загружен (или id в нём нет) — undefined, и показывается значок по умолчанию */
	urlOf(id: string): string | undefined {
		return urls[id];
	},

	async load() {
		if (requested) return;
		requested = true;
		try {
			urls = Object.fromEntries((await api.getBadges()).map((badge) => [badge.id, badge.url]));
		} catch {
			// без каталога остаётся классический значок; повторим при следующем запуске
		}
	}
};
