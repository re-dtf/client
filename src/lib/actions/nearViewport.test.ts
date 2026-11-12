import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe('nearViewport', () => {
	let callback: Callback;

	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(cb: Callback) {
					callback = cb;
				}
				observe() {}
				unobserve() {}
			}
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('сообщает о выходе из окна, но не когда карточку просто не рисуют', async () => {
		const { nearViewport } = await import('./nearViewport');
		const changes: boolean[] = [];
		const el = {} as Element;
		nearViewport((near) => changes.push(near))(el);

		callback([{ target: el, isIntersecting: false, boundingClientRect: { height: 500 } as DOMRectReadOnly }]);
		// Лента скрыта под постом: прямоугольник нулевой, это не «далеко от экрана»
		callback([{ target: el, isIntersecting: false, boundingClientRect: { height: 0 } as DOMRectReadOnly }]);
		callback([{ target: el, isIntersecting: true, boundingClientRect: { height: 500 } as DOMRectReadOnly }]);

		expect(changes).toEqual([false, true]);
	});
});
