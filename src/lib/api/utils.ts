export function getLeonardoUrl(
	uuid: string,
	options: { format?: string; width?: number; scale_crop?: string; original?: boolean } = {}
): string {
	if (!uuid) return '';
	if (uuid.startsWith('http://') || uuid.startsWith('https://')) return uuid;
	if (options.original) {
		return `https://leonardo.osnova.io/${uuid}/`;
	}

	let url = `https://leonardo.osnova.io/${uuid}/-`;

	if (options.width) {
		url += `/preview/${options.width}/-`;
	} else if (options.scale_crop) {
		url += `/scale_crop/${options.scale_crop}/-`;
	}

	const format = options.format || 'webp';
	url += `/format/${format}/`;

	return url;
}

/** Получить прямую ссылку на оригинал изображения без сжатия и ресайза */
export function getLeonardoOriginalUrl(uuid: string): string {
	return getLeonardoUrl(uuid, { original: true });
}

/** Определение расширения файла по MIME-типу с запасным типом из данных блока */
export function resolveImageExtension(mime?: string, type?: string): string {
	if (mime && mime !== 'application/octet-stream') {
		if (mime.includes('png')) return 'png';
		if (mime.includes('gif')) return 'gif';
		if (mime.includes('webp')) return 'webp';
		if (mime.includes('avif')) return 'avif';
		if (mime.includes('svg')) return 'svg';
		if (mime.includes('mp4')) return 'mp4';
		if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
	}
	if (type) {
		const clean = type.replace(/^\./, '').toLowerCase();
		return clean === 'jpeg' ? 'jpg' : clean;
	}
	return 'jpg';
}

/** Построение имени файла для скачивания оригинала */
export function getDownloadFilename(uuid: string, ext: string): string {
	if (uuid.startsWith('http://') || uuid.startsWith('https://')) {
		try {
			const pathname = new URL(uuid).pathname;
			const lastSegment = pathname.split('/').filter(Boolean).pop();
			if (lastSegment && lastSegment.includes('.')) {
				return lastSegment;
			}
		} catch {
			// fallback к uuid.ext
		}
	}
	return `${uuid}.${ext}`;
}

/** Скачать файл изображения по прямой ссылке в полном качестве */
export async function downloadImage(url: string, uuid: string, fallbackType?: string): Promise<void> {
	if (typeof window === 'undefined') return;

	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const blob = await res.blob();
		const ext = resolveImageExtension(blob.type, fallbackType);
		const filename = getDownloadFilename(uuid, ext);
		const blobUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = blobUrl;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
	} catch {
		const ext = resolveImageExtension(undefined, fallbackType);
		const filename = getDownloadFilename(uuid, ext);
		const link = document.createElement('a');
		link.href = url;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		link.remove();
	}
}

