import { describe, it, expect, beforeEach } from 'vitest';
import { isNewerVersion, otaUpdater } from './updater.svelte';

describe('OTA Updater', () => {
	describe('isNewerVersion', () => {
		it('корректно сравнивает семантические версии', () => {
			expect(isNewerVersion('0.2.0', '0.1.9')).toBe(true);
			expect(isNewerVersion('0.1.9', '0.2.0')).toBe(false);
			expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
			expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
		});

		it('обрабатывает префикс v', () => {
			expect(isNewerVersion('v0.2.0', '0.1.9')).toBe(true);
			expect(isNewerVersion('0.2.0', 'v0.1.9')).toBe(true);
			expect(isNewerVersion('v1.0.0', 'v1.0.0')).toBe(false);
		});

		it('сравнивает пре-релизы и релизы', () => {
			// Релиз новее пре-релиза с тем же номером
			expect(isNewerVersion('v0.1.0', 'v0.1.0-alpha.4')).toBe(true);
			expect(isNewerVersion('v0.1.0-alpha.4', 'v0.1.0')).toBe(false);

			// Сравнение номеров пре-релизов
			expect(isNewerVersion('v0.1.0-alpha.4', 'v0.1.0-alpha.3')).toBe(true);
			expect(isNewerVersion('v0.1.0-alpha.3', 'v0.1.0-alpha.4')).toBe(false);
			expect(isNewerVersion('v0.1.0-beta.1', 'v0.1.0-alpha.9')).toBe(true);
		});

		it('возвращает false для пустых или некорректных строк', () => {
			expect(isNewerVersion('', '1.0.0')).toBe(false);
			expect(isNewerVersion('1.0.0', '')).toBe(false);
			expect(isNewerVersion('', '')).toBe(false);
		});
	});

	describe('otaUpdater store', () => {
		beforeEach(() => {
			otaUpdater.status = 'idle';
			otaUpdater.downloadProgress = 0;
			otaUpdater.availableVersion = null;
			otaUpdater.downloadedBundleId = null;
			otaUpdater.errorMessage = null;
		});

		it('hasUpdate вычисляется из status и downloadedBundleId', () => {
			expect(otaUpdater.hasUpdate).toBe(false);
			otaUpdater.status = 'ready';
			expect(otaUpdater.hasUpdate).toBe(false);
			otaUpdater.downloadedBundleId = 'bundle-123';
			expect(otaUpdater.hasUpdate).toBe(true);
		});

		it('формирует понятные заголовки для UI', () => {
			otaUpdater.status = 'checking';
			expect(otaUpdater.statusTitle).toBe('Проверка обновлений...');

			otaUpdater.status = 'downloading';
			otaUpdater.availableVersion = 'v0.2.0';
			expect(otaUpdater.statusTitle).toContain('v0.2.0');

			otaUpdater.status = 'ready';
			expect(otaUpdater.statusTitle).toBe('Обновление готово к установке');

			otaUpdater.status = 'up-to-date';
			expect(otaUpdater.statusTitle).toBe('У вас последняя версия');

			otaUpdater.status = 'error';
			expect(otaUpdater.statusTitle).toBe('Ошибка проверки обновлений');
		});
	});
});
