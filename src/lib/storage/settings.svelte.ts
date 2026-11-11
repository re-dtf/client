import { untrack } from 'svelte';
import { DEFAULT_THEME, SETTINGS_VERSION } from './defaults';
export { DEFAULT_THEME } from './defaults';
import { persistedState } from './persisted.svelte';
import { isNative } from '$lib/capacitor';
import type { AppIconId } from '$lib/icons';

export type NestingMode = 'flatten' | 'autopan';
export type CommentVirtualization = 'auto' | 'enabled' | 'disabled';
export type RecommendationsMode = 'auto' | 'button';
export type ClientBadgesMode = 'all' | 'redtf_only' | 'none';
export type MobileBadgesPosition = 'author' | 'date';
export type RestoreScope = 'all' | 'moderator';

export interface ProxyItem {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
	description?: string;
	linkText?: string;
	linkUrl?: string;
	isPreset?: boolean;
}

export interface AppSettings {
	/** id активной темы (см. $lib/themes) */
	theme: string;
	/** Список CORS-прокси для входа и обновления токена DTF */
	proxies: ProxyItem[];
	/** Показ глубоко вложенных комментариев */
	commentNesting: NestingMode;
	/** Виртуализация отрисовки комментариев (content-visibility: auto) */
	commentVirtualization: CommentVirtualization;
	/** Рекомендации под постом: 'auto' (подгружать сами), 'button' (по кнопке) */
	recommendations: RecommendationsMode;
	/** Вести локальную статистику (см. stats.svelte.ts) */
	collectStats: boolean;
	/** Тактильный виброотклик (для поддерживаемых устройств) */
	haptics: boolean;
	/** Отключать верхний бар в мобильной версии */
	disableMobileTopBar: boolean;
	/** Использовать сервис предпросмотра при копировании и шеринге ссылок на посты */
	useSharePreview: boolean;
	/** Невидимая подпись reDTF к отправляемым комментариям */
	watermark: boolean;
	/** Режим отображения бейджей клиентов у комментариев: 'all' (все), 'redtf_only' (только re), 'none' (скрыты) */
	clientBadges: ClientBadgesMode;
	/** Расположение бейджей мобильных клиентов (Android / iOS): 'author' (у автора), 'date' (у времени) */
	mobileBadgesPosition: MobileBadgesPosition;
	/** Выбранная иконка приложения и вкладки браузера: 'default' | 'bluer' | 'white' | 'custom' */
	appIcon: AppIconId;
	/** Пользовательская иконка в формате data URI (image/png или image/svg+xml) */
	customIconData?: string | null;
	/** Автоматический голос «за» свой комментарий при публикации (как на Reddit) */
	autoUpvoteComments: boolean;
	/** Автоматически проверять обновления при запуске приложения (Android / iOS) */
	autoCheckUpdates?: boolean;
	/** Что восстанавливать из внешних архивов: 'all' (все удалённые) | 'moderator' (только удалённые модератором) */
	restoreScope: RestoreScope;
	/** Показывать восстановленные комментарии сразу развёрнутыми */
	restoreExpanded: boolean;
	/** Показывать у восстановленного комментария автора из архива, а не заглушку DTF */
	restoreAuthor: boolean;
	/** Показывать визуальную подсветку Safe Area и панелей поверх интерфейса */
	debugSafeAreaOverlay?: boolean;
	/** Показывать плавающий индикатор метрик (HUD) */
	debugHud?: boolean;
	/** Режим разработчика (показывает раздел «Разработка» в настройках) */
	devMode?: boolean;
}

/** Адрес CORS-прокси на Val Town (задаётся при сборке VITE_AUTH_PROXY_URL или VITE_VALTOWN_PROXY_URL) */
export const DEFAULT_VALTOWN_PROXY_URL: string = (
	import.meta.env.VITE_AUTH_PROXY_URL ||
	import.meta.env.VITE_VALTOWN_PROXY_URL ||
	''
).replace(/\/+$/, '');

/** Адрес CORS-прокси на Cloudflare Workers (задаётся при сборке VITE_CLOUDFLARE_PROXY_URL) */
export const DEFAULT_CLOUDFLARE_PROXY_URL: string = (
	import.meta.env.VITE_CLOUDFLARE_PROXY_URL ||
	''
).replace(/\/+$/, '');

/** Базовый адрес сервиса генерации превью ссылок (задаётся при сборке VITE_SHARE_URL) */
export const DEFAULT_SHARE_SERVICE_URL: string = (
	import.meta.env.VITE_SHARE_URL ||
	''
).replace(/\/+$/, '');

