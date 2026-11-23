import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { resolve } from '$app/paths';
import type { Post } from '$lib/api/types';
import { api } from '$lib/api/index.svelte';
import { getPostPath, getPostShareUrl, getProfilePath, openOverlay } from '$lib/navigation';
import { isNative } from '$lib/capacitor';
import { contextMenu, type ContextMenuItem, type ContextMenuPayload } from '$lib/contextMenu.svelte';
import { currentUser } from '$lib/api/currentUser.svelte';
import { authStorage } from '$lib/storage/auth.svelte';
import { addIgnoredTag, filterSettings, hideUser, isUserHidden, normalizeTag, removeIgnoredTag, unhideUser } from '$lib/storage/filter.svelte';
import { logHiddenPost, unlogHiddenPost } from '$lib/storage/hiddenPosts.svelte';
import { getRemark } from '$lib/storage/remarks.svelte';
import { pinSubsite, unpinSubsite, type PinnedSubsite } from '$lib/storage/pinnedSubsites.svelte';
import { ruleOf } from '$lib/storage/reactions.svelte';
import { applyReaction, nextReactionId, nextVoteReactionId } from '$lib/reactions';
import { notify } from './ui/notify.svelte';
import { haptics } from '$lib/haptics';

/** Действия вошедшего пользователя: без входа открывают окно входа и возвращают false */
export function ensureLogin(): boolean {
	if (authStorage.isAuthenticated) return true;
	openOverlay({ type: 'login' });
	return false;
}

/** «Создать» в шапке и «Новая запись» в панели: редактор открывается только вошедшему */
export function startWriting() {
	if (ensureLogin()) openOverlay({ type: 'editor' });
}

/*
 * Посты в ленте лежат в $state.raw, поэтому менять их на месте нельзя. Свои реакции и закладки пост
 * хранит здесь: компоненты читают пост через withActions(), и карточка в ленте с открытым постом
 * остаются согласованными.
 */
type PostChanges = Partial<Pick<Post, 'reactions' | 'isFavorited' | 'favoritesCount'>>;

const changes = new SvelteMap<string, PostChanges>();
const key = (post: Pick<Post, 'id' | 'sourceId'>) => `${post.sourceId}_${post.id}`;

export function withActions(post: Post): Post {
	const own = changes.get(key(post));
	return own ? { ...post, ...own } : post;
}

function change(post: Post, own: PostChanges) {
	changes.set(key(post), { ...changes.get(key(post)), ...own });
}

/** Поставить реакцию (или снять, если она уже стоит). Счётчики меняются сразу, при ошибке откатываются. Возвращает false, если реакция не принята. */
export function reactToPost(post: Post, reactionId: number): boolean {
	if (post.sourceId !== 'dtf' || !ensureLogin()) return false;

	const current = withActions(post).reactions;
	const next = nextReactionId(current, reactionId);
	if (!next) haptics.soft();
	else if (ruleOf(next).kind === 'negative') haptics.dislike();
	else haptics.like();
	change(post, { reactions: applyReaction(current, next) });

	api.reactToPost(post.id, next, post.author)
		.then((reactions) => change(post, { reactions }))
		.catch((e) => {
			change(post, { reactions: current });
			notify.error(e.message);
		});
	return true;
}

/** Голос «за» или «против» — реакции, которые пользователь выбрал для лайка и дизлайка в настройках (или снятие уже поставленной реакции того же знака) */
export const votePost = (post: Post, sign: 1 | -1) =>
	reactToPost(post, nextVoteReactionId(withActions(post).reactions, sign));

/** Кнопка закладки поста. Как у DTF, ошибку не показывает: закладка просто возвращается в прежнее состояние */
export function toggleFavoritePost(post: Post) {
	if (post.sourceId !== 'dtf' || !ensureLogin()) return;

	const { isFavorited, favoritesCount } = withActions(post);
	if (isFavorited) haptics.soft();
	else haptics.click();
	change(post, { isFavorited: !isFavorited, favoritesCount: Math.max(0, (favoritesCount ?? 0) + (isFavorited ? -1 : 1)) });

	api.setFavorite(post.id, 'post', !isFavorited)
		.then((count) => change(post, { favoritesCount: count }))
		.catch(() => change(post, { isFavorited, favoritesCount }));
}

/*
 * Скрытые через меню «⋯» посты и авторы. Сервер уберёт их из лент при следующей загрузке,
 * а до тех пор карточки прячутся здесь.
 */
const hiddenPosts = new SvelteSet<string>();
const deletedPosts = new SvelteSet<string>();
// Чёрный список по id пользователя или темы: профиль и меню поста видят одно состояние
const mutedSubsites = new SvelteMap<number, boolean>();

