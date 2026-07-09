import { api } from '$lib/api/index.svelte';
import type { Comment, CommentTreeItem } from '$lib/api/types';
import { buildTree } from './commentUtils';
import { untrack } from 'svelte';
import { PanoramaEngine } from './panoramaEngine.svelte';

export class CommentsLogic {
	getPostId: () => number;
	get postId() { return this.getPostId(); }
	
	comments = $state<CommentTreeItem[]>([]);
	flatComments = $state<Comment[]>([]);
	allCommentsMap = $state(new Map<number, CommentTreeItem>());
	loading = $state(false);
	error = $state<string | null>(null);

	sorting = $state('hotness');
	cursor = $state<{ lastId: number; lastSortingValue: number } | undefined>();
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

	constructor(getPostId: () => number) {
		this.getPostId = getPostId;

		$effect(() => {
			// Отслеживаем только изменение postId
			const currentPostId = this.postId;
			untrack(() => {
				this.loadComments(true);
			});
		});

		$effect(() => {
			const mq = window.matchMedia('(max-width: 768px)');
			untrack(() => {
				this.maxVisualDepth = mq.matches ? 3 : 6;
			});
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
				this.allCommentsMap = new Map();
			}

			const result = await api.getComments(this.postId, this.cursor, this.sorting);
			
			this.flatComments = [...this.flatComments, ...result.items];
			const tree = buildTree(this.flatComments);
			this.comments = tree.roots;
			this.allCommentsMap = tree.map;

			if (result.lastId && result.lastSortingValue) {
				this.cursor = { lastId: result.lastId, lastSortingValue: result.lastSortingValue };
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
