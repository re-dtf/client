import type { Post } from './types';
import { getLeonardoUrl } from './utils';

const avatar = (subsite: any) =>
	subsite?.avatar?.data?.uuid ? getLeonardoUrl(subsite.avatar.data.uuid, { scale_crop: '64x64' }) : undefined;

/** Встроенный пост DTF (`osnovaEmbed.data`, он же `repostData.data`) → Post для карточки */
export function embedToPost(embed: any): Post {
	return {
		id: embed.original_id,
		sourceId: 'dtf',
		title: embed.title || '',
		blocks: embed.blocks || [],
		author: { id: embed.author?.id || 0, name: embed.author?.name || 'Аноним', avatarUrl: avatar(embed.author) },
		subsite: embed.subsite ? { id: embed.subsite.id, name: embed.subsite.name, avatarUrl: avatar(embed.subsite) } : undefined,
		commentsCount: 0,
		createdAt: new Date((embed.date || 0) * 1000).toISOString()
	};
}
