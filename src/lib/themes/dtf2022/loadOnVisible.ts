import type { Attachment } from 'svelte/attachments';

/** Подгрузка, когда элемент (низ списка) подъезжает к экрану */
export const loadOnVisible =
	(load: () => void): Attachment<HTMLElement> =>
	(node) => {
		const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && load(), { rootMargin: '1000px' });
		observer.observe(node);
		return () => observer.disconnect();
	};
