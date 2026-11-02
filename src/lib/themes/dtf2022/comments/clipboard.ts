/** Проверяет, является ли файл картинкой (по MIME-типу или расширению) */
export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.name);
}

/** Извлекает изображения из буфера обмена (через files или DataTransferItemList) */
export function extractImageFiles(data: DataTransfer | null | undefined): File[] {
	if (!data) return [];

	const fromFiles = Array.from(data.files ?? []).filter(isImageFile);
	if (fromFiles.length > 0) return fromFiles;

	return Array.from(data.items ?? [])
		.filter(i => i.kind === 'file' && i.type.startsWith('image/'))
		.map(i => i.getAsFile()!)
		.filter(Boolean) as File[];
}
