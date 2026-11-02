import type { Snippet } from 'svelte';
import type { Post, Profile, ProfileListItem, ProfileSorting } from '$lib/api/types';
import type { Period } from '$lib/feed.svelte';

/**
 * Какие компоненты есть у темы и какие пропсы им передают.
 * Каждый лежит в корне папки темы: `<тема>/<Имя>.svelte`.
 *
 * Обязательные: Header, EditorialNews, FeedTabs, Post, Comments, EditorScreen, Spinner, ReloadPrompt.
 * Необязательные (если нет, показывается запасной вариант из ядра): MainLayout, Profile, LoginModal.
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
	Post: { post: Post; preview?: boolean };
	Comments: { postId: number; sourceId?: string; commentsCount?: number; subscribed?: boolean; focusCommentId?: number };
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
	};
	LoginModal: {};
	EditorScreen: { session: any };
	Spinner: { inline?: boolean };
	ReloadPrompt: {};
}
