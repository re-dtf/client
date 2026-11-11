import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as capacitorModule from '$lib/capacitor';
import { nativeHapticsEngine, NativeHaptics } from './hardware';

vi.mock('@capacitor/core', () => ({
	registerPlugin: vi.fn(() => ({
		getDiagnostics: vi.fn().mockResolvedValue({
			apiLevel: 33,
			manufacturer: 'Google',
			model: 'Pixel 4',
			hasVibrator: true,
			hasAmplitudeControl: true,
			tier: 'Tier 1: Composition Primitives (Android 11+ / Cirrus & LRA)',
			primitives: {
				click: true,
				tick: true,
				lowTick: true,
				thud: true,
				spin: true,
				quickRise: true,
				slowRise: true,
				quickFall: true
			}
		}),
		tick: vi.fn().mockResolvedValue(undefined),
		click: vi.fn().mockResolvedValue(undefined),
		heavy: vi.fn().mockResolvedValue(undefined),
		doubleClick: vi.fn().mockResolvedValue(undefined),
		error: vi.fn().mockResolvedValue(undefined),
		testPrimitive: vi.fn().mockResolvedValue(undefined),
		testPredefined: vi.fn().mockResolvedValue(undefined),
		testViewHaptic: vi.fn().mockResolvedValue(undefined),
		testPreset: vi.fn().mockResolvedValue(undefined),
		testWaveform: vi.fn().mockResolvedValue(undefined)
	}))
}));

describe('Native Haptics Engine', () => {
	const originalVibrate = globalThis.navigator?.vibrate;
	const vibrateMock = vi.fn().mockReturnValue(true);

	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(globalThis.navigator, 'vibrate', {
			value: vibrateMock,
			configurable: true,
			writable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (originalVibrate) {
			Object.defineProperty(globalThis.navigator, 'vibrate', {
				value: originalVibrate,
				configurable: true,
				writable: true
			});
		}
	});

	describe('Web environment fallback (!isNative)', () => {
		beforeEach(() => {
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(false);
		});

		it('возвращает диагностику для Web', async () => {
			const diag = await nativeHapticsEngine.getDiagnostics();
			expect(diag.apiLevel).toBe(0);
			expect(diag.tier).toContain('Web');
			expect(diag.hasVibrator).toBe(true);
		});

		it('направляет вызовы в Web Vibration API', async () => {
			expect(await nativeHapticsEngine.tick()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(2);

			expect(await nativeHapticsEngine.click()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(5);

			expect(await nativeHapticsEngine.heavy()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(10);
		});
	});

	describe('Native Android environment (isNative)', () => {
		beforeEach(() => {
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(true);
		});

		it('получает аппаратную диагностику через нативный мост', async () => {
			const diag = await nativeHapticsEngine.getDiagnostics();
			expect(diag.manufacturer).toBe('Google');
			expect(diag.model).toBe('Pixel 4');
			expect(diag.primitives.tick).toBe(true);
			expect(diag.primitives.click).toBe(true);
		});

		it('вызывает методы нативного плагина NativeHaptics', async () => {
			expect(await nativeHapticsEngine.tick()).toBe(true);
			expect(NativeHaptics.tick).toHaveBeenCalled();

			expect(await nativeHapticsEngine.click()).toBe(true);
			expect(NativeHaptics.click).toHaveBeenCalled();

			expect(await nativeHapticsEngine.heavy()).toBe(true);
			expect(NativeHaptics.heavy).toHaveBeenCalled();

			expect(await nativeHapticsEngine.double()).toBe(true);
			expect(NativeHaptics.doubleClick).toHaveBeenCalled();

			expect(await nativeHapticsEngine.error()).toBe(true);
			expect(NativeHaptics.error).toHaveBeenCalled();
		});

		it('поддерживает тестовые вызовы по поколениям API', async () => {
			expect(await nativeHapticsEngine.testPrimitive('tick', 0.8)).toBe(true);
			expect(NativeHaptics.testPrimitive).toHaveBeenCalledWith({ primitive: 'tick', scale: 0.8 });

			expect(await nativeHapticsEngine.testPredefined('click')).toBe(true);
			expect(NativeHaptics.testPredefined).toHaveBeenCalledWith({ effect: 'click' });

			expect(await nativeHapticsEngine.testViewHaptic('clock_tick')).toBe(true);
			expect(NativeHaptics.testViewHaptic).toHaveBeenCalledWith({ constant: 'clock_tick' });

			expect(await nativeHapticsEngine.testPreset('telegram_selection')).toBe(true);
			expect(NativeHaptics.testPreset).toHaveBeenCalledWith({ preset: 'telegram_selection' });

			expect(await nativeHapticsEngine.testWaveform([1, 2], [50, 100])).toBe(true);
			expect(NativeHaptics.testWaveform).toHaveBeenCalledWith({ timings: [1, 2], amplitudes: [50, 100] });
		});
	});
});
