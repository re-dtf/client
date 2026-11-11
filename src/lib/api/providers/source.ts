import type { ApiProvider, Comment, CommentPatch, CursorData, GetPostsOptions, PaginatedResult, Post } from '../types';
import type { SourceState } from '../sources/types';
import { fetchFromSource } from '../sources/source-fetcher';

/**
 * Провайдер для источника, подключённого по манифесту (см. docs/architecture/data-sources).
 * Каждый метод — запрос к эндпоинту из манифеста. Разрешения тут не проверяются: это делает фасад.
 */
export function createSourceProvider(source: SourceState): ApiProvider {
	const id = source.manifest.id;
	const hasEndpoint = (key: string) => key in source.manifest.endpoints;

	// Источник чужой, поэтому проверяем, что пришёл список, а не что попало
	async function fetchPage<T>(endpoint: string, pathParams: Record<string, string | number>, query: Record<string, string>) {
		const result = await fetchFromSource<PaginatedResult<T>>(source, endpoint, pathParams, query);
		if (!Array.isArray(result?.items)) {
			throw new Error(`Источник '${id}' вернул ответ в неверном формате (${endpoint})`);
		}
		return result;
	}

	function commentsQuery(cursor: CursorData | undefined, sorting: string) {
		const query: Record<string, string> = { sorting };
		if (cursor) query.cursor = JSON.stringify(cursor);
		return query;
	}

	return {
		name: source.manifest.name,

		getPosts(options?: GetPostsOptions) {
			const query: Record<string, string> = {};
			if (options?.cursor) query.cursor = JSON.stringify(options.cursor);
			if (options?.sorting) query.sorting = options.sorting;
			if (options?.pageName) query.page = options.pageName;
			return fetchPage<Post>('getPosts', {}, query);
		},

		getPost(postId: number) {
			return fetchFromSource<Post>(source, 'getPost', { postId });
		},

		getComments(postId: number, cursor?: CursorData, sorting = 'date') {
			return fetchPage<Comment>('getComments', { postId }, commentsQuery(cursor, sorting));
		},

		getReplacedComments: hasEndpoint('getReplacedComments')
			? (postId: number, cursor?: CursorData, sorting = 'date') =>
					fetchPage<Comment>('getReplacedComments', { postId }, commentsQuery(cursor, sorting))
			: undefined,

		getRestoredComments: hasEndpoint('getRestoredComments') || hasEndpoint('getComments')
			? (postId: number, cursor?: CursorData, sorting = 'date') => {
					const ep = hasEndpoint('getRestoredComments') ? 'getRestoredComments' : 'getComments';
					return fetchPage<CommentPatch>(ep, { postId }, commentsQuery(cursor, sorting));
				}
			: undefined,

		reactToComment: hasEndpoint('reactToComment')
			? async (commentId: number, reactionId: number) => {
					await fetchFromSource(source, 'reactToComment', { commentId }, { reactionId: String(reactionId) });
				}
			: undefined
	};
}
