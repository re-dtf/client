import { browser, version } from '$app/env';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { isNative } from '$lib/capacitor';
import { pwa } from '$lib/pwa.svelte';

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'up-to-date' | 'error';

/**
 * Сравнивает две строки версий (семантические или с префиксами v/суффиксами).
 * Возвращает true, если remote новее current.
 */
export function isNewerVersion(remote: string, current: string): boolean {
	const clean = (v: string) => v.replace(/^v/, '').trim();
	const r = clean(remote);
	const c = clean(current);
	if (!r || !c || r === c) return false;

	const [rCore, rPre] = r.split('-');
	const [cCore, cPre] = c.split('-');

	const rParts = rCore.split('.').map((p) => parseInt(p, 10));
	const cParts = cCore.split('.').map((p) => parseInt(p, 10));

	const len = Math.max(rParts.length, cParts.length);
	for (let i = 0; i < len; i++) {
		const rp = isNaN(rParts[i]) ? 0 : rParts[i];
		const cp = isNaN(cParts[i]) ? 0 : cParts[i];
		if (rp > cp) return true;
		if (rp < cp) return false;
	}

	// Если основные числа версий равны: версия без пре-релиза новее версии с пре-релизом (1.0.0 > 1.0.0-alpha)
	if (!rPre && cPre) return true;
	if (rPre && !cPre) return false;
	if (!rPre && !cPre) return false;

	return rPre.localeCompare(cPre, undefined, { numeric: true }) > 0;
}

class OtaUpdater {
	status = $state<UpdateStatus>('idle');
	downloadProgress = $state<number>(0);
	currentVersion = $state<string>(version);
	activeBundleId = $state<string>('builtin');
	availableVersion = $state<string | null>(null);
	releaseNotes = $state<string | null>(null);
	releaseUrl = $state<string | null>(null);
	errorMessage = $state<string | null>(null);
	downloadedBundleId = $state<string | null>(null);
	lastChecked = $state<number>(0);

	private initialized = false;
	private repo = 're-dtf/client';

	get hasUpdate(): boolean {
		return this.status === 'ready' && Boolean(this.downloadedBundleId);
	}

	get statusTitle(): string {
		switch (this.status) {
			case 'checking':
				return 'Проверка обновлений...';
			case 'downloading':
				return `Загрузка обновления (${this.availableVersion ?? ''})...`;
			case 'ready':
				return 'Обновление готово к установке';
			case 'up-to-date':
				return 'У вас последняя версия';
			case 'error':
				return 'Ошибка проверки обновлений';
			default:
				return 'Обновление приложения';
		}
	}

	get statusSubtitle(): string {
		switch (this.status) {
			case 'checking':
				return 'Связываемся с GitHub Releases...';
			case 'downloading':
				return this.downloadProgress > 0
					? `Загружено ${this.downloadProgress}%`
					: 'Скачивание пакета обновления...';
			case 'ready':
				return `Версия ${this.availableVersion ?? ''} скачана. Нажмите «Применить» для перезапуска.`;
			case 'up-to-date':
				return `Текущая версия: ${this.currentVersion}`;
			case 'error':
				return this.errorMessage || 'Проверьте подключение к интернету';
			default:
				return `Текущая сборка: ${this.currentVersion}${this.activeBundleId !== 'builtin' ? ' (OTA)' : ''}`;
		}
	}

	async init(): Promise<void> {
		if (!browser || !isNative() || this.initialized) return;
		this.initialized = true;

		pwa.onUpdateAction = (immediate: boolean) => this.applyUpdate(immediate);

		try {
			// Читаем информацию о текущем активном бандле
			const info = await CapacitorUpdater.current();
			if (info?.bundle?.id) {
				this.activeBundleId = info.bundle.id;
			}
			if (info?.bundle?.version && info.bundle.id !== 'builtin') {
				this.currentVersion = info.bundle.version;
			}

			// Слушаем прогресс загрузки
			CapacitorUpdater.addListener('download', ({ percent }) => {
				if (typeof percent === 'number') {
					this.downloadProgress = Math.round(percent);
				}
			});
		} catch (e) {
			console.warn('[OTA] init failed:', e);
		}

		// Автоматическая проверка при старте (с защитой от слишком частых запросов)
		this.checkForUpdate(false).catch(() => {});
	}

