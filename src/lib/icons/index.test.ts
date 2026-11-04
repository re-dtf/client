import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	APP_ICONS,
	getAppIcon,
	isPwa,
	applyAppIcon,
	registerCapacitorIconBridge,
	notifyCapacitorIconChange,
	type AppIconId
} from './index';

interface MockElement {
	rel: string;
	type?: string;
	attrs: Record<string, string>;
	setAttribute(k: string, v: string): void;
	getAttribute(k: string): string | null;
}

function createMockElement(rel: string): MockElement {
	const attrs: Record<string, string> = { rel };
	return {
		rel,
		attrs,
		setAttribute(k: string, v: string) {
			attrs[k] = v;
		},
		getAttribute(k: string) {
			return attrs[k] ?? null;
		}
	};
}

describe('App Icons & PWA Manifest management', () => {
	let elements: MockElement[] = [];
	const originalDoc = (globalThis as unknown as { document?: unknown }).document;

	beforeEach(() => {
		elements = [];
		registerCapacitorIconBridge(null);

		const mockDoc = {
			querySelector: (selector: string) => {
				const match = selector.match(/rel="([^"]+)"/);
				if (!match) return null;
				const rel = match[1];
				return elements.find((el) => el.rel === rel) || null;
			},
			createElement: () => {
				const el = createMockElement('');
				return el;
			},
			head: {
				appendChild: (el: MockElement) => {
					elements.push(el);
					return el;
				}
			}
		};

		Object.defineProperty(globalThis, 'document', {
			value: mockDoc,
			writable: true,
			configurable: true
		});
	});

	afterEach(() => {
		Object.defineProperty(globalThis, 'document', {
			value: originalDoc,
			writable: true,
			configurable: true
		});
	});

	it('содержит 3 набора иконок: default, bluer, white', () => {
		expect(APP_ICONS.map((i) => i.id)).toEqual(['default', 'bluer', 'white']);
	});

	it('getAppIcon возвращает правильные данные для каждого id', () => {
		expect(getAppIcon('default').bgColor).toBe('#D9F5FF');
		expect(getAppIcon('default').manifest).toBe('manifest.webmanifest');
		expect(getAppIcon('bluer').bgColor).toBe('#BEE6FF');
		expect(getAppIcon('white').bgColor).toBe('#FFFFFF');
		expect(getAppIcon('unknown' as AppIconId).id).toBe('default');
	});

	it('applyAppIcon обновляет favicon, apple-touch-icon и manifest в DOM', () => {
		applyAppIcon('bluer');

		const fav = (globalThis.document as unknown as { querySelector: (s: string) => MockElement | null }).querySelector('link[rel="icon"]');
		const apple = (globalThis.document as unknown as { querySelector: (s: string) => MockElement | null }).querySelector('link[rel="apple-touch-icon"]');
		const manifest = (globalThis.document as unknown as { querySelector: (s: string) => MockElement | null }).querySelector('link[rel="manifest"]');

		expect(fav?.getAttribute('href')).toContain('icons/fav-bluer.svg');
		expect(fav?.type).toBe('image/svg+xml');
		expect(apple?.getAttribute('href')).toContain('icons/app-bluer-180.png');
		expect(manifest?.getAttribute('href')).toContain('manifest-bluer.webmanifest');
	});

	it('applyAppIcon повторно переключает на white и обратно на default', () => {
		applyAppIcon('white');

		const fav = (globalThis.document as unknown as { querySelector: (s: string) => MockElement | null }).querySelector('link[rel="icon"]');
		const manifest = (globalThis.document as unknown as { querySelector: (s: string) => MockElement | null }).querySelector('link[rel="manifest"]');

		expect(fav?.getAttribute('href')).toContain('icons/fav-white.svg');
		expect(manifest?.getAttribute('href')).toContain('manifest-white.webmanifest');

		applyAppIcon('default');
		expect(fav?.getAttribute('href')).toContain('icons/fav-default.svg');
		expect(manifest?.getAttribute('href')).toContain('manifest.webmanifest');
	});

	it('isPwa возвращает false в стандартном браузере без standalone', () => {
		expect(isPwa()).toBe(false);
	});

	it('applyAppIcon с custom icon обновляет DOM с data URI и выставляет правильный type', () => {
		const customUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
		applyAppIcon('custom', customUri);

		const fav = (globalThis.document as unknown as { querySelector: (s: string) => MockElement | null }).querySelector('link[rel="icon"]');
		const apple = (globalThis.document as unknown as { querySelector: (s: string) => MockElement | null }).querySelector('link[rel="apple-touch-icon"]');
		const manifest = (globalThis.document as unknown as { querySelector: (s: string) => MockElement | null }).querySelector('link[rel="manifest"]');

		expect(fav?.getAttribute('href')).toBe(customUri);
		expect(fav?.type).toBe('image/png');
		expect(apple?.getAttribute('href')).toBe(customUri);
		expect(manifest?.getAttribute('href')).toContain('data:application/manifest+json');
	});

	it('вызывает зарегистрированный Capacitor мост при смене иконки', async () => {
		const bridge = vi.fn();
		registerCapacitorIconBridge(bridge);

		await notifyCapacitorIconChange('white');
		expect(bridge).toHaveBeenCalledWith('white');
	});
});
