export function lazyVideo(node: HTMLVideoElement) {
	const observer = new IntersectionObserver((entries) => {
		entries[0].isIntersecting ? node.play()?.catch(() => {}) : node.pause();
	}, { rootMargin: '200px' });

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
