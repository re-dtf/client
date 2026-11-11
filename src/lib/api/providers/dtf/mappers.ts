import type { Comment, CommentEditorState, CurrentUser, IgnoredSubsite, Likes, Notification, NotificationPart, Post, Profile, ProfileListItem, QuizResult, Reactions, SearchSubsite, User } from '../../types';
import { getLeonardoUrl } from '../../utils';
import { embedToPost } from '../../embed';
import { extractWatermark } from '$lib/watermark';

/*
 * Превращают ответы API DTF в наши типы (см. api/types.ts). Ответы приходят без схемы,
 * поэтому сырые данные здесь any, а наружу выходят уже типизированные объекты.
 */

const HTML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
const decodeEntities = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) => HTML_ENTITIES[name]);

export function mapAvatarUrl(subsite: any, size = '64x64'): string | undefined {
	return subsite?.avatar?.url
		|| (subsite?.avatar?.data?.uuid ? getLeonardoUrl(subsite.avatar.data.uuid, { scale_crop: size }) : subsite?.avatar_url);
}

export function mapUser(author: any): User {
	return {
		id: author?.id || 0,
		name: author?.name || 'Аноним',
		avatarUrl: mapAvatarUrl(author),
		description: author?.description || undefined,
		isPlus: !!author?.isPlus,
		isDonationsEnabled: author?.isDonationsEnabled || undefined
	};
}

export function mapProfileListItem(subsite: any): ProfileListItem {
	return { id: subsite.id, name: subsite.name || 'Аноним', avatarUrl: mapAvatarUrl(subsite, '108x108'), isSubscribed: !!subsite.isSubscribed };
}

export function mapIgnoredSubsite(subsite: any): IgnoredSubsite {
	return {
		id: subsite.id,
		name: subsite.name || 'Аноним',
		description: subsite.description || undefined,
		avatarUrl: mapAvatarUrl(subsite, '108x108'),
		// type: 1 — пользователь, 2 — тема
		isCommunity: subsite.type === 2
	};
}

export function mapSearchSubsite(subsite: any): SearchSubsite {
	return {
		id: subsite.id,
		name: subsite.name || 'Аноним',
		description: subsite.description || undefined,
		avatarUrl: mapAvatarUrl(subsite, '108x108'),
		isCommunity: subsite.type === 2,
		subscribersCount: subsite.counters?.subscribers,
		isSubscribed: subsite.isSubscribed
	};
}

/**
 * Фрагмент выдачи поиска (`meta.highlight`) начинается с заголовка записи, а дальше без разделителя идёт текст.
 * Заголовок показывают отдельно, поэтому из начала фрагмента он убирается; если фрагмент им не начинается, остаётся как есть.
 */
