import { browser, version } from '$app/env';
import { App } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { isNative, openExternalUrl } from '$lib/capacitor';
import { pwa } from '$lib/pwa.svelte';
import { settings } from '$lib/storage/settings.svelte';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up-to-date' | 'error';

export interface PendingRelease {
	version: string;
	url: string;
	checksum: string;
	releaseNotes?: string | null;
	releaseUrl?: string | null;
}

export interface ApkReleaseInfo {
	url: string;
	filename: string;
	build: number | null;
	version: string | null;
}

/**
 * Извлекает hex SHA-256 из строки digest GitHub (формат sha256:<hex> или чистый hex).
 */
export function extractChecksumFromDigest(digest?: string | null): string | null {
	if (!digest) return null;
	const match = digest.match(/(?:sha256:)?([a-f0-9]{64})/i);
	return match ? match[1].toLowerCase() : null;
}

/**
 * Парсит текстовое содержимое файла SHA256SUMS.txt и возвращает хэш для указанного файла.
 */
export function parseSha256Sums(content: string, filename = 'bundle.zip'): string | null {
	if (!content) return null;
	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const parts = line.split(/\s+/);
		if (parts.length >= 2) {
			const hash = parts[0].toLowerCase();
			const file = parts.slice(1).join(' ').replace(/^\*/, '');
			if (file === filename && /^[a-f0-9]{64}$/.test(hash)) {
				return hash;
			}
		}
	}
	return null;
}

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

/**
 * Извлекает информацию о файле APK и номере нативной сборки из ассетов и описания релиза.
 */
export function parseApkReleaseInfo(
	assets?: Array<{ name?: string; browser_download_url?: string }>,
	releaseBody?: string | null
): ApkReleaseInfo | null {
	const apkAsset = assets?.find((a) => a.name?.toLowerCase().endsWith('.apk'));
	if (!apkAsset?.browser_download_url || !apkAsset.name) {
		return null;
	}

	let build: number | null = null;
	let version: string | null = null;

	// 1. Поиск номера сборки в имени файла: redtf-v0.2.0-b2.apk или redtf-b2.apk
	const buildMatch = apkAsset.name.match(/[-._]b(?:uild)?[-._]?(\d+)\.apk$/i);
	if (buildMatch) {
		build = parseInt(buildMatch[1], 10);
	}

	// 2. Поиск версии в имени файла: redtf-v1.2.0.apk
	const versionMatch = apkAsset.name.match(/[-._]v?(\d+\.\d+(?:\.\d+)?)/i);
	if (versionMatch) {
		version = versionMatch[1];
	}

	// 3. Поиск указания сборки или версии в описании релиза (Native build: 2 или APK build: 2)
	if (releaseBody) {
		const bodyBuildMatch = releaseBody.match(/(?:native|apk|android)[-_ ]build:\s*(\d+)/i);
		if (bodyBuildMatch) {
			build = parseInt(bodyBuildMatch[1], 10);
		}
		const bodyVersionMatch = releaseBody.match(/(?:native|apk|android)[-_ ]version:\s*v?(\d+\.\d+(?:\.\d+)?)/i);
		if (bodyVersionMatch) {
			version = bodyVersionMatch[1];
		}
	}

	return {
		url: apkAsset.browser_download_url,
		filename: apkAsset.name,
		build,
		version
	};
}

/**
 * Проверяет, является ли найденный APK более новой версией нативной оболочки.
 */
