/*
 * Локальная статистика: сколько времени проведено в приложении, что и кого читали, какие реакции ставили.
 * Лежит только в localStorage (слой data) и никуда не отправляется.
 *
 * Считают общие точки, а не темы: фасад API (реакции, комментарии, закладки), PostContent (прочитанные посты)
 * и секундный тик из корневого layout. Пост считается прочитанным после READ_AFTER секунд на нём.
 */
import type { Post, User } from '$lib/api/types';
import { persistedState } from './persisted.svelte';
import { settings } from './settings.svelte';

/** Через сколько секунд на посте он считается прочитанным */
export const READ_AFTER = 5;
/** Без движений и нажатий дольше этого времени (мс) время не считается */
const IDLE_MS = 60_000;
/** Тики копятся в памяти и сохраняются пачкой: persistedState пишет весь JSON целиком */
const FLUSH_EVERY = 20;
/** Сколько авторов и подсайтов хранить: когда накопится больше, остаются самые частые */
const TOP_LIMIT = 200;
/** Сколько последних прочитанных постов помнить, чтобы не считать их повторно */
const RECENT_LIMIT = 1000;

/** Где проведено время; `comments` — открыт пост и прокручен до комментариев */
export type Area = 'feed' | 'post' | 'comments' | 'profile' | 'other';
export type ReactionTarget = 'post' | 'comment';

/** Человек или подсайт с числом событий; id вместе с источником отличает одноимённых */
export interface Counted {
	id: number;
	sourceId: string;
	name: string;
	count: number;
}

export interface Stats {
	/** Дата начала подсчёта, ГГГГ-ММ-ДД */
	since: string;
	seconds: number;
	/** Секунды по дням (ГГГГ-ММ-ДД) */
	days: Record<string, number>;
	/** Секунды по часам суток (0–23) */
	hours: number[];
	byArea: Record<Area, number>;
	byTheme: Record<string, number>;
	postsRead: number;
	/** Ключи последних прочитанных постов: один пост считается один раз, даже после перезагрузки страницы */
	recentPosts: string[];
	authorsRead: Record<string, Counted>;
	subsitesRead: Record<string, Counted>;
	reactions: Record<ReactionTarget, Record<number, number>>;
	authorsReacted: Record<string, Counted>;
	commentsWritten: number;
	favorites: Record<ReactionTarget, number>;
	subscriptions: number;
}

export interface TickContext {
	area: Area;
	theme: string;
	/** Ключ открытого сейчас поста (`<источник>_<id>`), если смотрим пост */
	post?: string;
}

interface Tick {
	day: string;
	hour: number;
	area: Area;
	theme: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const postKey = (post: { id: number; sourceId: string }) => `${post.sourceId}_${post.id}`;

export function emptyStats(date = new Date()): Stats {
	return {
		since: dayKey(date),
		seconds: 0,
		days: {},
		hours: Array(24).fill(0),
		byArea: { feed: 0, post: 0, comments: 0, profile: 0, other: 0 },
		byTheme: {},
		postsRead: 0,
		recentPosts: [],
		authorsRead: {},
		subsitesRead: {},
		reactions: { post: {}, comment: {} },
		authorsReacted: {},
		commentsWritten: 0,
		favorites: { post: 0, comment: 0 },
		subscriptions: 0
	};
}

// --- Чистые функции: берут статистику, возвращают новую ---

const plus = <K extends string | number>(map: Record<K, number>, key: K, by = 1) => ({ ...map, [key]: (map[key] ?? 0) + by });

/** +1 к человеку или подсайту; когда записей слишком много, остаются самые частые */
function bump(map: Record<string, Counted>, who: { id: number; name: string }, sourceId: string): Record<string, Counted> {
	const key = `${sourceId}_${who.id}`;
	const next = { ...map, [key]: { id: who.id, sourceId, name: who.name, count: (map[key]?.count ?? 0) + 1 } };
	if (Object.keys(next).length <= TOP_LIMIT * 1.25) return next;
	return Object.fromEntries(Object.entries(next).sort((a, b) => b[1].count - a[1].count).slice(0, TOP_LIMIT));
}

export function addTick(stats: Stats, tick: Tick): Stats {
	return {
		...stats,
		seconds: stats.seconds + 1,
		days: plus(stats.days, tick.day),
		hours: stats.hours.map((s, hour) => (hour === tick.hour ? s + 1 : s)),
		byArea: plus(stats.byArea, tick.area),
		byTheme: plus(stats.byTheme, tick.theme)
	};
}

export function addRead(stats: Stats, post: Post): Stats {
	return {
		...stats,
		postsRead: stats.postsRead + 1,
		recentPosts: [...stats.recentPosts, postKey(post)].slice(-RECENT_LIMIT),
		authorsRead: bump(stats.authorsRead, post.author, post.sourceId),
		subsitesRead: post.subsite ? bump(stats.subsitesRead, post.subsite, post.sourceId) : stats.subsitesRead
	};
}

/** Реакция 0 — это снятие, его не считаем */
export function addReaction(stats: Stats, target: ReactionTarget, reactionId: number, author?: User, sourceId = 'dtf'): Stats {
	if (!reactionId) return stats;
	return {
		...stats,
		reactions: { ...stats.reactions, [target]: plus(stats.reactions[target], reactionId) },
		authorsReacted: author ? bump(stats.authorsReacted, author, sourceId) : stats.authorsReacted
	};
}

/** Серии дней подряд: текущая (считается, если заходили сегодня или вчера) и самая длинная */
export function dayStreaks(days: Record<string, number>, today = new Date()): { current: number; longest: number } {
	const dayNumber = (key: string) => Date.parse(`${key}T00:00:00Z`) / 86_400_000;
	const numbers = Object.keys(days).filter((key) => days[key] > 0).map(dayNumber).sort((a, b) => a - b);

	let longest = 0;
	let run = 0;
	numbers.forEach((n, i) => {
		run = n - numbers[i - 1] === 1 ? run + 1 : 1;
		longest = Math.max(longest, run);
	});

	const last = numbers.at(-1);
	const current = last !== undefined && dayNumber(dayKey(today)) - last <= 1 ? run : 0;
	return { current, longest };
}

// --- Хранилище и сбор ---

const store = persistedState<Stats>('redtf:data:stats', emptyStats(), 2);
const enabled = () => settings.value.collectStats;

function update(change: (stats: Stats) => Stats) {
	if (enabled()) store.value = change(store.value);
}

let ticks: Tick[] = [];

/** Сохранить накопленные тики; применяются к свежему значению, чтобы не затереть данные другой вкладки */
export function flush() {
	if (ticks.length === 0) return;
	const pending = ticks;
	ticks = [];
	store.value = pending.reduce(addTick, store.value);
}

// Загруженные посты и секунды на них живут в памяти до перезагрузки страницы.
// Уже засчитанные посты помнит само хранилище (recentPosts): иначе каждое обновление страницы накручивало бы счётчик.
const loaded = new Map<string, Post>();
const watched = new Map<string, number>();
const inComments = new Set<string>();

/** PostContent загрузил пост: время на нём пойдёт, когда он станет открытым (см. TickContext.post) */
export function trackPostLoaded(post: Post) {
	loaded.set(postKey(post), post);
}

export function trackPostClosed(post: { id: number; sourceId: string }) {
	const key = postKey(post);
	loaded.delete(key);
	watched.delete(key);
	inComments.delete(key);
}

/** Пустой элемент перед комментариями поста: когда он выше середины окна, пользователь «в комментариях». Возвращает снятие метки. */
export function markCommentsStart(post: { id: number; sourceId: string }, element: HTMLElement) {
	const key = postKey(post);
	if (typeof IntersectionObserver === 'undefined') return () => inComments.delete(key);
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting) inComments.add(key);
			else inComments.delete(key);
		},
		{ rootMargin: '1000000px 0px -50% 0px' }
	);
	observer.observe(element);
	return () => {
		observer.disconnect();
		inComments.delete(key);
	};
}