export const DEFAULT_PROXIES: ProxyItem[] = [];

if (!isNative() && DEFAULT_VALTOWN_PROXY_URL) {
	DEFAULT_PROXIES.push({
		id: 'valtown',
		name: 'Val Town (открытый)',
		url: DEFAULT_VALTOWN_PROXY_URL,
		enabled: true,
		description:
			'Открытый публичный прокси. Исходный код открыт и доступен для проверки в любой момент.',
		linkText: 'Код на Val Town',
		linkUrl: 'https://www.val.town/x/donnertech/redtf-proxy',
		isPreset: true
	});
}

if (!isNative() && DEFAULT_CLOUDFLARE_PROXY_URL) {
	DEFAULT_PROXIES.push({
		id: 'cloudflare',
		name: 'Cloudflare Workers (резервный)',
		url: DEFAULT_CLOUDFLARE_PROXY_URL,
		enabled: false,
		description:
			'Резервный шлюз на Cloudflare. Выдерживает большие нагрузки, если основной перегружен, но код закрыт платформой и сервис может быть недоступен в РФ.',
		isPreset: true
	});
}


/** Общие настройки приложения, не зависящие от темы. Настройки темы лежат в themeSettings. */
export const settings = persistedState<AppSettings>(
	'redtf:settings',
	{
		theme: DEFAULT_THEME,
		proxies: DEFAULT_PROXIES,
		commentNesting: 'flatten',
		commentVirtualization: 'auto',
		recommendations: 'auto',
		collectStats: true,
		haptics: true,
		disableMobileTopBar: false,
		useSharePreview: true,
		watermark: true,
		clientBadges: 'redtf_only',
		mobileBadgesPosition: 'author',
		autoUpvoteComments: false,
		restoreScope: 'all',
		restoreExpanded: false,
		restoreAuthor: true,
		appIcon: 'default',
		customIconData: null,
		autoCheckUpdates: true,
		debugSafeAreaOverlay: false,
		debugHud: false,
		devMode: false
	},
	SETTINGS_VERSION
);

/** Список всех активных прокси с непустым URL */
export function getEnabledProxies(): ProxyItem[] {
	const list = untrack(() => settings.value.proxies) || [];
	return list.filter((p) => p.enabled && Boolean(p.url?.trim()));
}

/** URL первого активного прокси без слэша на конце или пустая строка */
export function getPrimaryProxyUrl(): string {
	const [first] = getEnabledProxies();
	return first ? first.url.replace(/\/+$/, '') : '';
}

/** Включить или выключить прокси по id */
export function toggleProxy(id: string, enabled?: boolean) {
	const current = untrack(() => settings.value.proxies) || [];
	const next = current.map((p) => {
		if (p.id !== id) return p;
		const targetEnabled = enabled ?? !p.enabled;
		if (targetEnabled && !p.url?.trim()) {
			return { ...p, enabled: false };
		}
		return { ...p, enabled: targetEnabled };
	});
	settings.patch({ proxies: next });
}

/** Обновить URL прокси */
export function updateProxyUrl(id: string, rawUrl: string) {
	let url = rawUrl.trim();
	if (url && !/^https?:\/\//i.test(url)) {
		url = `https://${url}`;
	}
	url = url.replace(/\/+$/, '');
	const current = untrack(() => settings.value.proxies) || [];
	const next = current.map((p) => (p.id === id ? { ...p, url } : p));
	settings.patch({ proxies: next });
}

/** Сбросить настройки на стандартные (включен только открытый прокси Val Town) */
export function applyDefaultProxySettings() {
	const current = untrack(() => settings.value.proxies) || [];
	const hasValtown = current.some((p) => p.id === 'valtown');
	let next: ProxyItem[];

	if (hasValtown) {
		next = current.map((p) => {
			if (p.id === 'valtown') {
				const url = p.url || DEFAULT_VALTOWN_PROXY_URL;
				return {
					...p,
					url,
					enabled: Boolean(url)
				};
			}
			return { ...p, enabled: false };
		});
	} else {
		next = [
			{
				id: 'valtown',
				name: 'Val Town (открытый)',
				url: DEFAULT_VALTOWN_PROXY_URL,
				enabled: Boolean(DEFAULT_VALTOWN_PROXY_URL),
				description:
					'Открытый публичный прокси. Исходный код открыт и доступен для проверки в любой момент.',
				linkText: 'Код на Val Town',
				linkUrl: 'https://www.val.town/x/donnertech/redtf-proxy',
				isPreset: true
			},
			...current.map((p) => ({ ...p, enabled: false }))
		];
	}
	settings.patch({ proxies: next });
}

