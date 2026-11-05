import type { Snippet } from 'svelte';
import type { Post, Profile, ProfileListItem, ProfileSorting } from '$lib/api/types';
import type { Period } from '$lib/feed.svelte';

/**
 * Какие компоненты есть у темы и какие пропсы им передают.
 * Каждый лежит в корне папки темы: `<тема>/<Имя>.svelte`.
 *
 * Обязательные: Header, EditorialNews, FeedTabs, Post, Comments, EditorScreen, Spinner, ReloadPrompt.
 * Необязательные (если нет, показывается запасной вариант из ядра): MainLayout, Profile, Notifications, LoginModal.
 * Форк темы (`extends`) может не иметь ничего из этого и взять недостающее у основы.
 */
export interface ThemeComponents {
	Header: {};
	/** Каркас страницы, в него вставляется содержимое */
	MainLayout: { children?: Snippet };
	EditorialNews: {};
	FeedTabs: {
		currentFeed: 'popular' | 'new' | 'my';
		switchFeed: (feed: 'popular' | 'new' | 'my') => void;
		/** Период «Популярного» (`now` — обычное) и переход на другой */
		period: Period;
		switchPeriod: (period: Period) => void;
	};
	Post: { post: Post; preview?: boolean; evictMedia?: boolean };
	Comments: {
		postId: number;
		sourceId?: string;
		commentsCount?: number;
		subscribed?: boolean;
		/** Комментарий, к которому прокрутить (из ссылки или уведомления); комментарии догружаются, пока он не найдётся */
		focusCommentId?: number;
		/** Повторный фокус на комментарий (например, при повторном клике по тому же уведомлению) */
		focusNonce?: number;
		/** Поиск `focusCommentId` закончился (нашли или не нашли): вызывается до прокрутки, чтобы экран успел показать список */
		onfocused?: () => void;
	};
	Profile: {
		profile: Profile;
		posts: Post[];
		sorting: ProfileSorting;
		hasMore: boolean;
		loadingPosts: boolean;
		postsError: string | null;
		subscribersPromise: Promise<ProfileListItem[]>;
		subscriptionsPromise: Promise<ProfileListItem[]>;
		onSortingChange: (sorting: ProfileSorting) => void;
		loadMore: () => void;
		/** Профиль изменился (своя аватарка или обложка): показать новый вместо старого */
		onProfileUpdate?: (profile: Profile) => void;
	};
	/** Страница уведомлений (оверлей notifications) */
	Notifications: {};
	LoginModal: {};
	NetworkErrorModal: {
		error: unknown;
		onretry?: () => void;
		onclose?: () => void;
	};
	EditorScreen: { session: any };
	/** `inline` — маленький, в потоке; `block` — заглушка на месте содержимого экрана (если тема так умеет); без них — обычный на своём месте */
	Spinner: { inline?: boolean; block?: boolean };
	ReloadPrompt: {};
}
