import { getLeonardoOriginalUrl, downloadImage } from '$lib/api/utils';
import { notify } from '$lib/themes/dtf2022/ui/notify.svelte';

export interface MediaSheetData {
	uuid: string;
	isGif?: boolean;
}

let activeMedia = $state<MediaSheetData | null>(null);

export const mediaSheet = {
	get current() {
		return activeMedia;
	},
	open(data: MediaSheetData) {
		activeMedia = data;
	},
	close() {
		activeMedia = null;
	},
	async download() {
		if (!activeMedia) return;
		const { uuid, isGif } = activeMedia;
		activeMedia = null;
		const originalUrl = getLeonardoOriginalUrl(uuid);
		try {
			await downloadImage(originalUrl, uuid, isGif ? 'gif' : 'mp4');
			notify.success('Загрузка началась');
		} catch {
			notify.error('Не удалось скачать файл');
		}
	},
	async copy() {
		if (!activeMedia) return;
		const { uuid } = activeMedia;
		activeMedia = null;
		const originalUrl = getLeonardoOriginalUrl(uuid);
		try {
			await navigator.clipboard.writeText(originalUrl);
			notify.success('Ссылка скопирована');
		} catch {
			notify.error('Не удалось скопировать ссылку');
		}
	},
	async share() {
		if (!activeMedia) return;
		const { uuid, isGif } = activeMedia;
		activeMedia = null;
		const originalUrl = getLeonardoOriginalUrl(uuid);
		try {
			if (navigator.share) {
				await navigator.share({
					title: isGif ? 'GIF' : 'Видео',
					url: originalUrl
				});
			}
		} catch (e: any) {
			if (e?.name !== 'AbortError') {
				notify.error('Не удалось поделиться');
			}
		}
	}
};
