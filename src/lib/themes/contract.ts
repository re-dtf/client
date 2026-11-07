import type { Snippet } from 'svelte';
import type { Post, Profile, ProfileListItem, ProfileSorting, SearchSorting, SearchSubsite } from '$lib/api/types';
import type { Period } from '$lib/feed.svelte';

export type SearchTab = 'posts' | 'blogs' | 'topics';

/**
 * Какие компоненты есть у темы и какие пропсы им передают.
 * Каждый лежит в корне папки темы: `<тема>/<Имя>.svelte`.
 *
 * Обязательные: Header, EditorialNews, FeedTabs, Post, Comments, EditorScreen, Spinner, ReloadPrompt.
 * Необязательные (если нет, показывается запасной вариант из ядра): MainLayout, Profile, Notifications, TagPage, SearchPage, DraftsPage, LoginModal.
 * Необязательные без запасного варианта (у темы нет — не показывается): FeedNotice.
 * Форк темы (`extends`) может не иметь ничего из этого и взять недостающее у основы.
 */
export interface ThemeComponents {
	Header: {};
	/** Каркас страницы, в него вставляется содержимое */
	MainLayout: { children?: Snippet };
	EditorialNews: {};
	/** Плашка между постами ленты с просьбой поддержать проект; её показом управляет ядро (`feedNotice`) */
	FeedNotice: {
		/** «Показать позже» */
		onlater: () => void;
		/** «Больше не показывать» */
		onnever: () => void;
	};
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
	/** Записи с тегом `tag` (без `#`): одна страница без подгрузки */
	TagPage: {
		tag: string;
		posts: Post[];
	};
	/** Результаты поиска: записи (с подгрузкой), блоги или темы (только первая страница) */
	SearchPage: {
		query: string;
		tab: SearchTab;
		onTabChange: (tab: SearchTab) => void;
		sorting: SearchSorting;
		onSortingChange: (sorting: SearchSorting) => void;
		posts: Post[];
		subsites: SearchSubsite[];
		/** Сколько всего нашлось на вкладке */
		total?: number;
		/** Первая страница уже пришла */
		loaded: boolean;
		loading: boolean;
		error: unknown;
		hasMore: boolean;
		loadMore: () => void;
		onretry: () => void;
	};
	/** Черновики вошедшего пользователя; открывают их в редакторе */
	DraftsPage: {
		posts: Post[];
		loaded: boolean;
		loading: boolean;
		error: unknown;
		hasMore: boolean;
		loadMore: () => void;
		onretry: () => void;
		onopen: (post: Post) => void;
	};
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
