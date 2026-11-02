import { describe, expect, it } from 'vitest';
import { formatDonation, nearestMarkIndex, parseDonation } from './donation';

describe('donation', () => {
	it('разбирает сумму из набранного текста и режет до пяти цифр', () => {
		expect(parseDonation('1 000 ₽')).toBe(1000);
		expect(parseDonation('123456')).toBe(12345);
		expect(parseDonation('abc')).toBe(0);
	});

	it('форматирует с разделителем тысяч и знаком рубля', () => {
		expect(formatDonation(10000)).toBe('10 000 ₽');
		expect(formatDonation(250, false)).toBe('250');
		expect(formatDonation(0)).toBe('');
	});

	it('находит ближайшую отметку ползунка', () => {
		expect(nearestMarkIndex(100)).toBe(0);
		expect(nearestMarkIndex(700)).toBe(2);
		expect(nearestMarkIndex(8000)).toBe(5);
	});
});
