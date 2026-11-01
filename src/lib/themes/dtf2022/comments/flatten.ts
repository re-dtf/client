import type { CommentTreeItem } from '$lib/api/types';

/** Вертикальная линия ветки слева от комментария */
export interface ThreadLine {
	/** Ветка продолжается ниже этого комментария */
	border: boolean;
	/** Дуга к аватару — только у последней линии и только при реальной вложенности */
	arc: boolean;
	/** Ключ комментария, чьи ответы образуют эту ветку (по клику ветка сворачивается) */
	owner: string;
}

export interface CommentRow {
	key: string;
	comment: CommentTreeItem;
	/** Визуальный уровень, с 1 */
	level: number;
	lines: ThreadLine[];
	parent?: CommentTreeItem;
	/** Сколько ответов скрыто, если ветка свёрнута */
	hiddenReplies: number;
}

export const commentKey = (c: { sourceId: string; id: number }) => `${c.sourceId}_${c.id}`;

/**
 * Дерево → плоский список, как рисует DTF: у комментария на уровне N есть N−1 линий.
 * Глубже maxDepth ответы не сдвигаются, а встают на последний уровень без дуги.
 */
export function flattenComments(roots: CommentTreeItem[], maxDepth: number, collapsed: Set<string>): CommentRow[] {
	const rows: CommentRow[] = [];

	// chain[k] — есть ли у узла цепочки на глубине k следующие соседи (ветка его родителя идёт дальше);
	// owners[i] — предок на глубине i
	function walk(nodes: CommentTreeItem[], depth: number, continues: boolean[], owners: string[], parent?: CommentTreeItem) {
		nodes.forEach((comment, index) => {
			const key = commentKey(comment);
			const chain = [...continues, index < nodes.length - 1];
			const visual = Math.min(depth, maxDepth);
			const isCollapsed = collapsed.has(key) && comment.children.length > 0;

			rows.push({
				key,
				comment,
				level: visual + 1,
				// линия i — ветка предка глубины i, она продолжается, если у его потомка в цепочке есть соседи
				lines: chain.slice(1, visual + 1).map((border, i) => ({
					border,
					arc: i === visual - 1 && depth <= maxDepth,
					owner: owners[i]
				})),
				parent,
				hiddenReplies: isCollapsed ? (comment._totalReplies ?? comment.children.length) : 0
			});

			if (!isCollapsed) walk(comment.children, depth + 1, chain, [...owners, key], comment);
		});
	}

	walk(roots, 0, [], []);
	return rows;
}
