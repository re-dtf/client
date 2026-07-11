let observer: IntersectionObserver;

export function lazyVideo(node: HTMLVideoElement) {
	observer ??= new IntersectionObserver((entries) => {
		for (const entry of entries) {
			const target = entry.target as HTMLVideoElement;
			entry.isIntersecting ? target.play()?.catch(() => {}) : target.pause();
		}
	}, { rootMargin: '200px' });

	observer.observe(node);

	return {
		destroy: () => observer.unobserve(node)
	};
}
