import { describe, expect, it } from 'vitest';
import { isNoticeDue, SHOW_AFTER, SNOOZE_FOR, type NoticeState } from './feedNotice.svelte';

const state = (part: Partial<NoticeState> = {}): NoticeState => ({ firstSeen: 1000, hiddenUntil: 0, dismissed: false, ...part });

describe('feedNotice', () => {
	it('не показывается в первые дни', () => {
		expect(isNoticeDue(state(), 1000 + SHOW_AFTER - 1)).toBe(false);
		expect(isNoticeDue(state(), 1000 + SHOW_AFTER)).toBe(true);
	});

	it('«Позже» прячет на срок, «Больше не показывать» — насовсем', () => {
		const later = state({ hiddenUntil: 5000 + SNOOZE_FOR });
		expect(isNoticeDue(later, 5000 + SNOOZE_FOR - 1)).toBe(false);
		expect(isNoticeDue(later, 5000 + SNOOZE_FOR)).toBe(true);
		expect(isNoticeDue(state({ dismissed: true }), 1000 + SHOW_AFTER * 100)).toBe(false);
	});
});
