import { describe, expect, it } from 'vitest';
import { analyzeError } from './errorInfo';
import { ApiError } from './errors';

describe('errorInfo', () => {
	it('detects network failure from Firefox NetworkError message with balanced advice', () => {
		const err = new Error('Сетевая ошибка: NetworkError when attempting to fetch resource.');
		const info = analyzeError(err, { url: 'https://api.dtf.ru/v2.31/feed' });

		expect(info.kind).toBe('network_error');
		expect(info.title).toBe('Не удалось связаться с сервером');
		expect(info.badge).toBe('Ошибка сети');
		expect(info.suggestions.some((s) => s.includes('VPN'))).toBe(true);
		expect(info.suggestions.some((s) => s.includes('DTF'))).toBe(true);
		expect(info.technicalDetails.rawMessage).toContain('NetworkError');
		expect(info.technicalDetails.url).toBe('https://api.dtf.ru/v2.31/feed');
	});

	it('detects network failure from Chrome Failed to fetch', () => {
		const err = new ApiError('Сетевая ошибка: Failed to fetch', {
			url: 'https://api.dtf.ru/v2.31/feed',
			rawMessage: 'Failed to fetch'
		});
		const info = analyzeError(err);

		expect(info.kind).toBe('network_error');
		expect(info.title).toBe('Не удалось связаться с сервером');
		expect(info.technicalDetails.rawMessage).toBe('Failed to fetch');
	});

	it('detects DTF down from 502 status', () => {
		const err = new ApiError('Сервер DTF временно недоступен (код 502)', {
			url: 'https://api.dtf.ru/v2.31/feed',
			status: 502,
			rawMessage: 'Bad Gateway'
		});
		const info = analyzeError(err);

		expect(info.kind).toBe('dtf_down');
		expect(info.title).toBe('Серверы DTF временно недоступны');
		expect(info.badge).toContain('502');
		expect(info.technicalDetails.status).toBe(502);
	});

	it('detects DTF down from Cloudflare 521 in message', () => {
		const err = new Error('Ошибка API: 521');
		const info = analyzeError(err, { url: 'https://api.dtf.ru/v2.31/feed' });

		expect(info.kind).toBe('dtf_down');
		expect(info.technicalDetails.status).toBe(521);
	});

	it('detects 429 rate limit', () => {
		const err = new ApiError('Слишком много запросов к DTF (код 429)', {
			url: 'https://api.dtf.ru/v2.31/feed',
			status: 429
		});
		const info = analyzeError(err);

		expect(info.kind).toBe('rate_limit');
		expect(info.title).toBe('Слишком много запросов');
	});

	it('detects CORS / proxy errors', () => {
		const err = new Error('Запрос заблокирован CORS. Настройте прокси-сервер.');
		const info = analyzeError(err);

		expect(info.kind).toBe('cors_proxy');
		expect(info.badge).toContain('CORS');
	});

	it('provides technical details for copy and debugging', () => {
		const err = new ApiError('Сетевая ошибка: NetworkError when attempting to fetch resource.', {
			url: 'https://api.dtf.ru/v2.31/feed',
			rawMessage: 'NetworkError when attempting to fetch resource.'
		});
		const info = analyzeError(err);

		expect(info.technicalDetails.rawMessage).toBe('NetworkError when attempting to fetch resource.');
		expect(info.technicalDetails.url).toBe('https://api.dtf.ru/v2.31/feed');
		expect(info.technicalDetails.timestamp).toBeDefined();
	});
});