export const isSubsiteMuted = (id: number, initial = false) => mutedSubsites.get(id) ?? initial;

export const isPostHidden = (post: Pick<Post, 'id' | 'sourceId' | 'author'>) =>
	deletedPosts.has(key(post)) || hiddenPosts.has(key(post)) || (post.author ? mutedSubsites.get(post.author.id) === true : false);

/** Убирает удалённый пост или черновик из всех открытых списков текущей сессии */
export function markPostDeleted(post: Pick<Post, 'id' | 'sourceId'>) {
	deletedPosts.add(key(post));
}

/** «Скрыть пост»: карточка пропадает сразу, при ошибке возвращается; в тосте «Отменить», других способов вернуть пост у DTF нет */
export function hidePost(post: Pick<Post, 'id' | 'sourceId' | 'author'>) {
	if (post.sourceId !== 'dtf' || !ensureLogin()) return;

	hiddenPosts.add(key(post));
	logHiddenPost(post);
	api.setPostIgnored(post.id, true)
		.then(() => notify.success('Пост скрыт', { label: 'Отменить', onclick: () => restorePost(post) }))
		.catch((e) => {
			hiddenPosts.delete(key(post));
			unlogHiddenPost(post.id);
			notify.error(e.message);
		});
}

function restorePost(post: Pick<Post, 'id' | 'sourceId' | 'author'>) {
	hiddenPosts.delete(key(post));
	unlogHiddenPost(post.id);
	api.setPostIgnored(post.id, false)
		.then(() => notify.success('Пост вернулся'))
		.catch((e) => {
			hiddenPosts.add(key(post));
			logHiddenPost(post);
			notify.error(e.message);
		});
}

/** Чёрный список DTF: скрыть пользователя или тему и вернуть обратно. Состояние меняется сразу, при ошибке откатывается */
export function setSubsiteMuted(subsite: { id: number; name: string }, muted: boolean) {
	if (!ensureLogin()) return;

	const was = mutedSubsites.get(subsite.id);
	mutedSubsites.set(subsite.id, muted);
	api.setSubsiteIgnored(subsite.id, muted)
		.then(() => notify.success(muted ? `${subsite.name} заблокирован` : `${subsite.name} разблокирован`, muted ? remarkOffer(subsite) : undefined))
		.catch((e) => {
			if (was === undefined) mutedSubsites.delete(subsite.id);
			else mutedSubsites.set(subsite.id, was);
			notify.error(e.message);
		});
}

/*
 * Два способа убрать человека. «Скрыть» работает только у нас: его записи, комментарии и уведомления не показываются,
 * а он ничего не замечает. «Заблокировать» — чёрный список DTF: человек не может комментировать наши записи,
 * это видят все наши устройства.
 */
export type AuthorAction = 'hide_author' | 'unhide_author' | 'block_author' | 'unblock_author' | 'remark_author';

/** Окно заметки о пользователе: открывается отовсюду (меню, чип, тост), рисует его один раз `RemarkEditor` в макете темы */
let remarkTarget = $state.raw<{ id: number; name: string } | null>(null);
export const remarkEditor = {
	get target() {
		return remarkTarget;
	},
	open: (user: { id: number; name: string }) => (remarkTarget = { id: user.id, name: user.name }),
	close: () => (remarkTarget = null)
};

/** Тост «скрыт / заблокирован» предлагает записать, почему: пока причина свежа. Если заметка уже есть, предлагать нечего */
const remarkOffer = (user: { id: number; name: string }) =>
	getRemark(user.id) ? undefined : { label: 'Добавить заметку', onclick: () => remarkEditor.open(user) };

/**
 * Пункты меню «⋯» для автора записи, комментария или профиля. `noun` — как назвать человека в подписи пункта
 * («автора» в записи, пусто в профиле). Блокировка нужна вошедшему: без входа есть только локальное скрытие
 */
export function authorMenuItems(author: { id: number }, { noun = ' автора', blocked = false } = {}) {
	const hidden = isUserHidden(author.id);
	const muted = isSubsiteMuted(author.id, blocked);
	const loggedIn = !!currentUser.value;
	return [
		{
			value: 'remark_author' as const,
			label: getRemark(author.id) ? 'Изменить заметку' : 'Добавить заметку',
			icon: 'v_pen',
			hint: 'Личная пометка рядом с именем: видите только вы'
		},
		hidden
			? { value: 'unhide_author' as const, label: `Показывать${noun}`, icon: 'v_eye', hint: 'Снова показывать его записи, комментарии и уведомления' }
			: { value: 'hide_author' as const, label: `Скрыть${noun}`, icon: 'v_eye', hint: 'Только у вас: его записи, комментарии и уведомления не будут показываться. Он об этом не узнает' },
		...(loggedIn
			? [
					muted
						? { value: 'unblock_author' as const, label: `Разблокировать${noun}`, icon: 'v_ban', hint: 'Убрать из чёрного списка DTF: он снова сможет комментировать ваши записи' }
						: { value: 'block_author' as const, label: `Заблокировать${noun}`, icon: 'v_ban', hint: 'Чёрный список DTF: он не сможет комментировать ваши записи, а его записи и комментарии вы не увидите' }
				]
			: [])
	];
}

