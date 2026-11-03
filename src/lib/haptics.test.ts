import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { haptics, HAPTIC_PATTERNS } from './haptics';
import { settings } from './storage/settings.svelte';

describe('haptics engine', () => {
	const originalVibrate = globalThis.navigator?.vibrate;
	const vibrateMock = vi.fn().mockReturnValue(true);

	beforeEach(() => {
		vibrateMock.mockClear();
		Object.defineProperty(globalThis.navigator, 'vibrate', {
			value: vibrateMock,
			configurable: true,
			writable: true
		});
		settings.patch({ haptics: true });
	});

	afterEach(() => {
		if (originalVibrate) {
			Object.defineProperty(globalThis.navigator, 'vibrate', {
				value: originalVibrate,
				configurable: true,
				writable: true
			});
		} else {
			delete (globalThis.navigator as any).vibrate;
		}
	});

	it('should trigger click haptic with defined pattern', () => {
		const res = haptics.click();
		expect(res).toBe(true);
		expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.click);
	});

	it('should trigger tick haptic with defined pattern', () => {
		const res = haptics.tick();
		expect(res).toBe(true);
		expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.tick);
	});

	it('should trigger double haptic with defined pattern', () => {
		const res = haptics.double();
		expect(res).toBe(true);
		expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.double);
	});

	it('should trigger error haptic with defined pattern', () => {
		const res = haptics.error();
		expect(res).toBe(true);
		expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.error);
	});

	it('should trigger custom pattern', () => {
		const res = haptics.trigger([5, 20, 5]);
		expect(res).toBe(true);
		expect(vibrateMock).toHaveBeenCalledWith([5, 20, 5]);
	});

	it('should not vibrate when disabled in settings', () => {
		settings.patch({ haptics: false });
		const res = haptics.click();
		expect(res).toBe(false);
		expect(vibrateMock).not.toHaveBeenCalled();
	});
});
