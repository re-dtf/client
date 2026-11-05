import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { preloadIntent } from './preloadIntent';
import { api } from '$lib/api/index.svelte';

vi.mock('$lib/api/index.svelte', () => ({
	api: {
		peekPost: vi.fn(),
		getPost: vi.fn().mockResolvedValue({})
	}
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
			listeners.set(type, arr.filter((h) => h !== handler));
		},
		dispatch(type: string, event: any) {
			const arr = listeners.get(type) || [];
			for (const handler of arr) handler(event);
		}
	} as unknown as HTMLElement & { dispatch: (type: string, event: any) => void };
}

describe('preloadIntent', () => {
	let element: ReturnType<typeof createMockElement>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		element = createMockElement();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('не делает запрос, если пост уже в кэше', () => {
		vi.mocked(api.peekPost).mockReturnValue({} as any);
		const action = preloadIntent(element, { id: 123, sourceId: 'dtf' });

		element.dispatch('pointerdown', { clientX: 100, clientY: 100, button: 0 });
		vi.advanceTimersByTime(50);

		expect(api.getPost).not.toHaveBeenCalled();
		action.destroy();
	});

	it('запускает предзагрузку при удержании пальца на месте более 35мс', () => {
		vi.mocked(api.peekPost).mockReturnValue(undefined);
		const action = preloadIntent(element, { id: 123, sourceId: 'dtf' });

		element.dispatch('pointerdown', { clientX: 100, clientY: 100, button: 0 });
		expect(api.getPost).not.toHaveBeenCalled();

		vi.advanceTimersByTime(40);
		expect(api.getPost).toHaveBeenCalledWith(123, 'dtf');
		action.destroy();
	});

	it('отменяет предзагрузку при жесте скролла (смещение > 8px)', () => {
		vi.mocked(api.peekPost).mockReturnValue(undefined);
		const action = preloadIntent(element, { id: 123, sourceId: 'dtf' });

		element.dispatch('pointerdown', { clientX: 100, clientY: 100, button: 0 });
		element.dispatch('pointermove', { clientX: 100, clientY: 120, button: 0 }); // dy = 20 > 8

		vi.advanceTimersByTime(50);
		expect(api.getPost).not.toHaveBeenCalled();
		action.destroy();
	});

	it('отменяет предзагрузку при pointercancel', () => {
		vi.mocked(api.peekPost).mockReturnValue(undefined);
		const action = preloadIntent(element, { id: 123, sourceId: 'dtf' });

		element.dispatch('pointerdown', { clientX: 100, clientY: 100, button: 0 });
		element.dispatch('pointercancel', {});

		vi.advanceTimersByTime(50);
		expect(api.getPost).not.toHaveBeenCalled();
		action.destroy();
	});
});
