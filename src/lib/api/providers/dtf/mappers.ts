import type { Comment, CurrentUser, Likes, Notification, Post, Profile, ProfileListItem, Reactions, User } from '../../types';
import { getLeonardoUrl } from '../../utils';

/*
 * Превращают ответы API DTF в наши типы (см. api/types.ts). Ответы приходят без схемы,
 * поэтому сырые данные здесь any, а наружу выходят уже типизированные объекты.
 */

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
		isPlus: !!author?.isPlus
	};
}

export function mapProfileListItem(subsite: any): ProfileListItem {
	return { id: subsite.id, name: subsite.name || 'Аноним', avatarUrl: mapAvatarUrl(subsite, '108x108') };
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

export function mapEntryToPost(entry: any): Post {
	const commentsCount = entry.counters?.comments || 0;
	const unreadCommentsCount = Math.max(0, commentsCount - (entry.commentsSeenCount?.count ?? commentsCount));

	return {
		id: entry.id,
		sourceId: 'dtf',
		title: entry.title || 'Без заголовка',
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
		isSubscribedToComments: entry.subscribedToTreads
	};
}

export function mapComment(item: any, postId: number): Comment {
	return {
		id: item.id,
		sourceId: 'dtf',
		postId,
		author: mapUser(item.author),
		content: item.text || '',
		createdAt: new Date((item.date || Date.now() / 1000) * 1000).toISOString(),
		replyTo: item.replyTo,
		level: item.level,
		isIgnored: item.isIgnored,
		isRemoved: item.isRemoved,
		media: item.media?.length ? item.media.map((m: any) => ({
			type: m.type === 'movie' ? 'movie' : 'image',
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

export function mapNotification(item: any): Notification {
	return {
		id: item.id,
		isRead: item.status !== 1,
		text: item.text || '',
		url: item.url,
		createdAt: new Date((item.date || Date.now() / 1000) * 1000).toISOString(),
		avatarUrl: item.users?.[0]?.avatar_url
	};
}

export function mapProfile(subsite: any): Profile {
	return {
		id: subsite.id,
		sourceId: 'dtf',
		name: subsite.name || 'Аноним',
		description: subsite.description || undefined,
		avatarUrl: mapAvatarUrl(subsite, '200x200'),
		coverUrl: subsite.cover?.data?.uuid ? getLeonardoUrl(subsite.cover.data.uuid, { width: 1920 }) : undefined,
		coverY: subsite.coverY ?? undefined,
		isPlus: !!subsite.isPlus,
		rating: subsite.rating ?? undefined,
		subscribersCount: subsite.counters?.subscribers,
		subscriptionsCount: subsite.counters?.subscriptions,
		isSubscribed: subsite.isSubscribed,
		isSubscribedToNewPosts: subsite.isSubscribedToNewPosts,
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
