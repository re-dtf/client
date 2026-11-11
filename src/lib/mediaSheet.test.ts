import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaSheet } from './mediaSheet.svelte';
import * as utils from '$lib/api/utils';
import { notify } from '$lib/themes/dtf2022/ui/notify.svelte';

vi.mock('$lib/api/utils', async () => {
	const actual = await vi.importActual<typeof utils>('$lib/api/utils');
	return {
		...actual,
		downloadImage: vi.fn().mockResolvedValue(undefined)
	};
});

vi.mock('$lib/themes/dtf2022/ui/notify.svelte', () => ({
	notify: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

describe('mediaSheet manager', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mediaSheet.close();
	});

	it('управляет состоянием открытия и закрытия', () => {
		expect(mediaSheet.current).toBeNull();

		mediaSheet.open({ uuid: 'abc-123', isGif: true });
		expect(mediaSheet.current).toEqual({ uuid: 'abc-123', isGif: true });

		mediaSheet.close();
		expect(mediaSheet.current).toBeNull();
	});

	it('скачивает медиа с правильным типом и ссылкой на оригинал', async () => {
		mediaSheet.open({ uuid: 'gif-uuid-1', isGif: true });

		await mediaSheet.download();

		expect(utils.downloadImage).toHaveBeenCalledWith(
			'https://leonardo.osnova.io/gif-uuid-1/',
			'gif-uuid-1',
			'gif'
		);
		expect(notify.success).toHaveBeenCalledWith('Загрузка началась');
		expect(mediaSheet.current).toBeNull();
	});

	it('копирует ссылку в буфер обмена', async () => {
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } });

		mediaSheet.open({ uuid: 'video-uuid-1', isGif: false });

		await mediaSheet.copy();

		expect(writeTextMock).toHaveBeenCalledWith('https://leonardo.osnova.io/video-uuid-1/');
		expect(notify.success).toHaveBeenCalledWith('Ссылка скопирована');
		expect(mediaSheet.current).toBeNull();
	});
});
