import { describe, expect, it } from 'vitest';
import { autoplayAllowed } from './dataSaver.svelte';

describe('autoplayAllowed', () => {
	it('«всегда» грузит и при экономии трафика, «по нажатию» не грузит никогда', () => {
		expect(autoplayAllowed('always', true)).toBe(true);
		expect(autoplayAllowed('off', false)).toBe(false);
	});

	it('«авто» не грузит только при включённой экономии трафика', () => {
		expect(autoplayAllowed('auto', false)).toBe(true);
		expect(autoplayAllowed('auto', true)).toBe(false);
	});
});