export function runAuthorAction(action: AuthorAction, author: { id: number; name: string }) {
	if (action === 'remark_author') remarkEditor.open(author);
	else if (action === 'hide_author' && hideUser(author.id, author.name)) notify.success(`${author.name} скрыт`, remarkOffer(author));
	else if (action === 'unhide_author') {
		unhideUser(author.id);
		notify.success(`${author.name} снова виден`);
	} else if (action === 'block_author') setSubsiteMuted(author, true);
	else if (action === 'unblock_author') setSubsiteMuted(author, false);
}

/** Название тега для заголовка: первая буква заглавная, как у DTF */
export const tagTitle = (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1);

/** Пункт меню «⋯» страницы тега: «Не показывать тег» кладёт его в локальный чёрный список (он работает и без входа) */
export function tagMenuItems(tag: string) {
	const ignored = filterSettings.value.tags.includes(normalizeTag(tag));
	return [{ value: 'ignore' as const, label: ignored ? 'Показывать тег' : 'Не показывать тег', icon: 'v_eye', hint: 'Только у вас: записи с этим тегом не будут показываться' }];
}

export function toggleIgnoredTag(tag: string) {
	if (filterSettings.value.tags.includes(normalizeTag(tag))) {
		removeIgnoredTag(tag);
		notify.success(`Тег #${tagTitle(tag)} снова показывается`);
	} else {
		addIgnoredTag(tag);
		notify.success(`Тег #${tagTitle(tag)} скрыт`);
	}
}

/** Своя запись или комментарий: людей-«других» только здесь можно скрыть и заблокировать */
export const isAnotherDtfUser = (sourceId: string, authorId: number) => sourceId === 'dtf' && authorId !== currentUser.value?.id;

/** «Сделать репост»: у DTF репост — ответ на пост, его пишут в редакторе */
export function repostPost(post: Pick<Post, 'id' | 'sourceId'>) {
	if (post.sourceId !== 'dtf' || !ensureLogin()) return;
	openOverlay({ type: 'editor', data: { repostId: post.id } });
}

/** «Поделиться» ссылкой: системное окно, а где его нет — ссылка в буфер */
export async function shareLink(url: string, title?: string) {
	if (typeof navigator !== 'undefined' && navigator.share) {
		try {
			await navigator.share(title ? { title, url } : { url });
			return;
		} catch (e: unknown) {
			if (e instanceof Error && e.name === 'AbortError') return;
		}
	}

	if (typeof navigator !== 'undefined' && navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(url);
			notify.success('Ссылка скопирована');
		} catch {
			notify.error('Не удалось скопировать ссылку');
		}
	}
}

export const sharePost = (post: Pick<Post, 'id' | 'sourceId'> & { title?: string; url?: string }) =>
	shareLink(getPostShareUrl(post, undefined, typeof location !== 'undefined' ? location.href : 'http://localhost'), post.title);

/*
 * Подписки на пользователей и темы. Состояние живёт по id, поэтому подписка из карточки поста видна
 * в других постах того же автора. Исходное состояние приходит снаружи (из поста или профиля).
 */
const subscribed = new SvelteMap<number, boolean>();
const notified = new SvelteMap<number, boolean>();
let userSubscriptionsLoaded = false;
let userSubscriptionsPromise: Promise<void> | undefined;

