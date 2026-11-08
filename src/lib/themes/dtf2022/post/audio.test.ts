import { describe, it, expect, vi } from 'vitest';
import { claimPlayback, formatDuration } from './audio';

describe('formatDuration', () => {
	it('минуты и секунды, часы только если есть', () => {
		expect(formatDuration(215.5)).toBe('3:35');
		expect(formatDuration(5)).toBe('0:05');
		expect(formatDuration(3725)).toBe('1:02:05');
	});

	it('мусор вместо длительности — ноль', () => {
		expect(formatDuration(NaN)).toBe('0:00');
		expect(formatDuration(-3)).toBe('0:00');
	});
});

describe('claimPlayback', () => {
	it('новая дорожка ставит предыдущую на паузу', () => {
		const first = { pause: vi.fn() } as unknown as HTMLAudioElement;
		const second = { pause: vi.fn() } as unknown as HTMLAudioElement;
		claimPlayback(first);
		claimPlayback(second);
		expect(first.pause).toHaveBeenCalledOnce();
		expect(second.pause).not.toHaveBeenCalled();
	});
});
