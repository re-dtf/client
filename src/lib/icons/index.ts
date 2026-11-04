import { asset } from '$app/paths';

export type AppIconId = 'default' | 'bluer' | 'white' | 'custom';

export type AppSvgAsset = 'icons/app-default.svg' | 'icons/app-bluer.svg' | 'icons/app-white.svg';
export type FavSvgAsset = 'icons/fav-default.svg' | 'icons/fav-bluer.svg' | 'icons/fav-white.svg';
export type AppleIconAsset = 'icons/app-default-180.png' | 'icons/app-bluer-180.png' | 'icons/app-white-180.png';
export type ManifestAsset = 'manifest.webmanifest' | 'manifest-bluer.webmanifest' | 'manifest-white.webmanifest';

export interface AppIconInfo {
	id: AppIconId;
	title: string;
	description: string;
	bgColor: string;
	textColor: string;
	appSvg: AppSvgAsset;
	favSvg: FavSvgAsset;
	appleIcon: AppleIconAsset;
	manifest: ManifestAsset;
}

export const APP_ICONS: AppIconInfo[] = [
	{
		id: 'default',
		title: 'Стандартная',
		description: 'Светло-голубой фон с чёрным логотипом',
		bgColor: '#D9F5FF',
		textColor: '#000000',
		appSvg: 'icons/app-default.svg',
		favSvg: 'icons/fav-default.svg',
		appleIcon: 'icons/app-default-180.png',
		manifest: 'manifest.webmanifest'
	},
	{
		id: 'bluer',
		title: 'Голубая',
		description: 'Насыщенный небесно-голубой фон',
		bgColor: '#BEE6FF',
		textColor: '#000000',
		appSvg: 'icons/app-bluer.svg',
		favSvg: 'icons/fav-bluer.svg',
		appleIcon: 'icons/app-bluer-180.png',
		manifest: 'manifest-bluer.webmanifest'
	},
	{
		id: 'white',
		title: 'Белая',
		description: 'Белый фон с синим логотипом DTF',
		bgColor: '#FFFFFF',
		textColor: '#1693E5',
		appSvg: 'icons/app-white.svg',
		favSvg: 'icons/fav-white.svg',
		appleIcon: 'icons/app-white-180.png',
		manifest: 'manifest-white.webmanifest'
	}
];

export function getAppIcon(id: string): AppIconInfo {
	return APP_ICONS.find((i) => i.id === id) || APP_ICONS[0];
}

/**
 * Проверка, запущено ли приложение в режиме PWA / standalone (на домашнем экране).
 */
export function isPwa(): boolean {
	if (typeof window === 'undefined') return false;
	const nav = navigator as unknown as { standalone?: boolean };
	return (
		window.matchMedia?.('(display-mode: standalone)').matches === true ||
		window.matchMedia?.('(display-mode: window-controls-overlay)').matches === true ||
		nav.standalone === true ||
		(typeof document !== 'undefined' && document.referrer.includes('android-app://'))
	);
}

/**
 * Точка интеграции для Capacitor / нативных обёрток.
 * Когда в проект будет добавлен Capacitor, зарегистрируйте обработчик смены нативного значка:
 * registerCapacitorIconBridge(async (iconId) => { await AppIconPlugin.change({ name: iconId }); });
 */
export type CapacitorIconBridge = (iconId: AppIconId) => Promise<boolean | void> | boolean | void;

let customCapacitorBridge: CapacitorIconBridge | null = null;

export function registerCapacitorIconBridge(bridge: CapacitorIconBridge | null) {
	customCapacitorBridge = bridge;
}

export async function notifyCapacitorIconChange(id: AppIconId): Promise<void> {
	if (customCapacitorBridge) {
		try {
			await customCapacitorBridge(id);
			return;
		} catch (err) {
			console.warn('[appIcon] Capacitor bridge error:', err);
		}
	}

	// Автоопределение типичного плагина Capacitor, если он объявлен в глобальной области
	if (typeof window !== 'undefined') {
		const cap = (window as unknown as {
			Capacitor?: {
				Plugins?: {
					AppIcon?: {
						change?: (options: { name: string }) => Promise<unknown>;
						set?: (options: { name: string }) => Promise<unknown>;
					};
				};
			};
		}).Capacitor;

		const plugin = cap?.Plugins?.AppIcon;
		if (plugin) {
			try {
				if (plugin.change) {
					await plugin.change({ name: id });
				} else if (plugin.set) {
					await plugin.set({ name: id });
				}
			} catch (err) {
				console.warn('[appIcon] Native Capacitor icon change failed:', err);
			}
		}
	}
}