export function mapSearchSnippet(highlight: unknown, title: string): string | undefined {
	if (typeof highlight !== 'string' || !highlight) return undefined;
	const wanted = title.trim();
	if (!wanted) return highlight;

	// Символы без разметки: тег — пустое место, `&amp;` — один символ
	const parts = highlight.match(/<[^>]*>|&#?\w+;|[\s\S]/g) ?? [];
	let matched = 0;
	let end = 0;
	for (const [index, part] of parts.entries()) {
		if (matched === wanted.length) break;
		end = index + 1;
		if (part.startsWith('<')) continue;
		const char = part.length > 1 ? HTML_ENTITIES[part.slice(1, -1)] ?? '' : part;
		if (char !== wanted[matched]) return highlight;
		matched++;
	}
	if (matched < wanted.length) return highlight;
	const rest = parts.slice(end).join('').trim();
	return rest.replace(/<\/?mark>/g, '') ? rest : undefined;
}

export function mapLikes(likes: any): Likes | undefined {
	if (!likes) return undefined;
	return {
		count: likes.counterLikes || 0,
		dislikes: likes.counterDislikes ?? undefined,
		// В постах приходит число (1/-1/0), в комментариях — boolean
		myVote: typeof likes.isLiked === 'boolean' ? Number(likes.isLiked) : (likes.isLiked || 0)
	};
}

export function mapReactions(reactions: any): Reactions | undefined {
	if (!reactions) return undefined;
	return { counters: reactions.counters || [], reactionId: reactions.reactionId || 0 };
}

/** Для неизвестного hash сервер отдаёт `items: []`, это тот же пустой опрос */
export function mapQuizResult(result: any): QuizResult {
	const items = Array.isArray(result?.items) ? {} : (result?.items ?? {});
	return { items, userVoted: result?.userVoted ?? null };
}

export function mapCommentEditor(editor: any): CommentEditorState | undefined {
	if (!editor || editor.enabled !== false) return undefined;
	return { enabled: false, text: editor.text || undefined };
}

export function mapEntryToPost(entry: any): Post {
	const commentsCount = entry.counters?.comments || 0;
	const unreadCommentsCount = Math.max(0, commentsCount - (entry.commentsSeenCount?.count ?? commentsCount));

	return {
		id: entry.id,
		sourceId: 'dtf',
		title: entry.title?.trim() || '',
		blocks: entry.blocks || [],
		author: mapUser(entry.author),
		commentsCount,
		unreadCommentsCount: unreadCommentsCount > 0 ? unreadCommentsCount : undefined,
		createdAt: new Date((entry.date || Date.now() / 1000) * 1000).toISOString(),
		subsite: entry.subsite ? {
			id: entry.subsite.id,
			name: entry.subsite.name,
			avatarUrl: mapAvatarUrl(entry.subsite),
			isSubscribed: !!entry.subsite.isSubscribed
		} : undefined,
		url: entry.url,
		likes: mapLikes(entry.likes),
		reactions: mapReactions(entry.reactions),
		favoritesCount: entry.counters?.favorites,
		// hitsCount/views сейчас приходят нулями, просмотры лежат в counters.total
		viewsCount: entry.hitsCount || entry.counters?.views || entry.counters?.total || undefined,
		isPinned: !!entry.isPinned,
		isFavorited: !!entry.isFavorited,
		repostsCount: entry.counters?.reposts || undefined,
		repost: mapRepost(entry),
		isSubscribedToComments: entry.subscribedToTreads,
		commentEditor: mapCommentEditor(entry.commentEditor),
		isDraft: entry.isPublished === false || undefined
	};
}

/** Репост у DTF — ответ на пост: исходный лежит в `repostData` (osnovaEmbed) */
function mapRepost(entry: any): Post['repost'] {
	const embed = entry.repostData?.data;
	const id = entry.repostId || embed?.original_id;
	if (!id) return undefined;
	return { id, original: embed && !embed.isNotAvailable ? embedToPost(embed) : undefined };
}

export function mapComment(item: any, postId: number): Comment {
	const { text: content, isRedtf } = extractWatermark(item.text || '');
	return {
		id: item.id,
		sourceId: 'dtf',
		postId,
		author: mapUser(item.author),
		content,
		isRedtf: isRedtf || undefined,
		deviceSource: item.source || undefined,
		createdAt: new Date((item.date || Date.now() / 1000) * 1000).toISOString(),
		replyTo: item.replyTo,
		level: item.level,
		isIgnored: item.isIgnored,
		isRemoved: item.isRemoved,
		removedByModerator: item.isRemovedByModerator ? true : undefined,
		media: item.media?.length ? item.media.map((m: any) => ({
			type: m.type || 'image',
			data: {
				uuid: m.data?.uuid || '',
				width: m.data?.width || 0,
				height: m.data?.height || 0,
				size: m.data?.size || 0,
				type: m.data?.type || '',
				color: m.data?.color,
				base64preview: m.data?.base64preview,
				duration: m.data?.duration,
				has_audio: m.data?.has_audio
			}
		})) : undefined,
		donation: item.donation || undefined,
		reactions: mapReactions(item.reactions),
		likes: mapLikes(item.likes),
		isPinned: !!item.isPinned,
		isFavorited: !!item.isFavorited,
		postTitle: item.entry?.title
	};
}

/** Из html уведомления остаются только текст, `<b>` и `<a href>`; ссылки — только https */
export function parseNotificationHtml(html: string): NotificationPart[] {
	const parts: NotificationPart[] = [];
	let bold = false;
	let href: string | undefined;

	for (const token of html.split(/(<[^>]*>)/)) {
		if (!token) continue;
		if (token[0] !== '<') {
			parts.push({ text: decodeEntities(token), bold: bold || undefined, href });
		} else if (/^<b[\s>]/i.test(token)) {
			bold = true;
		} else if (/^<\/b>/i.test(token)) {
			bold = false;
		} else if (/^<a[\s>]/i.test(token)) {
			const url = /href="([^"]*)"/i.exec(token)?.[1];
			href = url?.startsWith('https://') ? decodeEntities(url) : undefined;
		} else if (/^<\/a>/i.test(token)) {
			href = undefined;
		}
	}
	return parts;
}

export function mapNotification(item: any): Notification {
	const text = item.text || '';
	const parts = item.html ? parseNotificationHtml(item.html) : [];

	return {
		id: item.id,
		isRead: item.status !== 1,
		text,
		parts: parts.length > 0 ? parts : [{ text }],
		type: item.type || 0,
		icon: item.icon || undefined,
		color: item.color || undefined,
		commentText: item.comment_text || undefined,
		url: item.url,
		createdAt: new Date((item.date || Date.now() / 1000) * 1000).toISOString(),
		avatarUrl: mapAvatarUrl(item.users?.[0]),
		userIds: Array.isArray(item.users) ? item.users.map((user: any) => user?.id).filter(Number.isFinite) : undefined
	};
}

export function mapProfile(subsite: any): Profile {
	const avatar = subsite.avatar?.data;
	return {
		id: subsite.id,
		sourceId: 'dtf',
		name: subsite.name || 'Аноним',
		description: subsite.description || undefined,
		avatarUrl: mapAvatarUrl(subsite, '200x200'),
		avatarMedia: avatar?.uuid && avatar.width && avatar.height ? { uuid: avatar.uuid, width: avatar.width, height: avatar.height } : undefined,
		coverUrl: subsite.cover?.data?.uuid ? getLeonardoUrl(subsite.cover.data.uuid, { width: 1920 }) : undefined,
		coverRaw: subsite.cover?.data?.uuid ? subsite.cover : undefined,
		coverY: subsite.coverY ?? undefined,
		isPlus: !!subsite.isPlus,
		rating: subsite.rating ?? undefined,
		subscribersCount: subsite.counters?.subscribers,
		subscriptionsCount: subsite.counters?.subscriptions,
		isSubscribed: subsite.isSubscribed,
		isSubscribedToNewPosts: subsite.isSubscribedToNewPosts,
		isMuted: subsite.isMuted,
		createdAt: subsite.created ? new Date(subsite.created * 1000).toISOString() : undefined,
		url: subsite.url
	};
}

export function mapCurrentUser(me: any): CurrentUser {
	return {
		id: me.id,
		name: me.name || 'Аноним',
		avatarUrl: mapAvatarUrl(me, '80x80'),
		description: me.description || undefined
	};
}
