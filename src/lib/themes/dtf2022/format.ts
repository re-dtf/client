const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const pluralRules = new Intl.PluralRules('ru-RU');
const numberFormat = new Intl.NumberFormat('ru-RU');

/** plural(5, ['комментарий', 'комментария', 'комментариев']) → «комментариев» */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
	const rule = pluralRules.select(n);
	return rule === 'one' ? one : rule === 'few' ? few : many;
}

/** 41437 → «41 437» (с неразрывным пробелом) */
export function formatNumber(n: number): string {
	return numberFormat.format(n);
}

/** Рейтинг со знаком: 690337 → «+690 337» */
export function formatRating(n: number): string {
	return (n > 0 ? '+' : '') + formatNumber(n);
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Дата как на DTF: «4 часа», «26 фев», «30.12.2022».
 * withTime — для страницы поста: «26 фев в 21:15».
 */
export function formatTime(iso: string, withTime = false, now = Date.now()): string {
	const date = new Date(iso);
	const minutes = Math.floor((now - date.getTime()) / 60000);

	if (!withTime) {
		if (minutes < 1) return 'только что';
		if (minutes < 60) return `${minutes} ${plural(minutes, ['минуту', 'минуты', 'минут'])}`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} ${plural(hours, ['час', 'часа', 'часов'])}`;
	}

	const day =
		date.getFullYear() === new Date(now).getFullYear()
			? `${date.getDate()} ${MONTHS[date.getMonth()]}`
			: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;

	return withTime ? `${day} в ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

const MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** «1 марта» */
export function formatDay(date: Date): string {
	return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}

/** «4 мар 2019» */
export function formatDate(iso: string): string {
	const date = new Date(iso);
	return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Полная дата для title: «28.02.2023 20:46:25» */
export function formatFullDate(iso: string): string {
	return new Date(iso).toLocaleString('ru-RU');
}

/**
 * Время в списке уведомлений: «12 минут назад», «3 часа назад», затем «сегодня в 06:38»,
 * «вчера в 21:10», «26 фев в 21:15». Порог в 4 часа выбран по скриншотам старого дизайна.
 */
export function formatNotificationTime(iso: string, now = Date.now()): string {
	const date = new Date(iso);
	const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60000));
	const hours = Math.floor(minutes / 60);

	if (minutes < 60) return `${Math.max(1, minutes)} ${plural(Math.max(1, minutes), ['минуту', 'минуты', 'минут'])} назад`;
	if (hours < 4) return `${hours} ${plural(hours, ['час', 'часа', 'часов'])} назад`;

	const today = new Date(now);
	const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const daysAgo = Math.round((dayStart(today) - dayStart(date)) / 86400000);
	const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

	if (daysAgo === 0) return `сегодня в ${time}`;
	if (daysAgo === 1) return `вчера в ${time}`;
	return formatTime(iso, true, now);
}
