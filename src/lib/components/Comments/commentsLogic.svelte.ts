import { api } from '$lib/api/index.svelte';
import type { Comment, CommentTreeItem } from '$lib/api/types';
import { cacheComments, peekComments } from '$lib/commentsCache';
import { buildTree, formatDate } from './commentUtils';
import { untrack } from 'svelte';
import { PanoramaEngine } from './panoramaEngine.svelte';

export class CommentsLogic {
	getPostId: () => number;
	getSourceId: () => string;
	get postId() { return this.getPostId(); }
	get sourceId() { return this.getSourceId(); }
	
	comments = $state.raw<CommentTreeItem[]>([]);
	flatComments = $state.raw<Comment[]>([]);
	allCommentsMap = $state.raw(new Map<string, CommentTreeItem>());
	loading = $state(false);
	error = $state<string | null>(null);

	sorting = $state('hotness');
	cursor = $state<Record<string, { lastId: number; lastSortingValue: number }> | undefined>();
	hasMore = $state(true);

	observerElement = $state<HTMLElement | undefined>();
	viewportElement = $state<HTMLElement | undefined>();

	engine = new PanoramaEngine();

	// Preview state
	previewVisible = $state(false);
	previewComment = $state<CommentTreeItem | null>(null);
	previewX = $state(0);
	previewY = $state(0);

	maxVisualDepth = $state(6);

	constructor(getPostId: () => number, getSourceId: () => string = () => 'dtf') {
		this.getPostId = getPostId;
		this.getSourceId = getSourceId;

		$effect(() => {
			// Отслеживаем изменение postId и sourceId
			const currentPostId = this.postId;
			const currentSourceId = this.sourceId;
			untrack(() => {
				this.loadComments(true);
			});
		});

		$effect(() => {
			const mq = window.matchMedia('(max-width: 768px)');
			this.maxVisualDepth = mq.matches ? 3 : 6;
			
			const mqListener = (e: MediaQueryListEvent) => {
				this.maxVisualDepth = e.matches ? 3 : 6;
			};
			mq.addEventListener('change', mqListener);
			return () => mq.removeEventListener('change', mqListener);
		});

		$effect(() => {
			if (this.viewportElement) {
				this.engine.mount(this.viewportElement);
				return () => {
					this.engine.destroy();
				};
			}
		});

		$effect(() => {
			if (this.observerElement) {
				const observer = new IntersectionObserver(
					(entries) => {
						if (entries[0].isIntersecting) {
							this.loadComments();
						}
					},
					{ rootMargin: '200px' }
				);
				observer.observe(this.observerElement);
				return () => observer.disconnect();
			}
		});
	}

	showPreview = (comment: CommentTreeItem, x: number, y: number) => {
		this.previewComment = comment;
		this.previewX = x;
		this.previewY = y;
		this.previewVisible = true;
	}

	hidePreview = () => {
		this.previewVisible = false;
	}

	/** Путь от корня до комментария по реактивному дереву (правки по нему сразу видны) */
	pathTo(key: string, nodes: CommentTreeItem[] = this.comments, path: CommentTreeItem[] = []): CommentTreeItem[] | undefined {
		for (const node of nodes) {
			const next = [...path, node];
			if (`${node.sourceId}_${node.id}` === key) return next;
			const found = this.pathTo(key, node.children, next);
			if (found) return found;
		}
	}

	/** Точечно обновляет узел в $state.raw-дереве и триггерит пересчёт плоских строк */
	patchComment(key: string, patch: Partial<CommentTreeItem>) {
		const path = this.pathTo(key);
		if (!path) return;
		const idx = path.length - 1;
		const next: CommentTreeItem = { ...path[idx], ...patch };
		const siblings = idx === 0 ? this.comments : path[idx - 1].children;
		const pos = siblings.indexOf(path[idx]);
		if (pos !== -1) siblings[pos] = next;
		this.allCommentsMap.set(key, next);
		this.comments = [...this.comments];
	}

	/** Вставляет только что отправленный комментарий в дерево, не пересобирая его: локальные правки остальных не теряются */
	addComment(comment: Comment) {
		this.flatComments = [...this.flatComments, comment];
		const item: CommentTreeItem = { ...comment, children: [], _formattedDate: formatDate(comment.createdAt), _totalReplies: 0 };
		const path = comment.replyTo ? this.pathTo(`${comment.sourceId}_${comment.replyTo}`) : undefined;
		// Без записи в карту новый комментарий нельзя ни найти для ответа, ни отредактировать
		this.allCommentsMap.set(`${comment.sourceId}_${comment.id}`, item);

		if (!path) {
			this.comments = [...this.comments, item];
		} else {
			const parent = path[path.length - 1];
			parent.children = [...parent.children, item];
			for (const node of path) node._totalReplies = (node._totalReplies ?? 0) + 1;
			this.patchComment(`${parent.sourceId}_${parent.id}`, {});
		}

		cacheComments(this.postId, this.sourceId, this.sorting, {
			flatComments: this.flatComments,
			cursor: this.cursor,
			hasMore: this.hasMore
		});
	}

	/** Текст комментария после правки */
	updateComment(comment: Comment) {
		this.flatComments = this.flatComments.map((c) => (c.sourceId === comment.sourceId && c.id === comment.id ? comment : c));
		this.patchComment(`${comment.sourceId}_${comment.id}`, { content: comment.content, media: comment.media });

		cacheComments(this.postId, this.sourceId, this.sorting, {
			flatComments: this.flatComments,
			cursor: this.cursor,
			hasMore: this.hasMore
		});
	}

	async loadComments(reset = false) {
		if (this.loading || (!this.hasMore && !reset)) return;

		if (reset) {
			const cached = peekComments(this.postId, this.sourceId, this.sorting);
			if (cached) {
				this.cursor = cached.cursor;
				this.flatComments = [...cached.flatComments];
				const tree = buildTree(this.flatComments, this.sourceId);
				this.comments = tree.roots;
				this.allCommentsMap = tree.map;
				this.hasMore = cached.hasMore;
				this.error = null;
				return;
			}
		}

		this.loading = true;
		this.error = null;

		try {
			if (reset) {
				this.cursor = undefined;
				this.flatComments = [];
				this.comments = [];
				this.allCommentsMap = new Map<string, CommentTreeItem>();
			}

			const result = await api.getComments(this.postId, this.sourceId, this.cursor, this.sorting);
			
			this.flatComments = [...this.flatComments, ...result.items];
			const tree = buildTree(this.flatComments, this.sourceId);
			this.comments = tree.roots;
			this.allCommentsMap = tree.map;

			if (result.cursors && Object.keys(result.cursors).length > 0) {
				this.cursor = result.cursors;
				this.hasMore = true;
			} else {
				this.hasMore = false;
			}

			cacheComments(this.postId, this.sourceId, this.sorting, {
				flatComments: this.flatComments,
				cursor: this.cursor,
				hasMore: this.hasMore
			});
		} catch (e) {
			this.error = (e as Error).message;
		} finally {
			this.loading = false;
		}
	}

	onSortingChange = (event: Event) => {
		this.sorting = (event.target as HTMLSelectElement).value;
		this.loadComments(true);
	}
}
