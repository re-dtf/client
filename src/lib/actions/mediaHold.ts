import { isNative } from '$lib/capacitor';
import { haptics } from '$lib/haptics';
import { mediaSheet } from '$lib/mediaSheet.svelte';

export interface MediaHoldOptions {
	uuid: string;
	isGif?: boolean;
}

export function mediaHold(node: HTMLElement, options: MediaHoldOptions) {
	let currentOptions = options;
	let touchTimer: ReturnType<typeof setTimeout> | undefined;
	let touchStart: { x: number; y: number } | undefined;

	function shouldHandleHold(): boolean {
		if (isNative()) return true;
		if (typeof window !== 'undefined') {
			if ((window as any).__RE_DTF_TEST_MEDIA_SHEET__) return true;
			if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
		}
		return false;
	}

	function cancelTouch() {
		clearTimeout(touchTimer);
		touchTimer = undefined;
		touchStart = undefined;
	}

	function suppressClick() {
		const stopClick = (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
		};
		node.addEventListener('click', stopClick, { capture: true, once: true });
		setTimeout(() => node.removeEventListener('click', stopClick, true), 400);
	}

	function triggerLongPress() {
		cancelTouch();
		if (shouldHandleHold()) {
			haptics.click();
			suppressClick();
			mediaSheet.open(currentOptions);
		}
	}

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType !== 'touch') return;
		cancelTouch();
		touchStart = { x: e.clientX, y: e.clientY };
		touchTimer = setTimeout(triggerLongPress, 450);
	}

	function onPointerMove(e: PointerEvent) {
		if (!touchStart || e.pointerType !== 'touch') return;
		if (Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y) > 10) {
			cancelTouch();
		}
	}

	function onContextMenu(e: MouseEvent) {
		if (shouldHandleHold()) {
			e.preventDefault();
			if (!mediaSheet.current) {
				haptics.click();
				mediaSheet.open(currentOptions);
			}
		}
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointermove', onPointerMove);
	node.addEventListener('pointerup', cancelTouch);
	node.addEventListener('pointercancel', cancelTouch);
	node.addEventListener('contextmenu', onContextMenu);

	return {
		update(newOptions: MediaHoldOptions) {
			currentOptions = newOptions;
		},
		destroy() {
			cancelTouch();
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', cancelTouch);
			node.removeEventListener('pointercancel', cancelTouch);
			node.removeEventListener('contextmenu', onContextMenu);
		}
	};
}
