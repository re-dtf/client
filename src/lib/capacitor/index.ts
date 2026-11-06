import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { page } from '$app/state';
import { closeOverlay } from '$lib/navigation';

let initialized = false;

/**
 * Проверка, запущено ли приложение в нативном контейнере (Android / iOS).
 */
export function isNative(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		return Capacitor.isNativePlatform();
	} catch {
		return false;
	}
}

/**
 * Управление стилем системного статус-бара (цвет иконок под тему).
 */
export async function updateStatusBar(isDark: boolean): Promise<void> {
	if (!isNative()) return;
	try {
		await StatusBar.setStyle({
			style: isDark ? Style.Dark : Style.Light
		});
		await StatusBar.setOverlaysWebView({ overlay: true });
	} catch (e) {
		console.warn('[Capacitor] StatusBar update failed:', e);
	}
}

/**
 * Скрыть системный экран загрузки после инициализации интерфейса.
 */
export async function hideSplashScreen(): Promise<void> {
	if (!isNative()) return;
	try {
		await SplashScreen.hide();
	} catch (e) {
		console.warn('[Capacitor] SplashScreen.hide failed:', e);
	}
}

/**
 * Открытие внешней ссылки через In-App Browser (Chrome Custom Tabs / SFSafariViewController).
 */
export async function openExternalUrl(url: string): Promise<void> {
	if (isNative()) {
		try {
			await Browser.open({ url });
			return;
		} catch (e) {
			console.warn('[Capacitor] Browser.open failed:', e);
		}
	}
	if (typeof window !== 'undefined') {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
}

/**
 * Подтверждение успешного старта для Capgo (защита от авто-отката при OTA-обновлениях).
 */
export async function notifyAppReady(): Promise<void> {
	if (!isNative()) return;
	try {
		await CapacitorUpdater.notifyAppReady();
	} catch (e) {
		console.warn('[Capacitor] notifyAppReady failed:', e);
	}
}

/**
 * Инициализация нативных обработчиков Capacitor (кнопка «Назад», StatusBar, SplashScreen).
 */
export function initCapacitor(): void {
	if (typeof window === 'undefined' || !isNative() || initialized) return;
	initialized = true;

	// Подтверждаем запуск для OTA
	notifyAppReady().catch(() => {});

	// Обработка аппаратной кнопки / системного свайпа «Назад»
	App.addListener('backButton', ({ canGoBack }) => {
		try {
			const overlays = page.state.overlays ?? [];
			if (overlays.length > 0) {
				closeOverlay();
				return;
			}
		} catch {}

		if (canGoBack && window.location.pathname !== '/' && window.location.pathname !== '') {
			window.history.back();
			return;
		}

		// Если на главном экране без оверлеев — сворачиваем приложение
		App.minimizeApp().catch(() => {});
	});

	// Применение статус-бара в зависимости от текущего режима темы
	const isDark = document.documentElement.dataset.themeMode === 'dark';
	updateStatusBar(isDark).catch(() => {});

	// Скрываем splash screen
	hideSplashScreen().catch(() => {});
}
