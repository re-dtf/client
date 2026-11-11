import { describe, it, expect, beforeEach } from 'vitest';
import {
	extractChecksumFromDigest,
	isNewerShell,
	isNewerVersion,
	otaUpdater,
	parseApkReleaseInfo,
	parseSha256Sums,
	shellUpdater
} from './updater.svelte';

describe('OTA Updater', () => {
	describe('extractChecksumFromDigest', () => {
		it('извлекает sha256 хеш с префиксом sha256:', () => {
			const hash = 'b620dad35acc74f65f1fea74cfa4ad646c8b98ecf2381c108c969fa6617535c9';
			expect(extractChecksumFromDigest(`sha256:${hash}`)).toBe(hash);
			expect(extractChecksumFromDigest(`SHA256:${hash.toUpperCase()}`)).toBe(hash);
		});

		it('принимает чистый 64-символьный hex', () => {
			const hash = 'b620dad35acc74f65f1fea74cfa4ad646c8b98ecf2381c108c969fa6617535c9';
			expect(extractChecksumFromDigest(hash)).toBe(hash);
		});

		it('возвращает null для некорректных значений', () => {
			expect(extractChecksumFromDigest(null)).toBeNull();
			expect(extractChecksumFromDigest(undefined)).toBeNull();
			expect(extractChecksumFromDigest('')).toBeNull();
			expect(extractChecksumFromDigest('invalid')).toBeNull();
			expect(extractChecksumFromDigest('sha256:123')).toBeNull();
		});
	});

	describe('parseSha256Sums', () => {
		it('находит хэш для указанного файла из вывода sha256sum', () => {
			const content = `
c159217566fa72860a57076a27e61c8aeffe9cc97fdcb7767e3b430c12c40e92  redtf-v0.1.0-alpha.6.apk
b620dad35acc74f65f1fea74cfa4ad646c8b98ecf2381c108c969fa6617535c9  bundle.zip
`;
			expect(parseSha256Sums(content, 'bundle.zip')).toBe(
				'b620dad35acc74f65f1fea74cfa4ad646c8b98ecf2381c108c969fa6617535c9'
			);
			expect(parseSha256Sums(content, 'redtf-v0.1.0-alpha.6.apk')).toBe(
				'c159217566fa72860a57076a27e61c8aeffe9cc97fdcb7767e3b430c12c40e92'
			);
		});

		it('обрабатывает бинарный префикс * перед именем файла', () => {
			const content = 'b620dad35acc74f65f1fea74cfa4ad646c8b98ecf2381c108c969fa6617535c9 *bundle.zip';
			expect(parseSha256Sums(content, 'bundle.zip')).toBe(
				'b620dad35acc74f65f1fea74cfa4ad646c8b98ecf2381c108c969fa6617535c9'
			);
		});

		it('возвращает null, если файл отсутствует или формат неверный', () => {
			expect(parseSha256Sums('', 'bundle.zip')).toBeNull();
			expect(parseSha256Sums('not a hash bundle.zip', 'bundle.zip')).toBeNull();
			expect(parseSha256Sums('b620dad35acc74f65f1fea74cfa4ad646c8b98ecf2381c108c969fa6617535c9 other.zip', 'bundle.zip')).toBeNull();
		});
	});

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
			otaUpdater.pendingRelease = null;
			otaUpdater.errorMessage = null;
		});

		it('hasUpdate вычисляется из status и downloadedBundleId', () => {
			expect(otaUpdater.hasUpdate).toBe(false);
			otaUpdater.status = 'ready';
			expect(otaUpdater.hasUpdate).toBe(false);
			otaUpdater.downloadedBundleId = 'bundle-123';
			expect(otaUpdater.hasUpdate).toBe(true);
		});

		it('hasUpdate истинен в состоянии available при наличии pendingRelease', () => {
			otaUpdater.status = 'available';
			otaUpdater.pendingRelease = {
				version: 'v0.2.0',
				url: 'https://example.com/bundle.zip',
				checksum: '123'
			};
			expect(otaUpdater.hasUpdate).toBe(true);
		});

		it('формирует понятные заголовки для UI', () => {
			otaUpdater.status = 'checking';
			expect(otaUpdater.statusTitle).toBe('Проверка обновлений...');

			otaUpdater.status = 'available';
			otaUpdater.availableVersion = 'v0.2.0';
			expect(otaUpdater.statusTitle).toBe('Доступно обновление интерфейса v0.2.0');
			expect(otaUpdater.statusSubtitle).toBe('Нажмите «Обновить» для загрузки и установки');

			otaUpdater.status = 'downloading';
			otaUpdater.availableVersion = 'v0.2.0';
			expect(otaUpdater.statusTitle).toContain('v0.2.0');

			otaUpdater.status = 'ready';
			expect(otaUpdater.statusTitle).toBe('Интерфейс готов к установке');

			otaUpdater.status = 'up-to-date';
			expect(otaUpdater.statusTitle).toBe('Интерфейс актуален');

			otaUpdater.status = 'error';
			expect(otaUpdater.statusTitle).toBe('Ошибка проверки обновлений');
		});
	});

	describe('parseApkReleaseInfo & isNewerShell', () => {
		it('извлекает номер сборки из имени APK файла (-b2)', () => {
			const info = parseApkReleaseInfo([
				{ name: 'bundle.zip', browser_download_url: 'https://example.com/bundle.zip' },
				{ name: 'redtf-v0.2.0-b2.apk', browser_download_url: 'https://example.com/redtf.apk' }
			]);
			expect(info).not.toBeNull();
			expect(info?.build).toBe(2);
			expect(info?.filename).toBe('redtf-v0.2.0-b2.apk');
			expect(info?.url).toBe('https://example.com/redtf.apk');
		});

		it('извлекает номер сборки из описания релиза, если его нет в имени', () => {
			const info = parseApkReleaseInfo(
				[{ name: 'redtf-v0.2.0.apk', browser_download_url: 'https://example.com/redtf.apk' }],
				'Релиз с исправлениями.\nNative-Build: 3\nПодробности...'
			);
			expect(info).not.toBeNull();
			expect(info?.build).toBe(3);
		});

		it('возвращает null, если в ассетах нет APK', () => {
			const info = parseApkReleaseInfo([
				{ name: 'bundle.zip', browser_download_url: 'https://example.com/bundle.zip' }
			]);
			expect(info).toBeNull();
		});

		it('isNewerShell корректно сравнивает номер нативного билда', () => {
			expect(isNewerShell({ build: 2, version: '1.0' }, { build: 1, version: '1.0' })).toBe(true);
			expect(isNewerShell({ build: 1, version: '1.0' }, { build: 1, version: '1.0' })).toBe(false);
			expect(isNewerShell({ build: 1, version: '1.0' }, { build: 2, version: '1.0' })).toBe(false);
		});

		it('isNewerShell сравнивает версии при отсутствии build', () => {
			expect(isNewerShell({ build: null, version: '1.1.0' }, { build: 1, version: '1.0.0' })).toBe(true);
			expect(isNewerShell({ build: null, version: '1.0.0' }, { build: 1, version: '1.0.0' })).toBe(false);
			expect(isNewerShell({ build: null, version: null }, { build: 1, version: '1.0.0' })).toBe(false);
		});
	});

	describe('shellUpdater store', () => {
		beforeEach(() => {
			shellUpdater.status = 'idle';
			shellUpdater.currentVersion = '1.0';
			shellUpdater.currentBuild = 1;
			shellUpdater.availableVersion = null;
			shellUpdater.availableBuild = null;
			shellUpdater.availableApk = null;
			shellUpdater.errorMessage = null;
		});

		it('hasUpdate истинен только в состоянии available при наличии availableApk', () => {
			expect(shellUpdater.hasUpdate).toBe(false);
			shellUpdater.status = 'available';
			expect(shellUpdater.hasUpdate).toBe(false);
			shellUpdater.availableApk = {
				url: 'https://example.com/redtf.apk',
				filename: 'redtf.apk',
				build: 2,
				version: '1.0'
			};
			expect(shellUpdater.hasUpdate).toBe(true);
		});

		it('в состоянии up-to-date показывает заголовок "Приложение актуально"', () => {
			shellUpdater.status = 'up-to-date';
			expect(shellUpdater.statusTitle).toBe('Приложение актуально');
			expect(shellUpdater.statusSubtitle).toContain('сборка 1');
		});

		it('в состоянии available показывает заголовок "Доступно обновление приложения"', () => {
			shellUpdater.status = 'available';
			shellUpdater.availableBuild = 2;
			expect(shellUpdater.statusTitle).toBe('Доступно обновление приложения');
			expect(shellUpdater.statusSubtitle).toContain('Сборка 2');
		});
	});
});
