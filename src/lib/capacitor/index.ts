import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { page } from '$app/state';
import { closeOverlay, openDtfLink, openDtfUrl, popSubstate } from '$lib/navigation';
import { otaUpdater, shellUpdater } from './updater.svelte';

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

let lastHandledUrl = '';
let lastHandledTime = 0;

/**
 * Обработка внешнего URL (App Links, Deep Links), полученного от Capacitor.
 * Возвращает true, если URL был обработан.
 */
export async function handleAppUrl(url: string): Promise<boolean> {
	if (!url) return false;
	const now = Date.now();
	if (lastHandledUrl === url && now - lastHandledTime < 1500) {
		return true;
	}
	lastHandledUrl = url;
	lastHandledTime = now;

	// Игнорируем адреса, не относящиеся к dtf.ru или redtf.org
	if (
		!/^https?:\/\/(?:www\.)?(?:dtf\.ru|redtf\.org)/i.test(url) &&
		!/^\/(?:post|u|tag|notifications|popular|new|my|\d+)/i.test(url)
	) {
		return false;
	}

	// Ссылки на dtf.ru и redtf.org открываем внутри приложения, если цель поддерживается
	if (openDtfUrl(url)) {
		return true;
	}

	// Неподдерживаемые разделы dtf.ru и redtf.org открываем во внешнем браузере, чтобы не терять контекст
	if (/^https?:\/\/(?:www\.)?(?:dtf\.ru|redtf\.org)/i.test(url)) {
		await openExternalUrl(url);
		return true;
	}

	return false;
}

/**
 * Обработка клика по ссылкам внутри WebView нативного приложения.
 */
export function handleNativeLinkClick(e: MouseEvent): void {
	if (e.defaultPrevented || e.button !== 0) return;
	const anchor = (e.target as Element | null)?.closest?.('a');
	if (!anchor) return;
	if (anchor.hasAttribute?.('download') || anchor.getAttribute('download') !== null) return;
	const href = anchor.getAttribute('href');
	if (!href) return;

	if (openDtfLink(e, href)) {
		return;
	}

	const origin = typeof window !== 'undefined' ? window.location?.origin : undefined;
	if (/^https?:\/\//i.test(href) && (!origin || !href.startsWith(origin))) {
		e.preventDefault();
		openExternalUrl(href).catch(() => {});
	}
}

/**
 * Обработка системной кнопки / жеста «Назад» в нативном приложении.
 * Сначала проверяет вложенные шаги навигации внутри активного оверлея (popSubstate),
 * затем закрывает верхний оверлей (closeOverlay), затем переходит назад по истории,
 * либо сворачивает приложение, если пользователь находится на главном экране.
 */
export function handleBackButton(canGoBack: boolean = false): void {
	try {
		if (popSubstate()) {
			return;
		}
		const overlays = page.state.overlays ?? [];
		if (overlays.length > 0) {
			closeOverlay();
			return;
		}
	} catch {}

	if (canGoBack && typeof window !== 'undefined' && window.location?.pathname !== '/' && window.location?.pathname !== '') {
		window.history.back();
		return;
	}

	// Если на главном экране без оверлеев — сворачиваем приложение
	App.minimizeApp()?.catch?.(() => {});
}

/**
 * Инициализация нативных обработчиков Capacitor (кнопка «Назад», StatusBar, SplashScreen, App Links).
 */
export function initCapacitor(): void {
	if (typeof window === 'undefined' || !isNative() || initialized) return;
	initialized = true;

	// Подтверждаем запуск для OTA
	notifyAppReady().catch(() => {});

	// Инициализируем менеджеры обновлений
	otaUpdater.init().catch(() => {});
	shellUpdater.init().catch(() => {});

	// В нативном приложении Service Worker не нужен: файлы приложения уже находятся внутри APK.
	// Очищаем любые зарегистрированные service workers и CacheStorage, чтобы они не удерживали
	// устаревший index.html и чанки при обновлении приложения.
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistrations().then((registrations) => {
			for (const r of registrations) {
				r.unregister().catch(() => {});
			}
		}).catch(() => {});
	}
	if ('caches' in window) {
		caches.keys().then((keys) => {
			for (const k of keys) {
				caches.delete(k).catch(() => {});
			}
		}).catch(() => {});
	}

	// Обработка аппаратной кнопки / системного свайпа «Назад»
	App.addListener('backButton', ({ canGoBack }) => {
		handleBackButton(canGoBack);
	});

	// Обработка входящих ссылок (App Links / Deep Links) при открытии свернутого/активного приложения
	App.addListener('appUrlOpen', (event) => {
		handleAppUrl(event.url).catch(() => {});
	});

	// Обработка ссылки при холодном запуске
	App.getLaunchUrl().then((launchUrl) => {
		if (launchUrl?.url) {
			handleAppUrl(launchUrl.url).catch(() => {});
		}
	}).catch(() => {});

	// Перехват кликов по ссылкам внутри приложения
	document.addEventListener('click', handleNativeLinkClick);

	// Применение статус-бара в зависимости от текущего режима темы
	const isDark = document.documentElement.dataset.themeMode === 'dark';
	updateStatusBar(isDark).catch(() => {});

	// Скрываем splash screen
	hideSplashScreen().catch(() => {});
}
