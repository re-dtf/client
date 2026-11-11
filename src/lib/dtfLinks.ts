/** Куда ведёт ссылка на dtf.ru или redtf.org, если это место есть в приложении */
export type DtfTarget =
	| { type: 'feed'; feed?: 'popular' | 'new' | 'my' }
	| { type: 'post'; postId: number; commentId?: number; toComments?: boolean; anchor?: string; sourceId?: string }
	| { type: 'profile'; profileId: number | string }
	| { type: 'tag'; tag: string }
	| { type: 'notifications' };

/**
 * Ссылки DTF и reDTF:
 * - лента: `/`, `/popular`, `/new`, `/my`,
 * - уведомления: `/notifications`,
 * - пост: `/<раздел или id автора>/<id>-<слаг>`, `/s/<раздел>/<id>-<слаг>`, `/<id>-<слаг>` или `/post/<id>`
 *   (параметры `?comment=`, `#comment-`, `#comments`, суффикс `/comments` — комментарии, `#...` — якорные блоки поста),
 * - профиль: `/id<N>`, `/u/<N>-<имя>`, `/s/<N>`, `/<короткое имя>` или `/s/<короткое имя>`,
 * - тег: `/tag/<тег>` (и `/tag/<тег>/popular`).
 * Служебные страницы остаются на dtf.ru / redtf.org.
 */
export function parseDtfUrl(href: string): DtfTarget | undefined {
	let url: URL;
	try {
		url = new URL(href, 'https://dtf.ru');
	} catch {
		return undefined;
	}
	if (
		(url.protocol !== 'https:' && url.protocol !== 'http:') ||
		!/^(?:www\.)?(?:dtf\.ru|redtf\.org)$/i.test(url.hostname)
	) {
		return undefined;
	}

	const tag = /^\/tag\/([^/]+)(?:\/popular)?\/?$/i.exec(url.pathname);
	if (tag) {
		const name = safeDecode(tag[1]).replace(/^#/, '');
		return name ? { type: 'tag', tag: name } : undefined;
	}

	if (url.pathname === '/' || url.pathname === '') {
		const feedParam = url.searchParams.get('feed');
		if (feedParam === 'new' || feedParam === 'my' || feedParam === 'popular') {
			return { type: 'feed', feed: feedParam };
		}
		return { type: 'feed' };
	}

	const feedPath = /^\/(popular|new|my)\/?$/i.exec(url.pathname);
	if (feedPath) {
		return { type: 'feed', feed: feedPath[1].toLowerCase() as 'popular' | 'new' | 'my' };
	}

	if (url.pathname === '/notifications' || url.pathname === '/notifications/') {
		return { type: 'notifications' };
	}

	const profile = /^\/(?:id(\d+)\/?|(?:u|s)\/(\d+)(?:-[^/]*)?(?:\/(?:entries|comments|favorites|subscribers|subscriptions)?)?\/?)$/i.exec(url.pathname);
	if (profile) return { type: 'profile', profileId: Number(profile[1] ?? profile[2]) };

	const post = /^\/(?:(?:post|(?:s\/)?[^/]+)\/)?(\d+)(?:-[^/]*)?(?:\/(comments)?)?\/?$/i.exec(url.pathname);
	if (!post) {
		const alias = /^\/(?:(?:u|s)\/)?([a-z][a-z0-9_-]*)(?:\/(?:entries|comments|favorites|subscribers|subscriptions))?\/?$/i.exec(url.pathname);
		if (!alias || /^(?:rules|terms|privacy|settings|account|auth|login|logout|write|editor|drafts|bookmarks|search|discovery|store|m|tag|u|s|post|popular|new|my|notifications|about|contacts|help|ads|advertising|vacancies|rating)$/i.test(alias[1])) return undefined;
		return { type: 'profile', profileId: alias[1] };
	}

	const commentParam = url.searchParams.get('comment');
	const commentHash = /^#(?:comment[=-]|comments?-)(\d+)$/i.exec(url.hash);
	const commentId = Number(commentParam || commentHash?.[1]);
	const toComments =
		post[2] === 'comments' ||
		url.hash === '#comments' ||
		url.hash === '#comment' ||
		url.searchParams.get('to') === 'comments';
	const rawAnchor = !commentId && !toComments && url.hash.length > 1 ? url.hash.slice(1) : undefined;
	const anchor = rawAnchor ? safeDecode(rawAnchor) : undefined;
	const sourceParam = url.searchParams.get('source');
	const sourceId = sourceParam || undefined;
	return {
		type: 'post',
		postId: Number(post[1]),
		...(sourceId && { sourceId }),
		...(commentId > 0 && { commentId }),
		...(toComments && !commentId && { toComments: true }),
		...(anchor && { anchor })
	};
}

export function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/** Внутренний путь приложения для найденной цели DTF или reDTF */
export function dtfTargetToPath(target: DtfTarget): string {
	if (target.type === 'feed') return target.feed && target.feed !== 'popular' ? `/?feed=${target.feed}` : '/';
	if (target.type === 'notifications') return '/notifications';
	if (target.type === 'tag') return `/tag/${encodeURIComponent(target.tag)}`;
	if (target.type === 'post') {
		const hash = target.toComments
			? '#comments'
			: target.anchor
				? `#${encodeURIComponent(target.anchor)}`
				: '';
		const queryParams = new URLSearchParams();
		if (target.commentId) queryParams.set('comment', String(target.commentId));
		if (target.sourceId && target.sourceId !== 'dtf') queryParams.set('source', target.sourceId);
		const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
		return `/post/${target.postId}${query}${hash}`;
	}
	return `/u/${encodeURIComponent(target.profileId)}`;
}

/** Превратить ссылку на dtf.ru или redtf.org во внутренний путь, если это пост или профиль */
export function dtfUrlToPath(href: string): string | undefined {
	const target = parseDtfUrl(href);
	return target ? dtfTargetToPath(target) : undefined;
}