/** Открытый пост считается «комментариями», если граница комментариев прокручена выше середины окна */
export function withComments(context: TickContext): TickContext {
	return context.area === 'post' && context.post && inComments.has(context.post) ? { ...context, area: 'comments' } : context;
}

/** Один шаг в секунду: время в приложении и время на открытом посте */
export function tick(context: TickContext, now = new Date()) {
	if (!enabled()) return;
	ticks.push({ day: dayKey(now), hour: now.getHours(), area: context.area, theme: context.theme });
	if (ticks.length >= FLUSH_EVERY) flush();

	const post = context.post && !store.value.recentPosts.includes(context.post) ? loaded.get(context.post) : undefined;
	if (!post || !context.post) return;
	const seconds = (watched.get(context.post) ?? 0) + 1;
	watched.set(context.post, seconds);
	if (seconds >= READ_AFTER) update((stats) => addRead(stats, post));
}

/**
 * Запускает секундный счётчик: идёт, только пока вкладка видна и недавно были движения или нажатия.
 * `context` вызывается на каждом шаге. Возвращает остановку.
 */
export function startTracking(context: () => TickContext) {
	let lastInput = Date.now();
	const onInput = () => (lastInput = Date.now());
	const inputEvents = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'];
	for (const name of inputEvents) addEventListener(name, onInput, { passive: true, capture: true });

	const onVisibility = () => document.visibilityState === 'hidden' && flush();
	document.addEventListener('visibilitychange', onVisibility);
	addEventListener('pagehide', flush);

	const timer = setInterval(() => {
		if (document.visibilityState === 'visible' && Date.now() - lastInput < IDLE_MS) tick(withComments(context()));
	}, 1000);

	return () => {
		clearInterval(timer);
		for (const name of inputEvents) removeEventListener(name, onInput, { capture: true });
		document.removeEventListener('visibilitychange', onVisibility);
		removeEventListener('pagehide', flush);
		flush();
	};
}

export const trackReaction = (target: ReactionTarget, reactionId: number, author?: User, sourceId?: string) =>
	update((stats) => addReaction(stats, target, reactionId, author, sourceId));
export const trackComment = () => update((stats) => ({ ...stats, commentsWritten: stats.commentsWritten + 1 }));
export const trackFavorite = (target: ReactionTarget) =>
	update((stats) => ({ ...stats, favorites: plus(stats.favorites, target) }));
export const trackSubscription = () => update((stats) => ({ ...stats, subscriptions: stats.subscriptions + 1 }));

export const statsStore = {
	/** Реактивное значение для экрана настроек */
	get value() {
		return store.value;
	},
	reset() {
		ticks = [];
		store.value = emptyStats();
	}
};
