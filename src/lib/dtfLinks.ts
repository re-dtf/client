/** Куда ведёт ссылка на dtf.ru, если это место есть в приложении */
export type DtfTarget =
	| { type: 'post'; postId: number; commentId?: number; toComments?: boolean; anchor?: string }
	| { type: 'profile'; profileId: number }
	| { type: 'tag'; tag: string };

/**
 * Ссылки DTF:
 * - пост: `/<раздел или id автора>/<id>-<слаг>`, `/s/<раздел>/<id>-<слаг>`, `/<id>-<слаг>` или `/post/<id>`
 *   (параметры `?comment=`, `#comment-`, `#comments` — комментарии, `#...` — якорные блоки поста),
 * - профиль: `/id<N>`, `/u/<N>-<имя>`, `/s/<N>`,
 * - тег: `/tag/<тег>` (и `/tag/<тег>/popular`).
 * Остальное (правила, разделы без id) остаётся на dtf.ru.
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
		!/^(?:(?:www|m)\.)?dtf\.ru$/i.test(url.hostname)
	) {
		return undefined;
	}

	const tag = /^\/tag\/([^/]+)(?:\/popular)?\/?$/i.exec(url.pathname);
	if (tag) {
		const name = safeDecode(tag[1]).replace(/^#/, '');
		return name ? { type: 'tag', tag: name } : undefined;
	}

	const profile = /^\/(?:id(\d+)\/?|(?:u|s)\/(\d+)(?:-[^/]*)?(?:\/(?:entries|comments|favorites|subscribers|subscriptions)?)?\/?)$/i.exec(url.pathname);
	if (profile) return { type: 'profile', profileId: Number(profile[1] ?? profile[2]) };

	const post = /^\/(?:(?:post|(?:s\/)?[^/]+)\/)?(\d+)(?:-[^/]*)?\/?$/i.exec(url.pathname);
	if (!post) return undefined;

	const commentParam = url.searchParams.get('comment');
	const commentHash = /^#(?:comment[=-]|comments?-)(\d+)$/i.exec(url.hash);
	const commentId = Number(commentParam || commentHash?.[1]);
	const toComments = url.hash === '#comments' || url.hash === '#comment' || url.searchParams.get('to') === 'comments';
	const rawAnchor = !commentId && !toComments && url.hash.length > 1 ? url.hash.slice(1) : undefined;
	const anchor = rawAnchor ? safeDecode(rawAnchor) : undefined;
	return {
		type: 'post',
		postId: Number(post[1]),
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

/** Внутренний путь приложения для найденной цели DTF */
export function dtfTargetToPath(target: DtfTarget): string {
	if (target.type === 'tag') return `/tag/${encodeURIComponent(target.tag)}`;
	if (target.type === 'post') {
		const hash = target.toComments
			? '#comments'
			: target.anchor
				? `#${encodeURIComponent(target.anchor)}`
				: '';
		const query = target.commentId ? `?comment=${target.commentId}` : '';
		return `/post/${target.postId}${query}${hash}`;
	}
	return `/u/${target.profileId}`;
}

/** Превратить ссылку на dtf.ru во внутренний путь, если это пост или профиль */
export function dtfUrlToPath(href: string): string | undefined {
	const target = parseDtfUrl(href);
	return target ? dtfTargetToPath(target) : undefined;
}
