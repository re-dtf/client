export function getLeonardoUrl(uuid: string, options: { format?: string, width?: number, scale_crop?: string } = {}): string {
	if (!uuid) return '';
	
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
