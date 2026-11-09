#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Преобразует Date в DOS дату и время для zip-заголовков.
 */
function getDosDateTime(date = new Date()) {
	const year = Math.max(1980, date.getFullYear());
	const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
	const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
	return { dosDate, dosTime };
}

/**
 * Рекурсивно собирает список всех файлов в директории.
 */
function collectFiles(dir, baseDir = dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...collectFiles(fullPath, baseDir));
		} else if (entry.isFile()) {
			if (entry.name === '.DS_Store' || entry.name === 'Thumbs.db') continue;
			const relativePath = path.relative(baseDir, fullPath).split(path.sep).join('/');
			files.push({ fullPath, relativePath });
		}
	}

	return files;
}

/**
 * Создает zip-архив из директории без сторонних зависимостей (только Node.js zlib/fs).
 */
export function buildOtaZip(inputDir = 'build', outputFile = 'bundle.zip') {
	const startTime = Date.now();

	if (!fs.existsSync(inputDir)) {
		throw new Error(`Директория сбора "${inputDir}" не найдена. Сначала выполните npm run build.`);
	}

	const indexHtmlPath = path.join(inputDir, 'index.html');
	if (!fs.existsSync(indexHtmlPath)) {
		throw new Error(`В "${inputDir}" отсутствует index.html. Capgo OTA требует index.html в корне архива.`);
	}

	const files = collectFiles(inputDir);
	if (files.length === 0) {
		throw new Error(`Директория "${inputDir}" пуста.`);
	}

	const localChunks = [];
	const centralChunks = [];
	let offset = 0;
	let totalUncompressed = 0;
	let totalCompressed = 0;

	for (const file of files) {
		const stat = fs.statSync(file.fullPath);
		const data = fs.readFileSync(file.fullPath);
		const nameBuf = Buffer.from(file.relativePath, 'utf8');
		const { dosDate, dosTime } = getDosDateTime(stat.mtime);

		const uncompressedSize = data.length;
		totalUncompressed += uncompressedSize;

		let compressedSize = 0;
		let deflated = Buffer.alloc(0);
		let compressionMethod = 8; // Deflate

		if (uncompressedSize === 0) {
			compressionMethod = 0; // Stored
		} else {
			deflated = zlib.deflateRawSync(data, { level: 9 });
			compressedSize = deflated.length;
		}
		totalCompressed += compressedSize;

		const crc = zlib.crc32(data);

		// Local file header (30 bytes + name length)
		const localHeader = Buffer.alloc(30);
		localHeader.writeUInt32LE(0x04034b50, 0); // Signature
		localHeader.writeUInt16LE(20, 4);         // Version needed (2.0)
		localHeader.writeUInt16LE(0, 6);          // General purpose bit flag
		localHeader.writeUInt16LE(compressionMethod, 8);
		localHeader.writeUInt16LE(dosTime, 10);
		localHeader.writeUInt16LE(dosDate, 12);
		localHeader.writeUInt32LE(crc, 14);
		localHeader.writeUInt32LE(compressedSize, 18);
		localHeader.writeUInt32LE(uncompressedSize, 22);
		localHeader.writeUInt16LE(nameBuf.length, 26);
		localHeader.writeUInt16LE(0, 28);         // Extra field length

		localChunks.push(Buffer.concat([localHeader, nameBuf, deflated]));

		// Central directory header (46 bytes + name length)
		const centralHeader = Buffer.alloc(46);
		centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
		centralHeader.writeUInt16LE(20, 4);         // Version made by (DOS/FAT)
		centralHeader.writeUInt16LE(20, 6);         // Version needed (2.0)
		centralHeader.writeUInt16LE(0, 8);          // General purpose bit flag
		centralHeader.writeUInt16LE(compressionMethod, 10);
		centralHeader.writeUInt16LE(dosTime, 12);
		centralHeader.writeUInt16LE(dosDate, 14);
		centralHeader.writeUInt32LE(crc, 16);
		centralHeader.writeUInt32LE(compressedSize, 20);
		centralHeader.writeUInt32LE(uncompressedSize, 24);
		centralHeader.writeUInt16LE(nameBuf.length, 28);
		centralHeader.writeUInt16LE(0, 30);         // Extra field length
		centralHeader.writeUInt16LE(0, 32);         // Comment length
		centralHeader.writeUInt16LE(0, 34);         // Disk number start
		centralHeader.writeUInt16LE(0, 36);         // Internal attributes
		centralHeader.writeUInt32LE(0, 38);         // External attributes
		centralHeader.writeUInt32LE(offset, 42);    // Relative offset of local header

		centralChunks.push(Buffer.concat([centralHeader, nameBuf]));
		offset += localHeader.length + nameBuf.length + deflated.length;
	}

	const centralDirOffset = offset;
	const centralDir = Buffer.concat(centralChunks);
	const centralDirSize = centralDir.length;

	// End of central directory record (22 bytes)
	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0); // Signature
	eocd.writeUInt16LE(0, 4);          // Disk number
	eocd.writeUInt16LE(0, 6);          // Disk with start of CD
	eocd.writeUInt16LE(files.length, 8);  // Entries on this disk
	eocd.writeUInt16LE(files.length, 10); // Total entries
	eocd.writeUInt32LE(centralDirSize, 12);
	eocd.writeUInt32LE(centralDirOffset, 16);
	eocd.writeUInt16LE(0, 20);         // Comment length

	const zipBuffer = Buffer.concat([...localChunks, centralDir, eocd]);
	fs.writeFileSync(outputFile, zipBuffer);

	const elapsed = Date.now() - startTime;
	const uncompMb = (totalUncompressed / (1024 * 1024)).toFixed(2);
	const compMb = (zipBuffer.length / (1024 * 1024)).toFixed(2);
	const ratio = (((totalUncompressed - zipBuffer.length) / totalUncompressed) * 100).toFixed(1);

	console.log(`[OTA Bundle] Собрано ${files.length} файлов -> ${outputFile}`);
	console.log(`[OTA Bundle] Размер: ${compMb} MB (исходный ${uncompMb} MB, сжатие ${ratio}%) за ${elapsed}ms`);
}

// Запуск напрямую через CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
	const inDir = process.argv[2] || 'build';
	const outZip = process.argv[3] || 'bundle.zip';
	buildOtaZip(inDir, outZip);
}
