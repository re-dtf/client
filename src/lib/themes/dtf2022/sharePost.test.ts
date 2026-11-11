import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	openOverlay: vi.fn(),
	auth: { isAuthenticated: false },
	notify: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

vi.mock('$lib/api/index.svelte', () => ({
	api: {}
}));

vi.mock('$lib/navigation', () => ({
	openOverlay: mocks.openOverlay,
	getPostPath: (post: { id: number; sourceId: string }) => `/post/${post.id}`
}));

vi.mock('$lib/storage/auth.svelte', () => ({
	authStorage: mocks.auth
}));

vi.mock('./ui/notify.svelte', () => ({
	notify: mocks.notify
}));

import { sharePost } from './actions.svelte';

describe('sharePost', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('делится ссылкой на reDTF через navigator.share, если он поддерживается', async () => {
		const shareMock = vi.fn().mockResolvedValue(undefined);
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', {
			share: shareMock,
			clipboard: { writeText: writeTextMock }
		});

		await sharePost({ id: 12345, sourceId: 'dtf', title: 'Тестовый пост', url: 'https://dtf.ru/12345' });

		expect(shareMock).toHaveBeenCalledWith({
			title: 'Тестовый пост',
			url: expect.stringMatching(/\/post\/12345$/)
		});
		expect(shareMock.mock.calls[0][0].url).not.toContain('dtf.ru');
		expect(writeTextMock).not.toHaveBeenCalled();
	});

	it('игнорирует отмену шаринга пользователем (AbortError)', async () => {
		const abortError = new Error('Share canceled');
		abortError.name = 'AbortError';
		const shareMock = vi.fn().mockRejectedValue(abortError);
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', {
			share: shareMock,
			clipboard: { writeText: writeTextMock }
		});

		await sharePost({ id: 12345, sourceId: 'dtf', title: 'Тестовый пост' });

		expect(shareMock).toHaveBeenCalled();
		expect(writeTextMock).not.toHaveBeenCalled();
		expect(mocks.notify.error).not.toHaveBeenCalled();
	});

	it('копирует ссылку на reDTF в буфер обмена и показывает уведомление, если navigator.share нет', async () => {
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', {
			clipboard: { writeText: writeTextMock }
		});

		await sharePost({ id: 98765, sourceId: 'dtf', title: 'Без шаринга', url: 'https://dtf.ru/98765' });

		expect(writeTextMock).toHaveBeenCalledWith(expect.stringMatching(/\/post\/98765$/));
		expect(writeTextMock.mock.calls[0][0]).not.toContain('dtf.ru');
		expect(mocks.notify.success).toHaveBeenCalledWith('Ссылка скопирована');
	});

	it('показывает ошибку при сбое копирования в буфер', async () => {
		const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard denied'));
		vi.stubGlobal('navigator', {
			clipboard: { writeText: writeTextMock }
		});

		await sharePost({ id: 98765, sourceId: 'dtf', title: 'Ошибка буфера' });

		expect(mocks.notify.error).toHaveBeenCalledWith('Не удалось скопировать ссылку');
	});
});
