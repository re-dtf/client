/**
 * Состояние левой колонки (бургер в шапке), как у DTF:
 * на узком экране бургер открывает колонку выдвижной панелью (`open`),
 * на широком — сворачивает и разворачивает её (`collapsed`).
 * Какой из режимов сейчас, решает CSS: в режиме панели колонка получает `position: fixed`.
 */
let open = $state(false);
let collapsed = $state(false);
let node: HTMLElement | undefined;

function isDrawer() {
	return !!node && getComputedStyle(node).position === 'fixed';
}

export const sidebar = {
	get open() {
		return open;
	},
	get collapsed() {
		return collapsed;
	},
	/** Колонка сообщает свой узел, чтобы узнать режим */
	attach(el: HTMLElement) {
		node = el;
		return () => (node = undefined);
	},
	toggle() {
		if (isDrawer()) open = !open;
		else collapsed = !collapsed;
	},
	close() {
		open = false;
	},
	/** Окно выросло, и панель стала обычной колонкой */
	closeIfDocked() {
		if (!isDrawer()) open = false;
	}
};
