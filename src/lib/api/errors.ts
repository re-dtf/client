/**
 * Ошибка запроса к API.
 * Хранит исходный URL, статус HTTP и сырое сообщение браузера или бэкенда.
 */
export class ApiError extends Error {
	readonly url?: string;
	readonly status?: number;
	readonly rawMessage?: string;

	constructor(
		message: string,
		options?: {
			url?: string;
			status?: number;
			rawMessage?: string;
			cause?: unknown;
		}
	) {
		super(message);
		this.name = 'ApiError';
		this.url = options?.url;
		this.status = options?.status;
		this.rawMessage = options?.rawMessage;
		if (options?.cause !== undefined) {
			this.cause = options.cause;
		}
	}
}