export function isNewerShell(
	remote: { build: number | null; version: string | null },
	current: { build: number; version: string }
): boolean {
	if (typeof remote.build === 'number') {
		return remote.build > current.build;
	}
	if (remote.version && current.version) {
		return isNewerVersion(remote.version, current.version);
	}
	return false;
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
	pendingRelease = $state<PendingRelease | null>(null);
	lastChecked = $state<number>(0);

	private initialized = false;
	private repo = 're-dtf/client';

	get hasUpdate(): boolean {
		return (
			(this.status === 'ready' && Boolean(this.downloadedBundleId)) ||
			(this.status === 'available' && Boolean(this.pendingRelease))
		);
	}

	get statusTitle(): string {
		switch (this.status) {
			case 'checking':
				return 'Проверка обновлений...';
			case 'available':
				return `Доступно обновление интерфейса ${this.availableVersion ?? ''}`;
			case 'downloading':
				return `Загрузка обновления (${this.availableVersion ?? ''})...`;
			case 'ready':
				return 'Интерфейс готов к установке';
			case 'up-to-date':
				return 'Интерфейс актуален';
			case 'error':
				return 'Ошибка проверки обновлений';
			default:
				return 'Веб-интерфейс';
		}
	}

	get statusSubtitle(): string {
		switch (this.status) {
			case 'checking':
				return 'Связываемся с GitHub Releases...';
			case 'available':
				return 'Нажмите «Обновить» для загрузки и установки';
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

		pwa.onUpdateAction = (immediate: boolean) => {
			if (immediate) {
				return this.downloadAndApply();
			}
		};

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

		// Автоматическая проверка при старте (если разрешена настройкой)
		if (settings.value.autoCheckUpdates !== false) {
			this.checkForUpdate(false).catch(() => {});
		}
	}

	/**
	 * Проверка обновлений через GitHub Releases API.
	 * @param manual Если true, вызывается по клику пользователя и игнорирует троттлинг.
	 */
	async checkForUpdate(manual = false): Promise<boolean> {
		if (!browser || !isNative()) return false;
		if (this.status === 'checking' || this.status === 'downloading') return false;

		// Если автопроверка выключена пользователем и это не ручной вызов
		if (!manual && settings.value.autoCheckUpdates === false) {
			return false;
		}

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
				shellUpdater.status = 'up-to-date';
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
			shellUpdater.processRelease(release);

			const remoteVersion = (release.tag_name || release.name || '').trim();

			// Ищем архив bundle.zip среди прикрепленных ассетов
			const asset = release.assets?.find(
				(a: { name?: string; browser_download_url?: string; digest?: string }) =>
					a.name === 'bundle.zip'
			);

			if (!asset?.browser_download_url) {
				this.status = 'up-to-date';
				this.lastChecked = now;
				return shellUpdater.hasUpdate;
			}

			if (!isNewerVersion(remoteVersion, this.currentVersion)) {
				this.status = 'up-to-date';
				this.lastChecked = now;
				return shellUpdater.hasUpdate;
			}

			// Контрольная сумма SHA-256 обязательна для Capgo Updater v8+
			let checksum = extractChecksumFromDigest(asset.digest);
			if (!checksum) {
				const sumsAsset = release.assets?.find(
					(a: { name?: string; browser_download_url?: string }) => a.name === 'SHA256SUMS.txt'
				);
				if (sumsAsset?.browser_download_url) {
					try {
						const sumsRes = await fetch(sumsAsset.browser_download_url);
						if (sumsRes.ok) {
							const sumsText = await sumsRes.text();
							checksum = parseSha256Sums(sumsText, 'bundle.zip');
						}
					} catch (e) {
						console.warn('[OTA] Failed to fetch SHA256SUMS.txt:', e);
					}
				}
			}

			if (!checksum) {
				throw new Error('Контрольная сумма SHA-256 для bundle.zip не найдена в релизе');
			}

			this.availableVersion = remoteVersion;
			this.releaseNotes = release.body || null;
			this.releaseUrl = release.html_url || null;
			this.pendingRelease = {
				version: remoteVersion,
				url: asset.browser_download_url,
				checksum,
				releaseNotes: release.body || null,
				releaseUrl: release.html_url || null
			};
			this.status = 'available';
			this.lastChecked = now;

			// Сообщаем менеджеру PWA/обновлений, чтобы показать плашку ReloadPrompt
			pwa.newVersion = remoteVersion;
			pwa.needRefresh = true;

			return true;
		} catch (e: any) {
			this.status = 'error';
			this.errorMessage = e?.message || 'Не удалось проверить обновления';
			shellUpdater.status = 'error';
			shellUpdater.errorMessage = this.errorMessage;
			console.warn('[OTA] Check failed:', e);
			return false;
		}
	}

	/**
	 * Загружает и применяет обновление только по прямому согласию пользователя.
	 */
	async downloadAndApply(): Promise<void> {
		if (!isNative()) return;

		// Если бандл уже скачан ранее
		if (this.downloadedBundleId) {
			await this.applyUpdate();
			return;
		}

		if (!this.pendingRelease) return;

		this.status = 'downloading';
		this.downloadProgress = 0;
		this.errorMessage = null;

		try {
			const bundle = await CapacitorUpdater.download({
				url: this.pendingRelease.url,
				version: this.pendingRelease.version,
				checksum: this.pendingRelease.checksum
			});

			this.downloadedBundleId = bundle.id;
			this.status = 'ready';

			// Применяем немедленно после скачивания
			await CapacitorUpdater.set({ id: bundle.id });
		} catch (e: any) {
			this.status = 'error';
			this.errorMessage = e?.message || 'Ошибка загрузки обновления';
			console.error('[OTA] Download failed:', e);
		}
	}

	/**
	 * Применение скачанного обновления.
	 * Применяется исключительно немедленно через set, без скрытых next-отложений.
	 */
	async applyUpdate(): Promise<void> {
		if (!this.downloadedBundleId || !isNative()) return;

		try {
			await CapacitorUpdater.set({ id: this.downloadedBundleId });
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

class ShellUpdater {
	status = $state<UpdateStatus>('idle');
	currentVersion = $state<string>('1.0');
	currentBuild = $state<number>(1);
	availableVersion = $state<string | null>(null);
	availableBuild = $state<number | null>(null);
	availableApk = $state<ApkReleaseInfo | null>(null);
	errorMessage = $state<string | null>(null);

	private initialized = false;

	get hasUpdate(): boolean {
		return this.status === 'available' && Boolean(this.availableApk);
	}

	get statusTitle(): string {
		switch (this.status) {
			case 'checking':
				return 'Проверка обновлений...';
			case 'available':
				return 'Доступно обновление приложения';
			case 'downloading':
				return 'Загрузка APK...';
			case 'up-to-date':
				return 'Приложение актуально';
			case 'error':
				return 'Ошибка проверки';
			default:
				return 'Приложение';
		}
	}

	get statusSubtitle(): string {
		switch (this.status) {
			case 'checking':
				return 'Связываемся с GitHub Releases...';
			case 'available':
				return `Сборка ${this.availableBuild ?? this.availableVersion ?? ''} (нажмите «Скачать APK»)`;
			case 'downloading':
				return 'Файл загружается через системный загрузчик';
			case 'up-to-date':
				return `Версия ${this.currentVersion} (сборка ${this.currentBuild})`;
			case 'error':
				return this.errorMessage || 'Проверьте подключение к интернету';
			default:
				return `Версия ${this.currentVersion} (сборка ${this.currentBuild})`;
		}
	}

	async init(): Promise<void> {
		if (!browser || !isNative() || this.initialized) return;
		this.initialized = true;

		try {
			const info = await App.getInfo();
			if (info) {
				if (info.version) this.currentVersion = info.version;
				if (info.build) this.currentBuild = parseInt(info.build, 10) || 1;
			}
		} catch (e) {
			console.warn('[ShellUpdater] init failed:', e);
		}
	}

	processRelease(release: any): void {
		const info = parseApkReleaseInfo(release?.assets, release?.body);
		if (!info) {
			this.status = 'up-to-date';
			this.availableApk = null;
			return;
		}

		const isNewer = isNewerShell(
			{ build: info.build, version: info.version },
			{ build: this.currentBuild, version: this.currentVersion }
		);

		if (!isNewer) {
			this.status = 'up-to-date';
			this.availableApk = null;
			return;
		}

		this.status = 'available';
		this.availableVersion = info.version;
		this.availableBuild = info.build;
		this.availableApk = info;
	}

	async downloadApk(): Promise<void> {
		if (!this.availableApk?.url) return;
		this.status = 'downloading';
		const url = this.availableApk.url;
		const filename = this.availableApk.filename || 'redtf.apk';

		if (typeof (window as any).AndroidBridge?.download === 'function') {
			try {
				const ok = (window as any).AndroidBridge.download(
					url,
					filename,
					'application/vnd.android.package-archive'
				);
				if (ok) return;
			} catch (e) {
				console.warn('[ShellUpdater] AndroidBridge.download failed:', e);
			}
		}

		await openExternalUrl(url);
	}

	dismiss(): void {
		this.availableApk = null;
		this.status = 'idle';
	}

	async checkForUpdate(manual = false): Promise<boolean> {
		return otaUpdater.checkForUpdate(manual);
	}
}

export const otaUpdater = new OtaUpdater();
export const shellUpdater = new ShellUpdater();
