import { browser, dev, version } from '$app/env';
import { resolve } from '$app/paths';
import { isNative } from '$lib/capacitor';

class PwaManager {
	needRefresh = $state(false);
	offlineReady = $state(false);
	newVersion = $state<string | null>(null);
	readonly currentVersion = version;

	get changesUrl(): string {
		const repo = 'https://github.com/re-dtf/client';
		if (!this.newVersion) return `${repo}/commits/dev`;

		const extractRef = (v: string) => {
			if (v.includes('-')) {
				return v.split('-').pop();
			}
			return `v${v}`;
		};

		const fromRef = extractRef(this.currentVersion);
		const toRef = extractRef(this.newVersion);

		if (fromRef && toRef && fromRef !== toRef) {
			return `${repo}/compare/${fromRef}...${toRef}`;
		}

		if (toRef) {
			return `${repo}/commit/${toRef}`;
		}

		return `${repo}/commits/dev`;
	}

	private waitingWorker: ServiceWorker | null = null;
	private refreshing = false;
	private initialized = false;
	private fetchingVersion = false;
	private dismissed = false;
	private dismissedVersion: string | null = null;

	init() {
		if (!browser || this.initialized) return;
		if (!('serviceWorker' in navigator)) return;
		if (isNative()) return;

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

		// Only reload on controllerchange if the page was already controlled.
		// On the first visit (when controller is initially null), clients.claim() takes control,
		// and we MUST NOT reload the page while the user is using it (e.g. welcome screen).
		let hasController = Boolean(navigator.serviceWorker.controller);

		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (!hasController) {
				hasController = true;
				return;
			}
			if (this.refreshing) return;
			this.refreshing = true;
			window.location.reload();
		});

		navigator.serviceWorker.ready
			.then((registration) => {
				// If a worker is already waiting when the page loads
				if (registration.waiting) {
					this.handleWaiting(registration.waiting);
				} else if (registration.installing) {
					const installing = registration.installing;
					installing.addEventListener('statechange', () => {
						if (installing.state === 'installed') {
							if (navigator.serviceWorker.controller) {
								this.handleWaiting(installing);
							} else {
								this.offlineReady = true;
							}
						}
					});
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

				// Periodically check for updates on window focus (throttled to at most once per 60s)
				let lastFocusCheck = 0;
				window.addEventListener('focus', () => {
					const now = Date.now();
					if (now - lastFocusCheck > 60_000) {
						lastFocusCheck = now;
						registration.update().catch(() => {});
					}
				});

				// Also trigger an update check on startup
				registration.update().catch(() => {});
			})
			.catch((err) => {
				console.warn('[PWA] Service worker registration check failed:', err);
			});
	}

	private async handleWaiting(worker: ServiceWorker) {
		this.waitingWorker = worker;

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

		// Don't re-show the prompt if user already dismissed this specific version in this session
		if (this.dismissed && this.dismissedVersion === this.newVersion) {
			return;
		}

		this.dismissed = false;
		this.needRefresh = true;
	}

	onUpdateAction?: (immediate: boolean) => Promise<void> | void;

	async update() {
		if (this.onUpdateAction) {
			await this.onUpdateAction(true);
			return;
		}
		if (this.waitingWorker) {
			this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
		} else {
			window.location.reload();
		}
	}

	async dismiss() {
		if (this.onUpdateAction) {
			await this.onUpdateAction(false);
		}
		this.needRefresh = false;
		this.dismissed = true;
		this.dismissedVersion = this.newVersion;
	}
}

export const pwa = new PwaManager();
