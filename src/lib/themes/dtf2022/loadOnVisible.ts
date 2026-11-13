import type { Attachment } from 'svelte/attachments';
import { watchVisible } from '$lib/watchVisible';

/** Подгрузка, когда элемент (низ списка) подъезжает к экрану */
export const loadOnVisible =
	(load: () => unknown): Attachment<HTMLElement> =>
	(node) =>
		watchVisible(node, load);
