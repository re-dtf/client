/** Куда ведёт ссылка на dtf.ru, если это место есть в приложении */
export type DtfTarget =
	| { type: 'post'; postId: number; commentId?: number; toComments?: boolean }
	| { type: 'profile'; profileId: number };

/**
 * Ссылки DTF: пост — `/<раздел или id автора>/<id>-<слаг>` (`?comment=` — комментарий),
 * профиль — `/id<N>` или `/u/<N>-<имя>`. Остальное (правила, разделы без id) остаётся на dtf.ru.
 */
export function parseDtfUrl(href: string): DtfTarget | undefined {
	let url: URL;
	try {
		url = new URL(href);
	} catch {
		return undefined;
	}
	if (url.protocol !== 'https:' || (url.hostname !== 'dtf.ru' && url.hostname !== 'www.dtf.ru')) return undefined;

	const profile = /^\/(?:id(\d+)\/?|u\/(\d+)(?:-[^/]*)?(?:\/.*)?)$/.exec(url.pathname);
	if (profile) return { type: 'profile', profileId: Number(profile[1] ?? profile[2]) };

	const post = /^\/[^/]+\/(\d+)(?:-[^/]*)?\/?$/.exec(url.pathname);
	if (!post) return undefined;

	const commentId = Number(url.searchParams.get('comment'));
	const toComments = url.hash === '#comments';
	return {
		type: 'post',
		postId: Number(post[1]),
		...(commentId > 0 && { commentId }),
		...(toComments && { toComments: true })
	};
}
