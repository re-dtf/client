import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import * as capacitorModule from '$lib/capacitor';
import { haptics, triggerHaptic, HAPTIC_PATTERNS } from './index';
import { triggerWebHaptic, webHaptics } from './web';
import { triggerNativeHaptic, nativeHaptics } from './native';
import { settings } from '$lib/storage/settings.svelte';

vi.mock('@capacitor/haptics', () => ({
	Haptics: {
		selectionStart: vi.fn().mockResolvedValue(undefined),
		selectionChanged: vi.fn().mockResolvedValue(undefined),
		selectionEnd: vi.fn().mockResolvedValue(undefined),
		impact: vi.fn().mockResolvedValue(undefined),
		notification: vi.fn().mockResolvedValue(undefined),
		vibrate: vi.fn().mockResolvedValue(undefined)
	},
	ImpactStyle: {
		Heavy: 'HEAVY',
		Medium: 'MEDIUM',
		Light: 'LIGHT'
	},
	NotificationType: {
		Success: 'SUCCESS',
		Warning: 'WARNING',
		Error: 'ERROR'
	}
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

			expect(webHaptics.click()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.click);

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

	describe('Capacitor Native taptics', () => {
		it('вызывает нативные методы Capacitor Haptics для каждого типа сигнала', () => {
			expect(nativeHaptics.tick()).toBe(true);
			expect(Haptics.selectionStart).toHaveBeenCalledTimes(1);
			expect(Haptics.selectionChanged).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.click()).toBe(true);
			expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });

			expect(nativeHaptics.heavy()).toBe(true);
			expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Heavy });

			expect(nativeHaptics.double()).toBe(true);
			expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });

			expect(nativeHaptics.error()).toBe(true);
			expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Error });
		});

		it('управляет сессией выбора selectionStart, selectionChanged, selectionEnd', () => {
			expect(nativeHaptics.selectionStart()).toBe(true);
			expect(Haptics.selectionStart).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.selectionChanged()).toBe(true);
			expect(Haptics.selectionChanged).toHaveBeenCalledTimes(1);

			expect(nativeHaptics.selectionEnd()).toBe(true);
			expect(Haptics.selectionEnd).toHaveBeenCalledTimes(1);
		});

		it('поддерживает произвольную вибрацию по длительности и массиву', () => {
			expect(nativeHaptics.trigger(50)).toBe(true);
			expect(Haptics.vibrate).toHaveBeenCalledWith({ duration: 50 });

			expect(nativeHaptics.trigger([15, 30, 15])).toBe(true);
			expect(Haptics.vibrate).toHaveBeenCalledWith({ duration: 15 });
		});
	});

	describe('Unified receiver (единая точка приема сигнала)', () => {
		it('маршрутизирует сигнал в Web Vibration API при работе в PWA / браузере', () => {
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(false);

			expect(haptics.click()).toBe(true);
			expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.click);
			expect(Haptics.impact).not.toHaveBeenCalled();
		});

		it('маршрутизирует сигнал в Capacitor Haptics при работе в нативной среде', () => {
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(true);

			expect(haptics.click()).toBe(true);
			expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
			expect(vibrateMock).not.toHaveBeenCalled();

			expect(haptics.selectionStart()).toBe(true);
			expect(Haptics.selectionStart).toHaveBeenCalled();

			expect(haptics.selectionChanged()).toBe(true);
			expect(Haptics.selectionChanged).toHaveBeenCalled();

			expect(haptics.selectionEnd()).toBe(true);
			expect(Haptics.selectionEnd).toHaveBeenCalled();

			expect(haptics.tick()).toBe(true);
		});

		it('не производит тактильный отклик, если отключен в настройках пользователя', () => {
			settings.patch({ haptics: false });

			// В Web
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(false);
			expect(haptics.click()).toBe(false);
			expect(haptics.selectionStart()).toBe(false);
			expect(haptics.selectionChanged()).toBe(false);
			expect(haptics.selectionEnd()).toBe(false);
			expect(vibrateMock).not.toHaveBeenCalled();

			// В Native
			vi.spyOn(capacitorModule, 'isNative').mockReturnValue(true);
			expect(haptics.click()).toBe(false);
			expect(haptics.selectionStart()).toBe(false);
			expect(haptics.selectionChanged()).toBe(false);
			expect(haptics.selectionEnd()).toBe(false);
			expect(Haptics.impact).not.toHaveBeenCalled();
			expect(Haptics.selectionStart).not.toHaveBeenCalled();
		});
	});
});
