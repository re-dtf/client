/** Донат к комментарию: сумма от 100 до 10 000 ₽, ползунок прыгает по этим отметкам */
export const DONATION_MIN = 100;
export const DONATION_MAX = 10000;
export const DONATION_MARKS = [100, 250, 500, 1000, 5000, 10000];

/** Сумма из того, что набрал пользователь: только цифры, не больше пяти */
export function parseDonation(text: string): number {
	return Number(text.replace(/\D/g, '').slice(0, 5)) || 0;
}

/** «1 000 ₽»; без суммы — пустая строка, чтобы показался placeholder */
export function formatDonation(amount: number, suffix = true): string {
	if (!amount) return '';
	const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	return suffix ? `${grouped} ₽` : grouped;
}

/** Ближайшая к сумме отметка ползунка */
export function nearestMarkIndex(amount: number): number {
	return DONATION_MARKS.reduce((best, mark, i) => (Math.abs(mark - amount) < Math.abs(DONATION_MARKS[best] - amount) ? i : best), 0);
}
