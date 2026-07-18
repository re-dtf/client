import { api } from '$lib/api/index.svelte';
import type { Comment, CommentTreeItem } from '$lib/api/types';
import { buildTree } from './commentUtils';
import { untrack } from 'svelte';
import { PanoramaEngine } from './panoramaEngine.svelte';

export class CommentsLogic {
	getPostId: () => number;
	getSourceId: () => string;
	get postId() { return this.getPostId(); }
	get sourceId() { return this.getSourceId(); }
	
	comments = $state<CommentTreeItem[]>([]);
	flatComments = $state<Comment[]>([]);
	allCommentsMap = $state(new Map<string, CommentTreeItem>());
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

	async loadComments(reset = false) {
		if (this.loading || (!this.hasMore && !reset)) return;
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
			const tree = buildTree(this.flatComments);
			this.comments = tree.roots;
			this.allCommentsMap = tree.map;

			if (result.lastId && result.lastSortingValue) {
				this.cursor = { ...this.cursor, [this.sourceId]: { lastId: result.lastId, lastSortingValue: result.lastSortingValue } };
				this.hasMore = true;
			} else {
				this.hasMore = false;
			}
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
