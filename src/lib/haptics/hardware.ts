import { registerPlugin } from '@capacitor/core';
import { isNative } from '$lib/capacitor';
import { triggerWebHaptic, canVibrateWeb } from './web';

export interface HapticPrimitivesDiagnostics {
	click: boolean;
	tick: boolean;
	lowTick: boolean;
	thud: boolean;
	spin: boolean;
	quickRise: boolean;
	slowRise: boolean;
	quickFall: boolean;
}

export interface HapticsDiagnostics {
	apiLevel: number;
	manufacturer: string;
	model: string;
	hasVibrator: boolean;
	hasAmplitudeControl: boolean;
	tier: string;
	primitives: HapticPrimitivesDiagnostics;
}

export interface NativeHapticsPluginInterface {
	getDiagnostics(): Promise<HapticsDiagnostics>;
	tick(): Promise<void>;
	click(): Promise<void>;
	heavy(): Promise<void>;
	doubleClick(): Promise<void>;
	error(): Promise<void>;
	testPrimitive(options: { primitive: string; scale?: number }): Promise<void>;
	testPredefined(options: { effect: string }): Promise<void>;
	testViewHaptic(options: { constant: string }): Promise<void>;
	testPreset(options: { preset: string }): Promise<void>;
	testWaveform(options: { timings: number[]; amplitudes?: number[] }): Promise<void>;
}

export const NativeHaptics = registerPlugin<NativeHapticsPluginInterface>('NativeHaptics');

let cachedDiagnostics: HapticsDiagnostics | null = null;

export const nativeHapticsEngine = {
	async getDiagnostics(): Promise<HapticsDiagnostics> {
		if (!isNative()) {
			return {
				apiLevel: 0,
				manufacturer: 'Browser / Web',
				model: typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeJS',
				hasVibrator: canVibrateWeb(),
				hasAmplitudeControl: false,
				tier: 'Web Vibration API (PWA)',
				primitives: {
					click: false,
					tick: false,
					lowTick: false,
					thud: false,
					spin: false,
					quickRise: false,
					slowRise: false,
					quickFall: false
				}
			};
		}

		if (cachedDiagnostics) return cachedDiagnostics;

		try {
			cachedDiagnostics = await NativeHaptics.getDiagnostics();
			return cachedDiagnostics;
		} catch (e) {
			return {
				apiLevel: 0,
				manufacturer: 'Android (Native Plugin Unavailable)',
				model: String(e),
				hasVibrator: false,
				hasAmplitudeControl: false,
				tier: 'Fallback Error',
				primitives: {
					click: false,
					tick: false,
					lowTick: false,
					thud: false,
					spin: false,
					quickRise: false,
					slowRise: false,
					quickFall: false
				}
			};
		}
	},

	async tick(): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('tick');
		try {
			await NativeHaptics.tick();
			return true;
		} catch {
			return false;
		}
	},

	async click(): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('click');
		try {
			await NativeHaptics.click();
			return true;
		} catch {
			return false;
		}
	},

	async heavy(): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('heavy');
		try {
			await NativeHaptics.heavy();
			return true;
		} catch {
			return false;
		}
	},

	async double(): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('double');
		try {
			await NativeHaptics.doubleClick();
			return true;
		} catch {
			return false;
		}
	},

	async error(): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('error');
		try {
			await NativeHaptics.error();
			return true;
		} catch {
			return false;
		}
	},

	async testPrimitive(primitive: string, scale = 1.0): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('click');
		try {
			await NativeHaptics.testPrimitive({ primitive, scale });
			return true;
		} catch {
			return false;
		}
	},

	async testPredefined(effect: string): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('click');
		try {
			await NativeHaptics.testPredefined({ effect });
			return true;
		} catch {
			return false;
		}
	},

	async testViewHaptic(constant: string): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('tick');
		try {
			await NativeHaptics.testViewHaptic({ constant });
			return true;
		} catch {
			return false;
		}
	},

	async testPreset(preset: string): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic('click');
		try {
			await NativeHaptics.testPreset({ preset });
			return true;
		} catch {
			return false;
		}
	},

	async testWaveform(timings: number[], amplitudes?: number[]): Promise<boolean> {
		if (!isNative()) return triggerWebHaptic(timings);
		try {
			await NativeHaptics.testWaveform({ timings, amplitudes });
			return true;
		} catch {
			return false;
		}
	}
};
