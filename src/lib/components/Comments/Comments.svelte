<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/index.svelte';
	import type { Comment, CommentTreeItem } from '$lib/api/types';
	import CommentItem from './CommentItem.svelte';
	import CommentPreview from './CommentPreview.svelte';
	import Spinner from '../Spinner.svelte';
	import { commentSettings } from '$lib/storage/commentSettings.svelte';

	let { postId, commentsCount = 0 } = $props<{ postId: number; commentsCount?: number }>();

	let comments = $state<CommentTreeItem[]>([]);
	let flatComments = $state<Comment[]>([]);
	let allCommentsMap = $state(new Map<number, CommentTreeItem>());
	let loading = $state(false);
	let error = $state<string | null>(null);

	let sorting = $state('hotness');
	let cursor = $state<{ lastId: number; lastSortingValue: number } | undefined>();
	let hasMore = $state(true);

	let observerElement: HTMLElement;
	let viewportElement: HTMLElement | undefined = $state();

	// Preview state
	let previewVisible = $state(false);
	let previewComment = $state<CommentTreeItem | null>(null);
	let previewX = $state(0);
	let previewY = $state(0);

	function showPreview(comment: CommentTreeItem, x: number, y: number) {
		previewComment = comment;
		previewX = x;
		previewY = y;
		previewVisible = true;
	}

	function hidePreview() {
		previewVisible = false;
	}

	// Dynamic visual depth max depending on screen width
	let maxVisualDepth = $state(6);

	// Tree builder
	function buildTree(flat: Comment[]): CommentTreeItem[] {
		const map = new Map<number, CommentTreeItem>();
		const roots: CommentTreeItem[] = [];

		for (const c of flat) {
			map.set(c.id, { ...c, children: [] });
		}

		for (const c of map.values()) {
			if (c.replyTo && map.has(c.replyTo)) {
				map.get(c.replyTo)!.children.push(c);
			} else {
				roots.push(c);
			}
		}
		
		allCommentsMap = map;
		return roots;
	}

	async function loadComments(reset = false) {
		if (loading || (!hasMore && !reset)) return;
		loading = true;
		error = null;

		try {
			if (reset) {
				cursor = undefined;
				flatComments = [];
				comments = [];
				allCommentsMap = new Map();
			}

			const result = await api.getComments(postId, cursor, sorting);

			flatComments = [...flatComments, ...result.items];
			comments = buildTree(flatComments);

			if (result.lastId && result.lastSortingValue) {
				cursor = { lastId: result.lastId, lastSortingValue: result.lastSortingValue };
				hasMore = true;
			} else {
				hasMore = false;
			}
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	function onSortingChange(event: Event) {
		sorting = (event.target as HTMLSelectElement).value;
		loadComments(true);
	}

	// Auto-pan logic
	let panAnimationFrame: number;
	
	let targetScrollLeft = 0;
	let exactScrollLeft: number | undefined;
	let isPanning = false;
	let lastScrollY = -1;
	let checkInterval: ReturnType<typeof setInterval>;

	function panLoop() {
		if (!viewportElement || commentSettings.value.nestingMode !== 'autopan') {
			isPanning = false;
			return;
		}

		const currentScrollY = window.scrollY;
		let targetUpdated = false;

		// Only recalculate the complex DOM bounds if the user actually scrolled vertically
		if (currentScrollY !== lastScrollY) {
			lastScrollY = currentScrollY;
			targetUpdated = true;
			
			const items = document.getElementsByClassName('comment-item');
			const centerY = window.innerHeight * 0.4;
			const radius = window.innerHeight * 0.4; // Weight falls off towards screen edges
			
			let sumWeight = 0;
			let sumDepthWeight = 0;
			
			// Continuously blend depths of all comments visible in the viewport
			for (let i = 0; i < items.length; i++) {
				const item = items[i] as HTMLElement;
				const body = item.firstElementChild as HTMLElement; // .comment-body-container
				if (!body) continue;

				const rect = body.getBoundingClientRect();
				
				// Fast culling
				if (rect.bottom < centerY - radius || rect.top > centerY + radius) continue;

				const bodyCenterY = rect.top + rect.height / 2;
				const distance = Math.abs(bodyCenterY - centerY);
				
				if (distance < radius) {
					// Smoothstep weight curve for buttery continuous transitions
					const x = 1 - distance / radius;
					const weight = x * x * (3 - 2 * x);
					
					const depth = parseInt(item.getAttribute('data-depth') || '0', 10);
					
					// Calculate how much depth this comment actually needs to fit on screen
					const viewportWidth = viewportElement.clientWidth;
					const indentPx = 24;
					const keepVisiblePx = 48;
					const paddingRight = 32;
					
					// Calculate what the current intended depth is (stable anchor)
					const anchorDepth = (targetScrollLeft + keepVisiblePx) / indentPx;
					
					let minDepth = depth + (rect.width + keepVisiblePx + paddingRight - viewportWidth) / indentPx;
					const maxDepth = depth;
					
					// Sanity clamp minDepth so it doesn't exceed maxDepth
					minDepth = Math.min(minDepth, maxDepth);
					
					// The comment votes for the current depth, but clamps it to its own visibility bounds
					let effectiveDepth = Math.max(minDepth, Math.min(maxDepth, anchorDepth));
					
					// We never pan LESS than 0 overall
					effectiveDepth = Math.max(0, effectiveDepth);

					sumWeight += weight;
					sumDepthWeight += effectiveDepth * weight;
				}
			}

			if (sumWeight > 0) {
				const targetDepth = sumDepthWeight / sumWeight;
				const indentPx = 24; 
				const keepVisiblePx = 48; 
				targetScrollLeft = Math.max(0, targetDepth * indentPx - keepVisiblePx);
			}
		}

		let currentScrollX = viewportElement.scrollLeft;
		
		// Resync exact scroll if user manually scrolled horizontally
		if (exactScrollLeft !== undefined && Math.abs(currentScrollX - exactScrollLeft) > 1.5) {
			exactScrollLeft = currentScrollX;
		}
		if (exactScrollLeft === undefined) {
			exactScrollLeft = currentScrollX;
		}

		const diff = targetScrollLeft - exactScrollLeft;
		
		if (Math.abs(diff) > 0.5) {
			exactScrollLeft += diff * 0.15;
			viewportElement.scrollLeft = exactScrollLeft;
			panAnimationFrame = requestAnimationFrame(panLoop);
		} else {
			viewportElement.scrollLeft = targetScrollLeft;
			exactScrollLeft = targetScrollLeft;
			if (!targetUpdated) {
				isPanning = false; // Sleep to save CPU
			} else {
				panAnimationFrame = requestAnimationFrame(panLoop); // Keep watching scroll
			}
		}
	}

	function handleScroll() {
		if (commentSettings.value.nestingMode === 'autopan' && !isPanning) {
			isPanning = true;
			panLoop();
		}
	}

	onMount(() => {
		loadComments(true);

		const mq = window.matchMedia('(max-width: 768px)');
		maxVisualDepth = mq.matches ? 3 : 6;
		mq.addEventListener('change', (e) => {
			maxVisualDepth = e.matches ? 3 : 6;
		});

		// A slow heartbeat to force recalculations on layout shifts (resizes, expanding comments)
		checkInterval = setInterval(() => {
			if (!viewportElement) return;
			
			const mainWidth = Math.max(200, viewportElement.clientWidth - 64);
			viewportElement.style.setProperty('--comment-main-width', `${mainWidth}px`);

			if (commentSettings.value.nestingMode === 'autopan' && !isPanning) {
				lastScrollY = -1; // Force recalculation
				isPanning = true;
				panLoop();
			}
		}, 300);

		window.addEventListener('scroll', handleScroll, { passive: true });

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadComments();
				}
			},
			{ rootMargin: '200px' }
		);

		if (observerElement) observer.observe(observerElement);

		return () => {
			observer.disconnect();
			clearInterval(checkInterval);
			cancelAnimationFrame(panAnimationFrame);
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<CommentPreview
	visible={previewVisible}
	comment={previewComment}
	x={previewX}
	y={previewY}
/>

<div class="comments-section" class:autopan={commentSettings.value.nestingMode === 'autopan'}>
	<div class="header">
		<h3>
			<span class="header-icon">💬</span>
			Комментарии
			{#if commentsCount > 0}
				<span class="count">{commentsCount}</span>
			{/if}
		</h3>
		<select value={sorting} onchange={onSortingChange}>
			<option value="date">Свежие</option>
			<option value="hotness">Популярные</option>
		</select>
	</div>

	{#if comments.length === 0 && loading}
		<div class="initial-loading">
			<Spinner inline={true} />
			Загрузка комментариев...
		</div>
	{:else if comments.length === 0 && !loading && !error}
		<p class="empty">Пока нет комментариев</p>
	{/if}

	<div 
		class="comments-viewport" 
		bind:this={viewportElement}
	>
		<div class="comments-list">
			{#each comments as comment (comment.id)}
				<CommentItem
					{comment}
					depth={0}
					{maxVisualDepth}
					allComments={allCommentsMap}
					nestingMode={commentSettings.value.nestingMode}
					onShowPreview={showPreview}
					onHidePreview={hidePreview}
				/>
			{/each}
		</div>
	</div>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div bind:this={observerElement} class="observer-target">
		{#if loading && comments.length > 0}
			<div class="loading">Загрузка...</div>
		{/if}
	</div>
</div>

<style>
	.comments-section {
		margin-top: 40px;
		padding: 24px;
		background: var(--comment-section-bg, transparent);
		border: 1px solid var(--comment-section-border, transparent);
		border-radius: var(--comment-radius, 0px);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.header h3 {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.4em;
		color: var(--comment-header-color, inherit);
	}

	.header-icon {
		font-size: 1.1em;
	}

	.count {
		font-size: 0.75em;
		color: var(--comment-count-color, #888);
		background: var(--comment-breadcrumb-bg, rgba(0,0,0,0.05));
		padding: 2px 8px;
		border-radius: 12px;
		font-weight: 500;
	}

	select {
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid var(--comment-select-border, #ccc);
		background: var(--comment-select-bg, transparent);
		color: var(--comment-select-color, inherit);
		font-weight: 500;
		cursor: pointer;
		outline: none;
	}

	.comments-viewport {
		position: relative;
		width: 100%;
	}

	.comments-section.autopan {
		/* width is dynamically applied in JS directly to the viewport */
	}

	.comments-section.autopan .comments-viewport {
		overflow-x: hidden;
		scroll-behavior: auto; /* Handled by JS lerp */
		mask-image: linear-gradient(to right, black 95%, transparent 100%);
		-webkit-mask-image: linear-gradient(to right, black 95%, transparent 100%);
	}
	
	.comments-section.autopan .comments-list {
		width: max-content;
		padding-right: 32px;
	}

	.empty {
		opacity: 0.7;
		font-style: italic;
		text-align: center;
		padding: 40px;
	}

	.initial-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 40px;
		opacity: 0.7;
	}

	.error {
		color: #d32f2f;
		margin-top: 10px;
		padding: 12px;
		background: rgba(211, 47, 47, 0.1);
		border-radius: 8px;
		text-align: center;
	}

	.observer-target {
		height: 40px;
		margin-top: 20px;
		display: flex;
		justify-content: center;
		align-items: center;
		opacity: 0.7;
	}
</style>
