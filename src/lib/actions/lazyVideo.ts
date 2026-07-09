export function lazyVideo(node: HTMLVideoElement) {
	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				// Play if visible
				const playPromise = node.play();
				if (playPromise !== undefined) {
					playPromise.catch(() => {
						// Autoplay prevented by browser, safe to ignore
					});
				}
			} else {
				// Pause if hidden to save CPU
				node.pause();
			}
		});
	}, { rootMargin: '200px' });

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