	/**
	 * Проверка обновлений через GitHub Releases API.
	 * @param manual Если true, вызывается по клику пользователя и игнорирует троттлинг.
	 */
	async checkForUpdate(manual = false): Promise<boolean> {
		if (!browser || !isNative()) return false;
		if (this.status === 'checking' || this.status === 'downloading') return false;

		// Фоновая проверка не чаще одного раза в час
		const now = Date.now();
		if (!manual && now - this.lastChecked < 60 * 60 * 1000) {
			return false;
		}

		this.status = 'checking';
		this.errorMessage = null;

		try {
			const res = await fetch(`https://api.github.com/repos/${this.repo}/releases/latest`, {
				headers: {
					Accept: 'application/vnd.github.v3+json',
					'User-Agent': 'reDTF-App'
				}
			});

			// Если в репозитории пока нет опубликованных релизов
			if (res.status === 404) {
				this.status = 'up-to-date';
				this.lastChecked = now;
				return false;
			}

			if (res.status === 403) {
				throw new Error('Лимит запросов к GitHub API исчерпан. Попробуйте позже.');
			}

			if (!res.ok) {
				throw new Error(`Ошибка GitHub: ${res.statusText || res.status}`);
			}

			const release = await res.json();
			const remoteVersion = (release.tag_name || release.name || '').trim();

			// Ищем архив bundle.zip среди прикрепленных ассетов
			const asset = release.assets?.find(
				(a: { name?: string; browser_download_url?: string }) => a.name === 'bundle.zip'
			);

			if (!asset?.browser_download_url) {
				this.status = 'up-to-date';
				this.lastChecked = now;
				return false;
			}

			if (!isNewerVersion(remoteVersion, this.currentVersion)) {
				this.status = 'up-to-date';
				this.lastChecked = now;
				return false;
			}

			// Найдена более свежая версия: запускаем скачивание бандла
			this.status = 'downloading';
			this.availableVersion = remoteVersion;
			this.releaseNotes = release.body || null;
			this.releaseUrl = release.html_url || null;
			this.downloadProgress = 0;

			const bundle = await CapacitorUpdater.download({
				url: asset.browser_download_url,
				version: remoteVersion
			});

			this.downloadedBundleId = bundle.id;
			this.status = 'ready';
			this.lastChecked = now;

			// Сообщаем менеджеру PWA/обновлений, чтобы показать плашку ReloadPrompt
			pwa.newVersion = remoteVersion;
			pwa.needRefresh = true;

			return true;
		} catch (e: any) {
			this.status = 'error';
			this.errorMessage = e?.message || 'Не удалось проверить обновления';
			console.warn('[OTA] Check failed:', e);
			return false;
		}
	}

	/**
	 * Применение скачанного обновления.
	 * @param immediate Если true — перезапускает WebView немедленно. Если false — готовит к запуску при следующем скрытии/перезапуске приложения.
	 */
	async applyUpdate(immediate = true): Promise<void> {
		if (!this.downloadedBundleId || !isNative()) return;

		try {
			if (immediate) {
				await CapacitorUpdater.set({ id: this.downloadedBundleId });
			} else {
				await CapacitorUpdater.next({ id: this.downloadedBundleId });
			}
		} catch (e) {
			console.error('[OTA] Apply failed:', e);
		}
	}

	/**
	 * Сброс к встроенной версии APK (на случай проблем с OTA-бандлом).
	 */
	async resetToBuiltin(): Promise<void> {
		if (!isNative()) return;
		try {
			await CapacitorUpdater.reset({ toLastSuccessful: false });
		} catch (e) {
			console.error('[OTA] Reset to builtin failed:', e);
		}
	}
}

export const otaUpdater = new OtaUpdater();
