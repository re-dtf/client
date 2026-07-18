import type { Comment, CommentTreeItem } from '$lib/api/types';

const rtf = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto', style: 'short' });

export function formatDate(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'только что';
	if (mins < 60) return rtf.format(-mins, 'minute');
	const hours = Math.floor(mins / 60);
	if (hours < 24) return rtf.format(-hours, 'hour');
	const days = Math.floor(hours / 24);
	if (days < 7) return rtf.format(-days, 'day');
	return new Date(iso).toLocaleDateString('ru-RU');
}

export function buildTree(flat: Comment[], primarySourceId: string = 'dtf'): { roots: CommentTreeItem[], map: Map<string, CommentTreeItem> } {
	const map = new Map<string, CommentTreeItem>();
	const roots: CommentTreeItem[] = [];
	const replacedMap = new Map<string, string>();

	for (const c of flat) {
		const key = `${c.sourceId}_${c.id}`;
		map.set(key, { 
			...c, 
			children: [],
			_formattedDate: formatDate(c.createdAt)
		});
		if (c.isReplaced && c.originalSourceId) {
			replacedMap.set(`${c.originalSourceId}_${c.id}`, key);
		}
	}

	for (const c of map.values()) {
		if (c.replyTo) {
			let parentKey = `${c.sourceId}_${c.replyTo}`;
			if (!map.has(parentKey)) {
				parentKey = `${primarySourceId}_${c.replyTo}`;
			}
			
			if (!map.has(parentKey) && replacedMap.has(parentKey)) {
				parentKey = replacedMap.get(parentKey)!;
			}
			
			if (map.has(parentKey)) {
				c.parentKey = parentKey;
				map.get(parentKey)!.children.push(c);
			} else {
				roots.push(c);
			}
		} else {
			roots.push(c);
		}
	}

	function enrichCounts(node: CommentTreeItem): number {
		let total = node.children.length;
		for (const child of node.children) total += enrichCounts(child);
		node._totalReplies = total;
		return total;
	}

	for (const root of roots) {
		enrichCounts(root);
	}
	
	return { roots, map };
}
