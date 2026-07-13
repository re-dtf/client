import type { DtfEditorBlock, DtfEditorEntry } from '$lib/api/types';
import type { OutputData, OutputBlockData } from '@editorjs/editorjs';
import { getLeonardoUrl } from '$lib/api/utils';

type EditorJsToDtfMapper = (block: OutputBlockData) => Pick<DtfEditorBlock, 'type' | 'data'> | null;
type DtfToEditorJsMapper = (block: DtfEditorBlock) => Pick<OutputBlockData, 'type' | 'data'> | null;

const editorJsToDtfRegistry: Record<string, EditorJsToDtfMapper> = {
	paragraph: (block) => ({
		type: 'text',
		data: { text: `<p>${block.data.text}</p>` }
	}),
	header: (block) => ({
		type: 'header',
		data: { style: `h${block.data.level || 2}`, text: block.data.text }
	}),
	list: (block) => ({
		type: 'list',
		data: {
			items: Array.isArray(block.data.items) ? block.data.items.map((item: any) => {
				if (typeof item === 'string') return item;
				if (item && typeof item === 'object') return item.content || item.text || '';
				return String(item);
			}) : [],
			type: block.data.style === 'ordered' ? 'OL' : 'UL'
		}
	}),
	quote: (block) => ({
		type: 'quote',
		data: {
			text: `<p>${block.data.text}</p>`,
			subline1: block.data.caption || ''
		}
	}),
	delimiter: (block) => ({
		type: 'delimiter',
		data: { type: 'default' }
	}),
	code: (block) => ({
		type: 'code',
		data: { text: block.data.code, lang: '' }
	}),
	image: (block) => ({
		type: 'media',
		data: {
			items: [{
				title: block.data.caption || '',
				image: {
					type: block.data.file.type === 'movie' ? 'movie' : 'image',
					data: {
						uuid: block.data.file.uuid || block.data.file.url,
						width: block.data.file.width || 1000,
						height: block.data.file.height || 1000,
						type: block.data.file.type || 'jpg',
						size: block.data.file.size || 0,
						color: block.data.file.color || '000000'
					}
				}
			}]
		}
	}),
	quiz: (block) => ({
		type: 'quiz',
		data: { hash: block.data.hash, title: block.data.title, items: block.data.items }
	}),
	person: (block) => ({
		type: 'person',
		data: {
			title: block.data.title,
			description: block.data.description,
			image: block.data.image ? { type: 'image', data: block.data.image } : undefined
		}
	})
};

const dtfToEditorJsRegistry: Record<string, DtfToEditorJsMapper> = {
	text: (block) => ({
		type: 'paragraph',
		data: { text: block.data.text.replace(/^<p>/, '').replace(/<\/p>$/, '') }
	}),
	header: (block) => ({
		type: 'header',
		data: {
			text: block.data.text,
			level: parseInt(block.data.style?.replace('h', '') || '2', 10)
		}
	}),
	list: (block) => ({
		type: 'list',
		data: {
			style: block.data.type === 'OL' ? 'ordered' : 'unordered',
			items: (block.data.items || []).map((item: string) => ({ content: item, items: [] }))
		}
	}),
	quote: (block) => ({
		type: 'quote',
		data: {
			text: block.data.text.replace(/^<p.*?>/, '').replace(/<\/p>$/, ''),
			caption: block.data.subline1 || ''
		}
	}),
	delimiter: (block) => ({
		type: 'delimiter',
		data: {}
	}),
	code: (block) => ({
		type: 'code',
		data: { code: block.data.text }
	}),
	quiz: (block) => ({
		type: 'quiz',
		data: { hash: block.data.hash, title: block.data.title, items: block.data.items }
	}),
	person: (block) => ({
		type: 'person',
		data: {
			title: block.data.title,
			description: block.data.description,
			image: block.data.image?.data || null
		}
	}),
	media: (block) => {
		if (block.data.items && block.data.items.length > 0) {
			const item = block.data.items[0];
			if (item.image?.data?.uuid) {
				const isVideo = item.image.type === 'movie' || item.image.data.type === 'mp4' || item.image.data.type === 'movie';
				const extension = isVideo ? 'mp4' : 'webp';
				return {
					type: 'image',
					data: {
						file: {
							url: getLeonardoUrl(item.image.data.uuid, { format: extension }),
							uuid: item.image.data.uuid,
							width: item.image.data.width,
							height: item.image.data.height,
							type: item.image.data.type || (isVideo ? 'movie' : 'image'),
							size: item.image.data.size,
							color: item.image.data.color
						},
						caption: item.title || '',
						withBorder: false,
						withBackground: false,
						stretched: false
					}
				};
			}
		}
		return null;
	}
};

