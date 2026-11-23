import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.hoisted(() => {
	const data: Record<string, string> = {};
	Object.defineProperty(globalThis, 'localStorage', {
		value: {
			getItem: (key: string) => data[key] ?? null,
			setItem: (key: string, value: string) => {
				data[key] = String(value);
			},
			removeItem: (key: string) => {
				delete data[key];
			},
			clear: () => {
				for (const key in data) delete data[key];
			}
		},
		writable: true
	});
});

import {
	settings,
	shouldVirtualizeComments,
	DEFAULT_PROXIES,
	getEnabledProxies,
	getPrimaryProxyUrl,
	toggleProxy,
	updateProxyUrl,
	addCustomProxy,
	removeCustomProxy,
	moveProxy,
	testProxy,
	applyDefaultProxySettings
} from './settings.svelte';

describe('settings & shouldVirtualizeComments', () => {
	beforeEach(() => {
		localStorage.clear();
		settings.value = {
			theme: 'dtf2022',
			proxies: JSON.parse(JSON.stringify(DEFAULT_PROXIES)),
			commentNesting: 'flatten',
			collectStats: true,
			hideSeen: false,
			hideSeenFeeds: {},
			seenOpenSeconds: 5,
			seenFullRead: true,
			seenFeedSeconds: 0,
			haptics: true,
			watermark: true,
			clientBadges: 'redtf_only',
			mobileBadgesPosition: 'author',
			plusBadges: 'classic',
			animatedAvatars: 'all',
			remarkView: 'text',
			autoUpvoteComments: false,
			restoreScope: 'all',
			restoreExpanded: false,
			restoreAuthor: true,
			commentVirtualization: 'auto',
			recommendations: 'auto',
			appIcon: 'default',
			autoCheckUpdates: true,
			smartTypography: true,
			debugSafeAreaOverlay: false,
			debugHud: false,
			devMode: false,
			predictiveBack: false,
			useSharePreview: true
		};
	});

	it('appIcon по умолчанию "default"', () => {
		expect(settings.value.appIcon).toBe('default');
	});

	it('predictiveBack по умолчанию false', () => {
		expect(settings.value.predictiveBack).toBe(false);
	});

	it('patch обновляет значение predictiveBack', () => {
		settings.patch({ predictiveBack: true });
		expect(settings.value.predictiveBack).toBe(true);
	});

	it('patch обновляет значение appIcon и сохраняет в localStorage', () => {
		settings.patch({ appIcon: 'bluer' });
		expect(settings.value.appIcon).toBe('bluer');

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.appIcon).toBe('bluer');
	});

	it('watermark по умолчанию включен (true)', () => {
		expect(settings.value.watermark).toBe(true);
	});

	it('patch обновляет значение watermark', () => {
		settings.patch({ watermark: false });
		expect(settings.value.watermark).toBe(false);

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.watermark).toBe(false);
	});

	it('clientBadges по умолчанию "redtf_only"', () => {
		expect(settings.value.clientBadges).toBe('redtf_only');
	});

	it('patch обновляет значение clientBadges', () => {
		settings.patch({ clientBadges: 'all' });
		expect(settings.value.clientBadges).toBe('all');

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.clientBadges).toBe('all');
	});

	it('mobileBadgesPosition по умолчанию "author"', () => {
		expect(settings.value.mobileBadgesPosition).toBe('author');
	});

	it('patch обновляет значение mobileBadgesPosition', () => {
		settings.patch({ mobileBadgesPosition: 'date' });
		expect(settings.value.mobileBadgesPosition).toBe('date');

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.mobileBadgesPosition).toBe('date');
	});

	it('autoUpvoteComments по умолчанию выключен (false)', () => {
		expect(settings.value.autoUpvoteComments).toBe(false);
	});

	it('patch обновляет значение autoUpvoteComments', () => {
		settings.patch({ autoUpvoteComments: true });
		expect(settings.value.autoUpvoteComments).toBe(true);

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.autoUpvoteComments).toBe(true);
	});

	it('autoCheckUpdates по умолчанию включен (true)', () => {
		expect(settings.value.autoCheckUpdates).toBe(true);
	});

	it('patch обновляет значение autoCheckUpdates и сохраняет в localStorage', () => {
		settings.patch({ autoCheckUpdates: false });
		expect(settings.value.autoCheckUpdates).toBe(false);

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.autoCheckUpdates).toBe(false);
	});

	it('smartTypography по умолчанию включен (true) и сохраняется через patch', () => {
		expect(settings.value.smartTypography).toBe(true);

		settings.patch({ smartTypography: false });
		expect(settings.value.smartTypography).toBe(false);

		const saved = JSON.parse(localStorage.getItem('redtf:settings')!);
		expect(saved.d.smartTypography).toBe(false);
	});

	it('по умолчанию commentVirtualization равен "auto"', () => {
		expect(settings.value.commentVirtualization).toBe('auto');
	});

	it('принудительно enabled всегда возвращает true', () => {
		expect(shouldVirtualizeComments('enabled')).toBe(true);
	});

	it('принудительно disabled всегда возвращает false', () => {
		expect(shouldVirtualizeComments('disabled')).toBe(false);
	});

	it('в режиме auto виртуализация включена в любом браузере', () => {
		expect(shouldVirtualizeComments('auto')).toBe(true);
	});

	describe('управление списком прокси и failover порядок', () => {
		beforeEach(() => {
			settings.value = {
				...settings.value,
				proxies: [
					{
						id: 'valtown',
						name: 'Val Town (открытый)',
						url: 'https://valtown.example.com',
						enabled: true,
						isPreset: true
					},
					{
						id: 'cloudflare',
						name: 'Cloudflare Workers (резервный)',
						url: 'https://cf.example.com',
						enabled: false,
						isPreset: true
					}
				]
			};
		});

		it('DEFAULT_PROXIES содержит только настроенные в сборке прокси с флагом isPreset', () => {
			for (const proxy of DEFAULT_PROXIES) {
				expect(proxy.isPreset).toBe(true);
				expect(proxy.url).toBeTruthy();
			}
		});

		it('добавляет выключенный Yandex Cloud перед Cloudflare в сохранённый список', async () => {
			const custom = addCustomProxy('https://custom.example.com', 'Мой прокси', true);
			toggleProxy('cloudflare', true);
			const [primary, val, cf] = settings.value.proxies;
			vi.stubEnv('VITE_AUTH_PROXY_URL', val.url);
			vi.stubEnv('VITE_YANDEX_PROXY_URL', 'https://yandex.example.com/');
			vi.stubEnv('VITE_CLOUDFLARE_PROXY_URL', cf.url);
			vi.resetModules();
			try {
				const loaded = await import('./settings.svelte');
				const yandex = expect.objectContaining({
					id: 'yandex',
					url: 'https://yandex.example.com',
					enabled: false,
					isPreset: true
				});
				expect(loaded.DEFAULT_PROXIES.map((proxy) => proxy.id)).toEqual(['valtown', 'yandex', 'cloudflare']);
				expect(loaded.settings.value.proxies).toEqual([primary, val, yandex, cf]);
				expect(loaded.getEnabledProxies()).toEqual([custom, cf]);
				loaded.toggleProxy('yandex', true);
				vi.resetModules();
				const reloaded = await import('./settings.svelte');
				expect(reloaded.getEnabledProxies().map((proxy) => proxy.id)).toEqual([
					custom.id, 'yandex', 'cloudflare'
				]);
			} finally {
				vi.unstubAllEnvs();
				vi.resetModules();
			}
		});

		it('getEnabledProxies возвращает только активные прокси с непустым URL', () => {
			const enabled = getEnabledProxies();
			expect(enabled.length).toBe(1);
			expect(enabled[0].id).toBe('valtown');
		});

		it('getPrimaryProxyUrl возвращает URL первого активного прокси без слэша', () => {
			expect(getPrimaryProxyUrl()).toBe('https://valtown.example.com');
		});

		it('toggleProxy переключает активность прокси', () => {
			toggleProxy('cloudflare', true);
			expect(settings.value.proxies.find((p) => p.id === 'cloudflare')?.enabled).toBe(true);
			expect(getEnabledProxies().length).toBe(2);

			toggleProxy('cloudflare', false);
			expect(settings.value.proxies.find((p) => p.id === 'cloudflare')?.enabled).toBe(false);
			expect(getEnabledProxies().length).toBe(1);
		});

		it('toggleProxy не включает прокси, если URL пустой', () => {
			updateProxyUrl('cloudflare', '');
			toggleProxy('cloudflare', true);
			expect(settings.value.proxies.find((p) => p.id === 'cloudflare')?.enabled).toBe(false);
			expect(getEnabledProxies().length).toBe(1);
		});

		it('updateProxyUrl обновляет URL, нормализует протокол и удаляет концевой слэш', () => {
			updateProxyUrl('cloudflare', 'my-proxy.workers.dev/');
			const cf = settings.value.proxies.find((p) => p.id === 'cloudflare');
			expect(cf?.url).toBe('https://my-proxy.workers.dev');
		});

		it('addCustomProxy добавляет новый прокси в список активным', () => {
			const item = addCustomProxy('https://my-proxy.workers.dev', 'Мой воркер');
			expect(item.name).toBe('Мой воркер');
			expect(item.url).toBe('https://my-proxy.workers.dev');
			expect(item.enabled).toBe(true);
			expect(item.isPreset).toBe(false);

			const found = settings.value.proxies.find((p) => p.id === item.id);
			expect(found).toBeDefined();
			expect(found?.name).toBe('Мой воркер');
		});

		it('addCustomProxy выбрасывает ошибку при пустом или некорректном URL', () => {
			expect(() => addCustomProxy('')).toThrow('Укажите адрес прокси-сервера');
			expect(() => addCustomProxy('   ')).toThrow('Укажите адрес прокси-сервера');
			expect(() => addCustomProxy('http://')).toThrow('Некорректный адрес URL');
			expect(() => addCustomProxy('https:// broken host')).toThrow('Некорректный адрес URL');
		});

		it('removeCustomProxy удаляет пользовательский прокси', () => {
			const item = addCustomProxy('https://test-to-remove.example.com');
			expect(settings.value.proxies.some((p) => p.id === item.id)).toBe(true);

			removeCustomProxy(item.id);
			expect(settings.value.proxies.some((p) => p.id === item.id)).toBe(false);
		});

		it('moveProxy меняет приоритет прокси местами', () => {
			expect(settings.value.proxies[0].id).toBe('valtown');
			expect(settings.value.proxies[1].id).toBe('cloudflare');

			moveProxy('cloudflare', 'up');
			expect(settings.value.proxies[0].id).toBe('cloudflare');
			expect(settings.value.proxies[1].id).toBe('valtown');

			moveProxy('cloudflare', 'down');
			expect(settings.value.proxies[0].id).toBe('valtown');
			expect(settings.value.proxies[1].id).toBe('cloudflare');
		});

		it('applyDefaultProxySettings включает Val Town и выключает остальные', () => {
			toggleProxy('cloudflare', true);
			expect(settings.value.proxies.find((p) => p.id === 'cloudflare')?.enabled).toBe(true);

			applyDefaultProxySettings();
			const valtown = settings.value.proxies.find((p) => p.id === 'valtown');
			const cf = settings.value.proxies.find((p) => p.id === 'cloudflare');
			expect(valtown?.enabled).toBe(true);
			expect(cf?.enabled).toBe(false);
		});
	});

	describe('testProxy', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('возвращает ошибку при пустом URL', async () => {
			const res = await testProxy('   ');
			expect(res).toEqual({ ok: false, error: 'URL не указан' });
		});

		it('возвращает ok: true и задержку при ответе 200/204', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
			);
			const res = await testProxy('https://my-proxy.workers.dev');
			expect(res.ok).toBe(true);
			expect(typeof res.latencyMs).toBe('number');
		});

		it('возвращает ошибку со статусом при коде 502', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue(new Response(null, { status: 502 }))
			);
			const res = await testProxy('https://my-proxy.workers.dev');
			expect(res.ok).toBe(false);
			expect(res.error).toBe('Код 502');
		});

		it('обрабатывает таймаут AbortError', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'))
			);
			const res = await testProxy('https://my-proxy.workers.dev');
			expect(res.ok).toBe(false);
			expect(res.error).toBe('Таймаут (5с)');
		});
	});
});
