import { browser, dev, version } from '$app/env';
import { resolve } from '$app/paths';

class PwaManager {
	needRefresh = $state(false);
	offlineReady = $state(false);
	newVersion = $state<string | null>(null);
	readonly currentVersion = version;

	private waitingWorker: ServiceWorker | null = null;
	private refreshing = false;
	private initialized = false;
	private fetchingVersion = false;

	init() {
		if (!browser || this.initialized) return;
		if (!('serviceWorker' in navigator)) return;

		// In development mode, service workers interfere with HMR and module loading.
		// Clean up any registered service workers on localhost to avoid stale cache or reload loops.
		if (dev) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				for (const registration of registrations) {
					registration.unregister();
				}
			}).catch(() => {});
			return;
		}

		this.initialized = true;

		// Prevent infinite reload loops on controllerchange
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (this.refreshing) return;
			this.refreshing = true;
			window.location.reload();
		});

		navigator.serviceWorker.ready
			.then((registration) => {
				// If a worker is already waiting when the page loads
				if (registration.waiting) {
					this.handleWaiting(registration.waiting);
				}

				// Detect when an update is found and installed
				registration.addEventListener('updatefound', () => {
					const installing = registration.installing;
					if (!installing) return;

					installing.addEventListener('statechange', () => {
						if (installing.state === 'installed') {
							if (navigator.serviceWorker.controller) {
								// Existing controller -> new version available!
								this.handleWaiting(installing);
							} else {
								// No previous controller -> cached and offline ready
								this.offlineReady = true;
							}
						}
					});
				});

				// Periodically check for updates (e.g. on focus or once per hour)
				window.addEventListener('focus', () => {
					registration.update().catch(() => {});
				});
			})
			.catch((err) => {
				console.warn('[PWA] Service worker registration check failed:', err);
			});
	}

	private async handleWaiting(worker: ServiceWorker) {
		this.waitingWorker = worker;
		this.needRefresh = true;

		if (this.fetchingVersion) return;
		this.fetchingVersion = true;

		// Fetch version endpoint to display the new version number
		try {
			const res = await fetch(resolve(`/api/version.json?t=${Date.now()}`), {
				cache: 'no-store'
			});
			if (res.ok) {
				const data = await res.json();
				if (data?.version) {
					this.newVersion = data.version;
				}
			}
		} catch {
			// Version fetch failed; needRefresh remains true
		} finally {
			this.fetchingVersion = false;
		}
	}

	update() {
		if (this.waitingWorker) {
			this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
		} else {
			window.location.reload();
		}
	}

	dismiss() {
		this.needRefresh = false;
	}
}

export const pwa = new PwaManager();
