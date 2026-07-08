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

export function buildTree(flat: Comment[]): { roots: CommentTreeItem[], map: Map<number, CommentTreeItem> } {
	const map = new Map<number, CommentTreeItem>();
	const roots: CommentTreeItem[] = [];

	for (const c of flat) {
		map.set(c.id, { 
			...c, 
			children: [],
			_formattedDate: formatDate(c.createdAt)
		});
	}

	for (const c of map.values()) {
		if (c.replyTo && map.has(c.replyTo)) {
			map.get(c.replyTo)!.children.push(c);
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
