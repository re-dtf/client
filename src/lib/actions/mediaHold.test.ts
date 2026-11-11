import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mediaHold } from './mediaHold';
import { mediaSheet } from '$lib/mediaSheet.svelte';
import { haptics } from '$lib/haptics';

vi.mock('$lib/haptics', () => ({
	haptics: {
		click: vi.fn(),
		double: vi.fn(),
		error: vi.fn()
	}
}));

const capacitorMock = vi.hoisted(() => ({
	isNative: vi.fn().mockReturnValue(true)
}));

vi.mock('$lib/capacitor', () => ({
	isNative: capacitorMock.isNative
}));

function createMockElement() {
	const listeners = new Map<string, ((e: any) => void)[]>();
	return {
		addEventListener(type: string, handler: (e: any) => void) {
			const arr = listeners.get(type) || [];
			arr.push(handler);
			listeners.set(type, arr);
		},
		removeEventListener(type: string, handler: (e: any) => void) {
			const arr = listeners.get(type) || [];
			const idx = arr.indexOf(handler);
			if (idx >= 0) arr.splice(idx, 1);
		},
		dispatchEvent(e: any) {
			const arr = [...(listeners.get(e.type) || [])];
			for (const handler of arr) {
				handler(e);
			}
			return !e.defaultPrevented;
		}
	};
}

describe('mediaHold action', () => {
	let node: any;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		mediaSheet.close();
		capacitorMock.isNative.mockReturnValue(true);
		node = createMockElement();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('открывает меню медиа и вибрирует при удержании пальца (450ms)', () => {
		const action = mediaHold(node, { uuid: 'test-uuid-gif', isGif: true });

		node.dispatchEvent({
			type: 'pointerdown',
			pointerType: 'touch',
			clientX: 100,
			clientY: 100
		});

		expect(mediaSheet.current).toBeNull();
		expect(haptics.click).not.toHaveBeenCalled();

		vi.advanceTimersByTime(450);

		expect(mediaSheet.current).toEqual({ uuid: 'test-uuid-gif', isGif: true });
		expect(haptics.click).toHaveBeenCalled();

		action.destroy();
	});

	it('отменяет таймер, если палец сдвинулся более чем на 10px (скролл)', () => {
		const action = mediaHold(node, { uuid: 'test-uuid', isGif: false });

		node.dispatchEvent({
			type: 'pointerdown',
			pointerType: 'touch',
			clientX: 100,
			clientY: 100
		});

		node.dispatchEvent({
			type: 'pointermove',
			pointerType: 'touch',
			clientX: 100,
			clientY: 115
		});

		vi.advanceTimersByTime(450);

		expect(mediaSheet.current).toBeNull();
		expect(haptics.click).not.toHaveBeenCalled();

		action.destroy();
	});

	it('отменяет таймер при быстром тапе (pointerup до 450ms)', () => {
		const action = mediaHold(node, { uuid: 'test-uuid', isGif: true });

		node.dispatchEvent({
			type: 'pointerdown',
			pointerType: 'touch',
			clientX: 100,
			clientY: 100
		});

		vi.advanceTimersByTime(200);

		node.dispatchEvent({
			type: 'pointerup',
			pointerType: 'touch',
			clientX: 100,
			clientY: 100
		});

		vi.advanceTimersByTime(300);

		expect(mediaSheet.current).toBeNull();

		action.destroy();
	});

	it('игнорирует события мыши (ПКМ и клики на десктопе)', () => {
		const action = mediaHold(node, { uuid: 'test-uuid', isGif: true });

		node.dispatchEvent({
			type: 'pointerdown',
			pointerType: 'mouse',
			clientX: 100,
			clientY: 100,
			button: 0
		});

		vi.advanceTimersByTime(500);

		expect(mediaSheet.current).toBeNull();

		action.destroy();
	});

	it('подавляет клик сразу после срабатывания долгого зажатия', () => {
		const action = mediaHold(node, { uuid: 'test-uuid', isGif: true });

		node.dispatchEvent({
			type: 'pointerdown',
			pointerType: 'touch',
			clientX: 100,
			clientY: 100
		});

		vi.advanceTimersByTime(450);

		let prevented = false;
		const clickEvent = {
			type: 'click',
			preventDefault: () => {
				prevented = true;
			},
			stopPropagation: () => {}
		};
		node.dispatchEvent(clickEvent);

		expect(prevented).toBe(true);

		action.destroy();
	});

	it('открывает меню по событию contextmenu в нативном контейнере', () => {
		const action = mediaHold(node, { uuid: 'test-ctx', isGif: true });

		let prevented = false;
		const ctxEvent = {
			type: 'contextmenu',
			preventDefault: () => {
				prevented = true;
			}
		};
		node.dispatchEvent(ctxEvent);

		expect(prevented).toBe(true);
		expect(mediaSheet.current).toEqual({ uuid: 'test-ctx', isGif: true });
		expect(haptics.click).toHaveBeenCalled();

		action.destroy();
	});
});