export function editorJsToDtf(editorData: OutputData, originalEntry?: Partial<DtfEditorEntry>): DtfEditorEntry {
	const blocks: DtfEditorBlock[] = editorData.blocks.map(convertEditorJsBlockToDtf).filter(Boolean) as DtfEditorBlock[];

	return {
		id: originalEntry?.id || 0,
		user_id: originalEntry?.user_id,
		type: originalEntry?.type || 1,
		subsite_id: originalEntry?.subsite_id || 0,
		title: originalEntry?.title || '',
		is_published: originalEntry?.is_published ?? false,
		is_adult: originalEntry?.is_adult ?? false,
		is_enabled_comments: originalEntry?.is_enabled_comments ?? true,
		is_enabled_likes: originalEntry?.is_enabled_likes ?? true,
		is_enabled_ad: originalEntry?.is_enabled_ad ?? true,
		entry: {
			blocks
		}
	};
}

function convertEditorJsBlockToDtf(block: OutputBlockData): DtfEditorBlock | null {
	const mapper = editorJsToDtfRegistry[block.type];
	if (!mapper) {
		// Fallback for unknown blocks that were preserved
		if (block.data && (block.data as any)._isFallback) {
			return {
				type: (block.data as any)._originalType,
				data: block.data,
				cover: false,
				hidden: block.tunes?.spoiler?.hidden || false,
				anchor: block.tunes?.anchor?.id || ''
			} as DtfEditorBlock;
		}
		return null;
	}

	const mapped = mapper(block);
	if (!mapped) return null;

	return {
		type: mapped.type,
		data: mapped.data,
		cover: false,
		hidden: block.tunes?.spoiler?.hidden || false,
		anchor: block.tunes?.anchor?.id || ''
	} as DtfEditorBlock;
}

export function dtfToEditorJs(dtfEntry: DtfEditorEntry): OutputData {
	if (!dtfEntry.entry || !dtfEntry.entry.blocks) {
		return { blocks: [] };
	}

	const blocks: OutputBlockData[] = dtfEntry.entry.blocks.map(convertDtfBlockToEditorJs).filter(Boolean) as OutputBlockData[];
	return {
		time: Date.now(),
		blocks,
		version: '2.30.0'
	};
}

function convertDtfBlockToEditorJs(block: DtfEditorBlock): OutputBlockData | null {
	const mapper = dtfToEditorJsRegistry[block.type];
	let mapped: Pick<OutputBlockData, 'type' | 'data'> | null = null;
	
	if (mapper) {
		mapped = mapper(block);
	} else {
		// Fallback for unknown blocks so they don't get lost
		mapped = {
			type: 'raw', // Can use 'raw' as a fallback to just store JSON, or invent an 'unknown' type
			data: {
				...block.data,
				_isFallback: true,
				_originalType: block.type
			}
		};
	}

	if (!mapped) return null;

	const tunes: any = {};
	if (block.hidden) {
		tunes.spoiler = { hidden: true };
	}
	if (block.anchor) {
		tunes.anchor = { id: block.anchor };
	}

	return {
		type: mapped.type,
		data: mapped.data,
		tunes
	} as OutputBlockData;
}
