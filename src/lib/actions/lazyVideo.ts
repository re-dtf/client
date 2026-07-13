let observer: IntersectionObserver | null = null;
let observedCount = 0;

export function lazyVideo(node: HTMLVideoElement) {
	if (!observer) {
		observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				const target = entry.target as HTMLVideoElement;
				entry.isIntersecting ? target.play()?.catch(() => {}) : target.pause();
			}
		}, { rootMargin: '200px' });
	}

	observer.observe(node);
	observedCount++;

	return {
		destroy: () => {
			if (observer) {
				observer.unobserve(node);
				observedCount--;
				if (observedCount <= 0) {
					observer.disconnect();
					observer = null;
					observedCount = 0;
				}
			}
		}
	};
}
