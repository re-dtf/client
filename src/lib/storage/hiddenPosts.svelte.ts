import { persistedState } from './persisted.svelte';
import type { Post } from '$lib/api/types';

/*
 * Журнал постов, скрытых через «Скрыть пост» (чёрный список DTF). У DTF списка скрытых постов нет, а вернуть пост
 * можно, только зная его id, поэтому id и немного контекста храним у себя. Пока журнал только ведётся: интерфейса нет.
 */
export interface HiddenPost {
	id: number;
	authorId?: number;
	authorName?: string;
	hiddenAt: string;
}

/** Старые записи вытесняются, чтобы журнал не рос бесконечно */
const LIMIT = 500;

export const hiddenPostsLog = persistedState<HiddenPost[]>('redtf:data:hidden-posts', []);

export function logHiddenPost(post: Pick<Post, 'id' | 'author'>) {
	const rest = hiddenPostsLog.value.filter((item) => item.id !== post.id);
	hiddenPostsLog.value = [{ id: post.id, authorId: post.author?.id, authorName: post.author?.name, hiddenAt: new Date().toISOString() }, ...rest].slice(0, LIMIT);
}

export function unlogHiddenPost(id: number) {
	hiddenPostsLog.value = hiddenPostsLog.value.filter((item) => item.id !== id);
}
