import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as capacitorModule from '$lib/capacitor';
import { NativeHaptics } from './hardware';
import { haptics, triggerHaptic, HAPTIC_PATTERNS } from './index';
import { triggerWebHaptic, webHaptics } from './web';
import { triggerNativeHaptic, nativeHaptics } from './native';
import { settings } from '$lib/storage/settings.svelte';

vi.mock('@capacitor/core', () => ({
	registerPlugin: vi.fn(() => ({
		getDiagnostics: vi.fn().mockResolvedValue({}),
		tick: vi.fn().mockResolvedValue(undefined),
		soft: vi.fn().mockResolvedValue(undefined),
		click: vi.fn().mockResolvedValue(undefined),
		like: vi.fn().mockResolvedValue(undefined),
		dislike: vi.fn().mockResolvedValue(undefined),
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

describe('Haptics System', () => {
	const originalVibrate = globalThis.navigator?.vibrate;
	const vibrateMock = vi.fn().mockReturnValue(true);

	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(globalThis.navigator, 'vibrate', {
			value: vibrateMock,
			configurable: true,
			writable: true
		});
		settings.patch({ haptics: true });
		vi.spyOn(capacitorModule, 'isNative').mockReturnValue(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
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

	describe('PWA / Web vibration', () => {
		it('вызывает navigator.vibrate с правильными паттернами', () => {
			expect(webHaptics.tick()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.tick);

			expect(webHaptics.soft()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.soft);

			expect(webHaptics.click()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.click);

			expect(webHaptics.like()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.like);

			expect(webHaptics.dislike()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.dislike);

			expect(webHaptics.heavy()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.heavy);

			expect(webHaptics.double()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.double);

			expect(webHaptics.error()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.error);

			expect(webHaptics.trigger([10, 20, 10])).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith([10, 20, 10]);
		});

		it('возвращает false если navigator.vibrate недоступен', () => {
			delete (globalThis.navigator as any).vibrate;
			expect(triggerWebHaptic('click')).toBe(false);
		});
	});

	describe('Capacitor Native haptics (NativeHaptics plugin)', () => {
		it('вызывает нативные методы NativeHaptics для каждого типа сигнала', () => {
			expect(nativeHaptics.tick()).toBe(true);
			expect(NativeHaptics.tick).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.soft()).toBe(true);
			expect(NativeHaptics.soft).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.click()).toBe(true);
			expect(NativeHaptics.click).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.like()).toBe(true);
			expect(NativeHaptics.like).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.dislike()).toBe(true);
			expect(NativeHaptics.dislike).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.heavy()).toBe(true);
			expect(NativeHaptics.heavy).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.double()).toBe(true);
			expect(NativeHaptics.doubleClick).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.error()).toBe(true);
			expect(NativeHaptics.error).toHaveBeenCalledTimes(1);
		});

		it('управляет сессией выбора selectionStart, selectionChanged, selectionEnd', () => {
			expect(nativeHaptics.selectionStart()).toBe(true);

			expect(nativeHaptics.selectionChanged()).toBe(true);
			expect(NativeHaptics.tick).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.selectionEnd()).toBe(true);
		});

		it('поддерживает произвольную вибрацию по длительности и массиву через testWaveform', () => {
			expect(nativeHaptics.trigger(50)).toBe(true);
			expect(NativeHaptics.testWaveform).toHaveBeenCalledWith({ timings: [50] });

			expect(nativeHaptics.trigger([15, 30, 15])).toBe(true);
			expect(NativeHaptics.testWaveform).toHaveBeenCalledWith({ timings: [15, 30, 15] });
		});
	});

	describe('Unified receiver (единая точка приема сигнала)', () => {
		it('маршрутизирует сигнал в Web Vibration API при работе в PWA / браузере', () => {
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(false);

			expect(haptics.click()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.click);
			expect(NativeHaptics.click).not.toHaveBeenCalled();

			expect(haptics.like()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.like);
			expect(NativeHaptics.like).not.toHaveBeenCalled();
		});

		it('маршрутизирует сигнал в NativeHaptics при работе в нативной среде', () => {
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(true);

			expect(haptics.click()).toBe(true);
			expect(NativeHaptics.click).toHaveBeenCalled();
			expect(vibrateMock).not.toHaveBeenCalled();

			expect(haptics.like()).toBe(true);
			expect(NativeHaptics.like).toHaveBeenCalled();

			expect(haptics.dislike()).toBe(true);
			expect(NativeHaptics.dislike).toHaveBeenCalled();

			expect(haptics.soft()).toBe(true);
			expect(NativeHaptics.soft).toHaveBeenCalled();

			expect(haptics.selectionStart()).toBe(true);
			expect(haptics.selectionChanged()).toBe(true);
			expect(NativeHaptics.tick).toHaveBeenCalled();
			expect(haptics.selectionEnd()).toBe(true);

			expect(haptics.tick()).toBe(true);
		});

		it('не производит тактильный отклик, если отключен в настройках пользователя', () => {
			settings.patch({ haptics: false });

			// В Web
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(false);
			expect(haptics.click()).toBe(false);
			expect(haptics.like()).toBe(false);
			expect(haptics.dislike()).toBe(false);
			expect(haptics.soft()).toBe(false);
			expect(haptics.selectionStart()).toBe(false);
			expect(haptics.selectionChanged()).toBe(false);
			expect(haptics.selectionEnd()).toBe(false);
			expect(vibrateMock).not.toHaveBeenCalled();

			// В Native
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(true);
			expect(haptics.click()).toBe(false);
			expect(haptics.like()).toBe(false);
			expect(haptics.dislike()).toBe(false);
			expect(haptics.soft()).toBe(false);
			expect(haptics.selectionStart()).toBe(false);
			expect(haptics.selectionChanged()).toBe(false);
			expect(haptics.selectionEnd()).toBe(false);
			expect(NativeHaptics.click).not.toHaveBeenCalled();
			expect(NativeHaptics.tick).not.toHaveBeenCalled();
		});
	});
});