/** Включить резервный Cloudflare Workers прокси */
export function enableCloudflareProxy(): boolean {
	const current = untrack(() => settings.value.proxies) || [];
	const cf = current.find((p) => p.id === 'cloudflare');
	if (!cf) {
		const newCf: ProxyItem = {
			id: 'cloudflare',
			name: 'Cloudflare Workers (резервный)',
			url: DEFAULT_CLOUDFLARE_PROXY_URL,
			enabled: Boolean(DEFAULT_CLOUDFLARE_PROXY_URL),
			description:
				'Резервный шлюз на Cloudflare. Выдерживает большие нагрузки, если основной перегружен, но код закрыт платформой и сервис может быть недоступен в РФ.',
			isPreset: true
		};
		settings.patch({ proxies: [...current, newCf] });
		return Boolean(newCf.url);
	}
	const next = current.map((p) => (p.id === 'cloudflare' ? { ...p, enabled: Boolean(p.url) } : p));
	settings.patch({ proxies: next });
	return Boolean(cf.url);
}

/** Добавить собственный прокси */
export function addCustomProxy(rawUrl: string, customName?: string, makePrimary = false): ProxyItem {
	let url = rawUrl.trim();
	if (!url) {
		throw new Error('Укажите адрес прокси-сервера');
	}
	if (!/^https?:\/\//i.test(url)) {
		url = `https://${url}`;
	}
	url = url.replace(/\/+$/, '');

	let parsed: URL;
	try {
		parsed = new URL(url);
		if (!parsed.hostname) throw new Error();
	} catch {
		throw new Error('Некорректный адрес URL');
	}

	const name = customName?.trim() || parsed.hostname || 'Свой прокси';

	const item: ProxyItem = {
		id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		name,
		url,
		enabled: true,
		isPreset: false,
		description: 'Пользовательский CORS-прокси'
	};

	const current = untrack(() => settings.value.proxies) || [];
	if (makePrimary) {
		const updated = current.map((p) => ({ ...p, enabled: false }));
		settings.patch({ proxies: [item, ...updated] });
	} else {
		settings.patch({ proxies: [...current, item] });
	}
	return item;
}

/** Удалить пользовательский прокси */
export function removeCustomProxy(id: string) {
	const current = untrack(() => settings.value.proxies) || [];
	settings.patch({ proxies: current.filter((p) => p.id !== id) });
}

/** Поменять порядок прокси (приоритет в очереди failover) */
export function moveProxy(id: string, direction: 'up' | 'down') {
	const current = [...(untrack(() => settings.value.proxies) || [])];
	const index = current.findIndex((p) => p.id === id);
	if (index === -1) return;
	const targetIndex = direction === 'up' ? index - 1 : index + 1;
	if (targetIndex < 0 || targetIndex >= current.length) return;

	const temp = current[index];
	current[index] = current[targetIndex];
	current[targetIndex] = temp;
	settings.patch({ proxies: current });
}

/** Быстрая проверка доступности прокси (ping) с таймаутом */
export async function testProxy(
	url: string,
	timeoutMs = 5000
): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
	const cleanUrl = url.trim().replace(/\/+$/, '');
	if (!cleanUrl) {
		return { ok: false, error: 'URL не указан' };
	}

	const start = performance.now();
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const res = await fetch(`${cleanUrl}/`, {
			method: 'GET',
			signal: controller.signal
		});
		clearTimeout(timer);
		const latencyMs = Math.round(performance.now() - start);
		if (res.ok || res.status === 204) {
			return { ok: true, latencyMs };
		}
		return { ok: false, latencyMs, error: `Код ${res.status}` };
	} catch (err: unknown) {
		clearTimeout(timer);
		const message =
			err instanceof Error
				? err.name === 'AbortError'
					? 'Таймаут (5с)'
					: err.message
				: 'Ошибка сети';
		return { ok: false, error: message };
	}
}

/**
 * Проверяет, включена ли виртуализация комментариев (content-visibility: auto).
 * В режиме 'auto' включена для Chromium и WebKit, но отключена для Firefox (Gecko),
 * где есть баг с пропуском отрисовки при скролле длинных grid-списков.
 */
export function shouldVirtualizeComments(mode: CommentVirtualization = settings.value.commentVirtualization): boolean {
	if (mode === 'enabled') return true;
	if (mode === 'disabled') return false;
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
	const isFirefox = /firefox|fxios/i.test(navigator.userAgent);
	if (isFirefox) return false;
	return 'contentVisibility' in document.documentElement.style;
}
