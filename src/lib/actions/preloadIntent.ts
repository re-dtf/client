import { api } from '$lib/api/index.svelte';

export interface PreloadTarget {
	id: number;
	sourceId?: string;
}

/**
 * Предзагрузка данных поста по намерению пользователя (pointerdown).
 * Если палец смещается больше чем на 8px (скролл) или касание отменено, запрос отменяется.
 * Задержка 35 мс отсекает случайные касания при быстром скролле ленты.
 * Никаких визуальных эффектов (активных классов, стилей) на элемент не вешается.
 */
export function preloadIntent(node: HTMLElement, target: PreloadTarget | (() => PreloadTarget)) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let startPos: { x: number; y: number } | undefined;

	function getTarget(): PreloadTarget {
		return typeof target === 'function' ? target() : target;
	}

	function cancel() {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
		startPos = undefined;
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		const { id, sourceId = 'dtf' } = getTarget();
		if (!id || api.peekPost(id, sourceId)) return;

		cancel();
		startPos = { x: e.clientX, y: e.clientY };
		timer = setTimeout(() => {
			timer = undefined;
			api.getPost(id, sourceId).catch(() => {});
		}, 35);
	}

	function onPointerMove(e: PointerEvent) {
		if (!timer || !startPos) return;
		if (Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) > 8) {
			cancel();
		}
	}

	node.addEventListener('pointerdown', onPointerDown, { passive: true });
	node.addEventListener('pointermove', onPointerMove, { passive: true });
	node.addEventListener('pointerup', cancel, { passive: true });
	node.addEventListener('pointercancel', cancel, { passive: true });

	return {
		update(newTarget: PreloadTarget | (() => PreloadTarget)) {
			target = newTarget;
		},
		destroy() {
			cancel();
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', cancel);
			node.removeEventListener('pointercancel', cancel);
		}
	};
}
