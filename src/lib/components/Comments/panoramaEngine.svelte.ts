import { commentSettings } from '$lib/storage/commentSettings.svelte';

export class PanoramaEngine {
	panVisibleItems = new Set<HTMLElement>();
	panObserver: IntersectionObserver | undefined = $state();
	
	private viewportElement: HTMLElement | undefined;
	private panAnimationFrame: number = 0;
	
	private targetScrollLeft = 0;
	private exactScrollLeft: number | undefined;
	private isPanning = false;
	private lastScrollY = -1;
	private lastObservedWidth = -1;
	private resizeObserver: ResizeObserver | undefined;
	
	// Object pool for GC optimization
	private visibleComments: Array<{ weight: number, minDepth: number, maxDepth: number }> = [];

	constructor() {
		// Ensure method is bound correctly
		this.handleScroll = this.handleScroll.bind(this);
	}

	mount(viewport: HTMLElement) {
		this.viewportElement = viewport;

		this.panObserver = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) this.panVisibleItems.add(entry.target as HTMLElement);
				else this.panVisibleItems.delete(entry.target as HTMLElement);
			}
		}, { rootMargin: '200px 0px' });

		this.resizeObserver = new ResizeObserver((entries) => {
			if (!this.viewportElement) return;
			const width = entries[0].contentRect.width;
			
			// Prevent infinite ResizeObserver loop caused by scrollbar toggling
			if (Math.abs(width - this.lastObservedWidth) < 2) return;
			this.lastObservedWidth = width;

			const mainWidth = Math.max(200, width - 64);
			this.viewportElement.style.setProperty('--comment-main-width', `${mainWidth}px`);

			if (commentSettings.value.nestingMode === 'autopan' && !this.isPanning) {
				const prevTarget = this.targetScrollLeft;
				this.lastScrollY = -1; // Force recalculation
				this.isPanning = true;
				this.panLoop();
				// If target didn't meaningfully change, don't animate — just snap
				if (Math.abs(this.targetScrollLeft - prevTarget) < 0.5) {
					this.isPanning = false;
					cancelAnimationFrame(this.panAnimationFrame);
				}
			}
		});
		
		this.resizeObserver.observe(this.viewportElement);
		window.addEventListener('scroll', this.handleScroll, { passive: true });
	}

	destroy() {
		if (this.panObserver) this.panObserver.disconnect();
		if (this.resizeObserver) this.resizeObserver.disconnect();
		cancelAnimationFrame(this.panAnimationFrame);
		window.removeEventListener('scroll', this.handleScroll);
	}

	handleScroll() {
		if (commentSettings.value.nestingMode === 'autopan' && !this.isPanning) {
			this.isPanning = true;
			this.panLoop();
		}
	}

	private panLoop = () => {
		if (!this.viewportElement || commentSettings.value.nestingMode !== 'autopan') {
			this.isPanning = false;
			return;
		}

		const currentScrollY = window.scrollY;
		let targetUpdated = false;

		// Only recalculate the complex DOM bounds if the user actually scrolled vertically
		if (currentScrollY !== this.lastScrollY) {
			this.lastScrollY = currentScrollY;
			targetUpdated = true;
			
			const centerY = window.innerHeight * 0.4;
			const radius = window.innerHeight * 0.4; // Weight falls off towards screen edges
			
			let visibleCount = 0;
			
			// Continuously blend depths of all comments visible in the viewport
			for (const item of this.panVisibleItems) {
				if (!item.isConnected) {
					this.panVisibleItems.delete(item);
					continue;
				}

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
					
					const viewportWidth = this.viewportElement.clientWidth;
					const indentPx = 24;
					const keepVisiblePx = 48;
					const paddingRight = 32;
					
					let minDepth = depth + (rect.width + keepVisiblePx + paddingRight - viewportWidth) / indentPx;
					const maxDepth = depth;
					
					// Sanity clamp minDepth so it doesn't exceed maxDepth
					minDepth = Math.min(minDepth, maxDepth);
					
					if (!this.visibleComments[visibleCount]) {
						this.visibleComments[visibleCount] = { weight, minDepth, maxDepth };
					} else {
						this.visibleComments[visibleCount].weight = weight;
						this.visibleComments[visibleCount].minDepth = minDepth;
						this.visibleComments[visibleCount].maxDepth = maxDepth;
					}
					visibleCount++;
				}
			}

			if (visibleCount > 0) {
				const indentPx = 24; 
				const keepVisiblePx = 48; 
				
				// Use a single pass weighted average. The rAF loop acts as the iterative solver over time.
				let currentT = (this.targetScrollLeft + keepVisiblePx) / indentPx;
				let sumW = 0;
				let sumD = 0;
				
				for (let i = 0; i < visibleCount; i++) {
					const c = this.visibleComments[i];
					let vote = Math.max(c.minDepth, Math.min(c.maxDepth, currentT));
					vote = Math.max(0, vote); // Never pan less than 0
					sumW += c.weight;
					sumD += vote * c.weight;
				}
				
				if (sumW > 0) {
					currentT = sumD / sumW;
				}
				
				// Round to whole pixels to prevent subpixel text blurriness when settling
				this.targetScrollLeft = Math.round(Math.max(0, currentT * indentPx - keepVisiblePx));
			}
		}

		if (this.exactScrollLeft === undefined) {
			this.exactScrollLeft = this.targetScrollLeft;
		}

		const diff = this.targetScrollLeft - this.exactScrollLeft;
		const listEl = this.viewportElement.querySelector('.comments-list') as HTMLElement | null;
		
		if (Math.abs(diff) > 0.5) {
			this.exactScrollLeft += diff * 0.18;
			// transform supports sub-pixel rendering (no integer rounding like scrollLeft)
			if (listEl) listEl.style.transform = `translateX(${-this.exactScrollLeft}px)`;
			cancelAnimationFrame(this.panAnimationFrame);
			this.panAnimationFrame = requestAnimationFrame(this.panLoop);
		} else {
			this.exactScrollLeft = this.targetScrollLeft;
			if (listEl) listEl.style.transform = `translateX(${-this.exactScrollLeft}px)`;
			if (!targetUpdated) {
				this.isPanning = false; // Sleep to save CPU
			} else {
				cancelAnimationFrame(this.panAnimationFrame);
				this.panAnimationFrame = requestAnimationFrame(this.panLoop); // Keep watching scroll
			}
		}
	};
}
