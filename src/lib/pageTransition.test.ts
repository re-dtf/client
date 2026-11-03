import { describe, it, expect } from 'vitest';
import { computeContainerClip, pageTransition, shouldTransition } from './pageTransition.svelte';

describe('pageTransition', () => {
	it('computeContainerClip корректно вычисляет inset из координат карточки и экрана', () => {
		const card = { top: 120, left: 300, right: 940, bottom: 420 };
		const screen = { top: 0, left: 0, right: 1920, bottom: 1080 };

		const clip = computeContainerClip(card, screen);
		expect(clip).toBe('inset(120px 980px 660px 300px round 8px)');
	});

	it('computeContainerClip не допускает отрицательных значений отступа', () => {
		const card = { top: -50, left: -20, right: 500, bottom: 300 };
		const screen = { top: 0, left: 0, right: 1000, bottom: 800 };

		const clip = computeContainerClip(card, screen);
		expect(clip).toBe('inset(0px 500px 500px 0px round 8px)');
	});

	it('shouldTransition возвращает false в среде без window (SSR / node)', () => {
		expect(shouldTransition()).toBe(false);
	});

	it('isOutgoing и isIncoming возвращают false по умолчанию', () => {
		expect(pageTransition.active).toBe(false);
		expect(pageTransition.slow).toBe(false);
		expect(pageTransition.isOutgoing('layer-1')).toBe(false);
		expect(pageTransition.isIncoming('layer-2')).toBe(false);
	});
});
