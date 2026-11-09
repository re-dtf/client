import { describe, it, expect, beforeEach } from 'vitest';
import { extractChecksumFromDigest, isNewerVersion, otaUpdater, parseSha256Sums } from './updater.svelte';

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