/**
 * Генерирует data URI веб-манифеста с пользовательской иконкой.
 */
export function createCustomManifest(dataUri: string): string {
	const isSvg = dataUri.startsWith('data:image/svg');
	const manifest = {
		name: 're:DTF',
		short_name: 're:DTF',
		description: 'Неофициальный клиент для DTF',
		start_url: './',
		scope: './',
		display: 'standalone',
		display_override: ['window-controls-overlay', 'standalone'],
		background_color: '#161617',
		theme_color: '#D9F5FF',
		lang: 'ru',
		icons: [
			{
				src: dataUri,
				sizes: 'any',
				type: isSvg ? 'image/svg+xml' : 'image/png',
				purpose: 'any'
			},
			{
				src: dataUri,
				sizes: 'any',
				type: isSvg ? 'image/svg+xml' : 'image/png',
				purpose: 'maskable'
			}
		]
	};
	return 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest));
}

/**
 * Обрабатывает загруженный файл (SVG или растровое изображение):
 * масштабирует в квадрат 512x512 через Canvas или читает SVG, возвращая data URI.
 */
export async function processCustomIcon(file: File): Promise<string> {
	if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
		if (file.size > 256 * 1024) {
			throw new Error('SVG файл слишком большой (максимальный размер: 256 КБ)');
		}
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(new Error('Не удалось прочитать SVG файл'));
			reader.readAsDataURL(file);
		});
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			const canvas = document.createElement('canvas');
			canvas.width = 192;
			canvas.height = 192;
			const ctx = canvas.getContext('2d');
			if (!ctx) return reject(new Error('Не удалось создать контекст рисования'));

			// Центрируем и масштабируем квадратную область по центру
			const minDim = Math.min(img.width, img.height);
			const sx = (img.width - minDim) / 2;
			const sy = (img.height - minDim) / 2;
			ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 192, 192);

			resolve(canvas.toDataURL('image/png'));
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Не удалось загрузить изображение'));
		};
		img.src = url;
	});
}

/**
 * Обновляет иконки в браузере (favicon), apple-touch-icon и ссылку на веб-манифест PWA.
 */
export function applyAppIcon(iconId: AppIconId, customData?: string | null) {
	if (typeof document === 'undefined') return;

	// 1. Favicon (вкладка браузера)
	let favLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
	if (!favLink) {
		favLink = document.createElement('link');
		favLink.rel = 'icon';
		favLink.type = 'image/svg+xml';
		document.head.appendChild(favLink);
	}

	// 2. Apple Touch Icon
	let appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
	if (!appleLink) {
		appleLink = document.createElement('link');
		appleLink.rel = 'apple-touch-icon';
		document.head.appendChild(appleLink);
	}

	// 3. Web App Manifest
	let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
	if (!manifestLink) {
		manifestLink = document.createElement('link');
		manifestLink.rel = 'manifest';
		document.head.appendChild(manifestLink);
	}

	if (iconId === 'custom' && customData) {
		const isSvg = customData.startsWith('data:image/svg');
		const type = isSvg ? 'image/svg+xml' : 'image/png';
		if (favLink.type !== type) {
			favLink.type = type;
		}
		if (favLink.getAttribute('href') !== customData) {
			favLink.setAttribute('href', customData);
		}
		if (appleLink.getAttribute('href') !== customData) {
			appleLink.setAttribute('href', customData);
		}
		const customManifest = createCustomManifest(customData);
		if (manifestLink.getAttribute('href') !== customManifest) {
			manifestLink.setAttribute('href', customManifest);
		}
	} else {
		if (favLink.type !== 'image/svg+xml') {
			favLink.type = 'image/svg+xml';
		}
		const info = getAppIcon(iconId);
		const favUrl = asset(info.favSvg);
		if (favLink.getAttribute('href') !== favUrl) {
			favLink.setAttribute('href', favUrl);
		}
		const appleUrl = asset(info.appleIcon);
		if (appleLink.getAttribute('href') !== appleUrl) {
			appleLink.setAttribute('href', appleUrl);
		}
		const manifestUrl = asset(info.manifest);
		if (manifestLink.getAttribute('href') !== manifestUrl) {
			manifestLink.setAttribute('href', manifestUrl);
		}
	}

	// 4. Уведомление Capacitor / нативного окружения
	notifyCapacitorIconChange(iconId).catch(() => {});
}
