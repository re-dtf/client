import { SvelteMap } from 'svelte/reactivity';
import type { Post } from '$lib/api/types';
import { api } from '$lib/api/index.svelte';
import { openOverlay } from '$lib/navigation';
import { authStorage } from '$lib/storage/auth.svelte';
import { applyReaction, nextReactionId } from '$lib/reactions';
import { voteReaction } from '$lib/storage/reactions.svelte';
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

	haptics.click();
	const current = withActions(post).reactions;
	const next = nextReactionId(current, reactionId);
	change(post, { reactions: applyReaction(current, next) });

	api.reactToPost(post.id, next, post.author)
		.then((reactions) => change(post, { reactions }))
		.catch((e) => {
			change(post, { reactions: current });
			notify.error(e.message);
		});
	return true;
}

/** Голос «за» или «против» — реакции, которые пользователь выбрал для лайка и дизлайка в настройках */
export const votePost = (post: Post, sign: 1 | -1) => reactToPost(post, voteReaction(sign));

export function toggleFavoritePost(post: Post) {
	if (post.sourceId !== 'dtf' || !ensureLogin()) return;

	haptics.click();
	const { isFavorited, favoritesCount } = withActions(post);
	change(post, { isFavorited: !isFavorited, favoritesCount: Math.max(0, (favoritesCount ?? 0) + (isFavorited ? -1 : 1)) });

	api.setFavorite(post.id, 'post', !isFavorited)
		.then((count) => change(post, { favoritesCount: count }))
		.catch((e) => {
			change(post, { isFavorited, favoritesCount });
			notify.error(e.message);
		});
}

/** «Поделиться»: системное окно, а где его нет — ссылка в буфер */
export function sharePost(post: Pick<Post, 'title' | 'url'>) {
	if (!post.url) return;
	if (navigator.share) navigator.share({ title: post.title, url: post.url }).catch(() => {});
	else navigator.clipboard?.writeText(post.url).catch(() => {});
}

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
		notified.set(id, !was);

		try {
			await api.setSubscriptionNotifications(id, !was);
		} catch (e) {
			notified.set(id, was);
			notify.error((e as Error).message);
		}
	}
};