export const subscriptions = {
	isSubscribed: (id: number, initial = false) => subscribed.get(id) ?? initial,
	isNotified: (id: number, initial = false) => notified.get(id) ?? initial,

	/** Загружает подписки текущего пользователя, чтобы верно показывать статус в списках */
	async loadMine(userId: number) {
		if (userSubscriptionsLoaded) return;
		userSubscriptionsPromise ??= api
			.getProfileSubscriptions(userId)
			.then((items) => {
				for (const item of items) {
					if (!subscribed.has(item.id)) {
						subscribed.set(item.id, true);
					}
				}
				userSubscriptionsLoaded = true;
			})
			.catch(() => {
				userSubscriptionsPromise = undefined;
			});
		return userSubscriptionsPromise;
	},

	clear() {
		subscribed.clear();
		notified.clear();
		userSubscriptionsLoaded = false;
		userSubscriptionsPromise = undefined;
	},

	async toggle(id: number, initial = false) {
		if (!ensureLogin()) return;

		const was = subscribed.get(id) ?? initial;
		if (was) haptics.soft();
		else haptics.click();
		subscribed.set(id, !was);
		// После отписки колокольчик гаснет вместе с подпиской
		if (was) notified.set(id, false);

		try {
			await api.setSubscription(id, !was);
		} catch (e) {
			subscribed.set(id, was);
			notify.error((e as Error).message);
		}
	},

	async toggleNotifications(id: number, initial = false) {
		if (!ensureLogin()) return;

		const was = notified.get(id) ?? initial;
		if (was) haptics.soft();
		else haptics.tick();
		notified.set(id, !was);

		try {
			await api.setSubscriptionNotifications(id, !was);
		} catch (e) {
			notified.set(id, was);
			notify.error((e as Error).message);
		}
	}
};

/**
 * Контекстное меню (ПКМ, удержание) пользователя или подсайта: везде, где показано его имя или аватар.
 * Базовые пункты общие, `extra` дописывает пункты места (например, «Открепить» в боковой панели).
 */
export function profileMenu(subsite: { id: number; name: string }, extra: ContextMenuItem[] = []): ContextMenuPayload {
	const href = resolve(getProfilePath(subsite.id) as any);
	const fullUrl = typeof location !== 'undefined' ? new URL(href, location.href).href : href;

	const items: ContextMenuItem[] = [
		{
			id: 'open',
			label: 'Открыть профиль',
			icon: 'v_person',
			action: () => openOverlay({ type: 'profile', data: { profileId: subsite.id } })
		}
	];
	if (!isNative()) {
		items.push({
			id: 'open-tab',
			label: 'Открыть в новой вкладке',
			icon: 'v_external',
			href,
			target: '_blank',
			rel: 'noopener noreferrer'
		});
	}
	items.push({
		id: 'copy-link',
		label: 'Копировать ссылку',
		icon: 'v_link',
		async action() {
			try {
				await navigator.clipboard.writeText(fullUrl);
				notify.success('Ссылка скопирована');
			} catch {
				notify.error('Не удалось скопировать ссылку');
			}
		}
	});

	if (subsite.id !== currentUser.value?.id) {
		items.push({
			id: 'remark',
			label: getRemark(subsite.id) ? 'Изменить заметку' : 'Добавить заметку',
			icon: 'v_pen',
			separatorBefore: true,
			action() {
				remarkEditor.open(subsite);
			}
		});
	}

	return {
		title: subsite.name,
		label: `Действия с ${subsite.name}`,
		items: [...items, ...extra]
	};
}

/** `{@attach profileContextMenu(user)}` на ссылке или блоке с пользователем */
export const profileContextMenu = (subsite: { id: number; name: string }) => contextMenu(() => profileMenu(subsite));

/**
 * Меню пользователя на всей «шапке автора»: аватар, имя, бейджи, время и пустые промежутки между ними.
 * Вешается на контейнер шапки. Если шапка — часть блока с текстом, `lastRow` — селектор последнего её элемента:
 * всё ниже его нижней границы (текст, медиа, кнопки) остаётся с обычным меню браузера.
 * `user` вернёт пусто, когда автора нет (удалённый комментарий): меню не откроется.
 */
export function authorZoneMenu(user: () => { id: number; name: string } | undefined, lastRow?: string) {
	return (node: HTMLElement) =>
		contextMenu((e) => {
			const author = user();
			if (!author) return null;
			if (lastRow) {
				const y = (e as MouseEvent | undefined)?.clientY;
				const last = node.querySelector(lastRow)?.getBoundingClientRect().bottom;
				if (y === undefined || last === undefined || y < node.getBoundingClientRect().top || y > last) return null;
			}
			return profileMenu(author);
		})(node);
}

/** Контекстное меню закреплённого подсайта в боковой панели */
export const pinnedSubsiteMenu = (subsite: PinnedSubsite) =>
	profileMenu(subsite, [
		{
			id: 'unpin',
			label: 'Открепить',
			icon: 'ui_pin',
			danger: true,
			separatorBefore: true,
			action() {
				const index = unpinSubsite(subsite.id);
				if (index < 0) return;
				notify.success('Откреплено от бокового меню', {
					label: 'Отменить',
					onclick: () => {
						if (!pinSubsite(subsite, index)) notify.error('Не удалось вернуть подсайт в боковое меню');
					}
				});
			}
		}
	]);
