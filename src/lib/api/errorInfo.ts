import { ApiError } from './errors';

export type ErrorKind =
	| 'network_error'
	| 'dtf_down'
	| 'offline'
	| 'rate_limit'
	| 'auth_error'
	| 'cors_proxy'
	| 'unknown_error';

export interface ErrorTechnicalDetails {
	rawMessage: string;
	url?: string;
	status?: number;
	timestamp: string;
}

export interface ErrorAnalysis {
	kind: ErrorKind;
	badge: string;
	badgeType: 'warning' | 'error' | 'info';
	title: string;
	subtitle: string;
	description: string;
	suggestions: string[];
	technicalDetails: ErrorTechnicalDetails;
}

/**
 * Извлекает сырое сообщение из ошибки любого типа.
 */
function getRawMessage(error: unknown): string {
	if (error instanceof ApiError && error.rawMessage) {
		return error.rawMessage;
	}
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	if (error && typeof error === 'object' && 'message' in error) {
		return String((error as { message: unknown }).message);
	}
	return 'Неизвестная ошибка';
}

/**
 * Пытается найти HTTP-код статуса в ошибке или её сообщении.
 */
function extractStatus(error: unknown, contextStatus?: number): number | undefined {
	if (contextStatus) return contextStatus;
	if (error instanceof ApiError && error.status) return error.status;
	if (error && typeof error === 'object' && 'status' in error && typeof (error as any).status === 'number') {
		return (error as any).status;
	}

	const raw = getRawMessage(error);
	const match = raw.match(/(?:статус|код|status|ошибка(?:\s+api)?[:\s]+)\s*(\d{3})\b/i) || raw.match(/\b(4\d{2}|5\d{2})\b/);
	if (match) {
		const parsed = parseInt(match[1], 10);
		if (parsed >= 400 && parsed <= 599) return parsed;
	}
	return undefined;
}

/**
 * Извлекает URL запроса.
 */
function extractUrl(error: unknown, contextUrl?: string): string | undefined {
	if (contextUrl) return contextUrl;
	if (error instanceof ApiError && error.url) return error.url;
	if (error && typeof error === 'object' && 'url' in error && typeof (error as any).url === 'string') {
		return (error as any).url;
	}
	return undefined;
}

/**
 * Анализирует ошибку запроса и возвращает структурированную информацию и рекомендации.
 */
export function analyzeError(
	error: unknown,
	context?: { url?: string; status?: number }
): ErrorAnalysis {
	const rawMessage = getRawMessage(error);
	const status = extractStatus(error, context?.status);
	const url = extractUrl(error, context?.url) || 'https://api.dtf.ru';

	const technicalDetails: ErrorTechnicalDetails = {
		rawMessage,
		url,
		status,
		timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
	};

	const lower = rawMessage.toLowerCase();
	const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

	// 1. Офлайн (нет интернета на устройстве)
	if (isOffline || lower.includes('offline') || lower.includes('err_internet_disconnected') || lower.includes('сеть недоступна')) {
		return {
			kind: 'offline',
			badge: 'Офлайн',
			badgeType: 'warning',
			title: 'Нет подключения к интернету',
			subtitle: 'Устройство не подключено к сети',
			description: 'Браузер сообщает об отсутствии соединения с интернетом. Проверьте подключение устройства.',
			suggestions: [
				'Убедитесь, что включён Wi-Fi или мобильная передача данных.',
				'Проверьте, не включён ли режим «В самолёте».',
				'После восстановления связи нажмите кнопку «Повторить попытку».'
			],
			technicalDetails
		};
	}

	// 2. Лимит запросов (HTTP 429)
	if (status === 429 || lower.includes('429') || lower.includes('too many requests') || lower.includes('слишком много запросов')) {
		return {
			kind: 'rate_limit',
			badge: 'Лимит (429)',
			badgeType: 'warning',
			title: 'Слишком много запросов',
			subtitle: 'Временное ограничение DTF',
			description: 'Сервер DTF временно ограничил частоту запросов с вашего IP-адреса для защиты от перегрузки.',
			suggestions: [
				'Подождите 1–2 минуты перед следующим обновлением страницы.',
				'Если вы используете общественный Wi-Fi или общий VPN, попробуйте сменить сервер или IP-адрес.'
			],
			technicalDetails
		};
	}

	// 3. Серверы DTF лежат (5xx: 500, 502 Bad Gateway, 503, 504, 520-526 Cloudflare)
	const is5xx = status !== undefined && status >= 500 && status <= 599;
	const isServerDownText =
		lower.includes('bad gateway') ||
		lower.includes('service unavailable') ||
		lower.includes('gateway timeout') ||
		lower.includes('сервер dtf временно недоступен') ||
		lower.includes('web server is down') ||
		/\b(500|502|503|504|520|521|522|523|524|525|526)\b/.test(lower);

	if (is5xx || isServerDownText) {
		const codeText = status ? ` (код ${status})` : '';
		return {
			kind: 'dtf_down',
			badge: `Сбой DTF${codeText}`,
			badgeType: 'error',
			title: 'Серверы DTF временно недоступны',
			subtitle: status ? `Ошибка сервера DTF: ${status}` : 'Сбой на стороне DTF',
			description: 'Серверы DTF или сервис защиты (Cloudflare / DDoS-Guard) сейчас не отвечают на запросы. Это временная проблема на стороне самого сайта DTF.',
			suggestions: [
				'Подождите несколько минут — обычно подобные сбои устраняются автоматически.',
				'Проверьте, открывается ли сайт dtf.ru в браузере. Если он тоже не работает — проблема глобальная.',
				'Если лента уже была открыта, вы можете просматривать ранее загруженные посты из кэша.'
			],
			technicalDetails
		};
	}

	// 4. CORS / блокировка прокси
	if (lower.includes('cors') || lower.includes('cross-origin') || lower.includes('прокси')) {
		return {
			kind: 'cors_proxy',
			badge: 'CORS / Прокси',
			badgeType: 'warning',
			title: 'Запрос заблокирован браузером',
			subtitle: 'Ограничение политики CORS',
			description: 'Браузер заблокировал прямой сетевой запрос к серверу DTF. Для входа и обновления токена требуется рабочий CORS-прокси.',
			suggestions: [
				'Откройте настройки reDTF и проверьте адрес прокси-сервера.',
				'Убедитесь, что прокси-сервер запущен и доступен по указанному URL.'
			],
			technicalDetails
		};
	}

	// 5. Ошибка авторизации (401 / 403)
	if (status === 401 || (status === 403 && !lower.includes('cloudflare'))) {
		return {
			kind: 'auth_error',
			badge: `Доступ (${status || 401})`,
			badgeType: 'warning',
			title: 'Ошибка авторизации',
			subtitle: 'Сессия истекла или доступ ограничен',
			description: 'Сервер DTF отклонил запрос из-за недействительного токена или ограничения прав доступа.',
			suggestions: [
				'Попробуйте войти в аккаунт заново через настройки или окно входа.',
				'Если вход был выполнен по токену, скопируйте свежее значение auth-refresh-remember.'
			],
			technicalDetails
		};
	}

	// 6. Сетевая ошибка (обрыв соединения, Failed to fetch, NetworkError, DNS, VPN, сбой маршрутизации)
	const isFetchFailure =
		lower.includes('networkerror') ||
		lower.includes('failed to fetch') ||
		lower.includes('load failed') ||
		lower.includes('connection was lost') ||
		lower.includes('err_name_not_resolved') ||
		lower.includes('ns_error_net_reset') ||
		lower.includes('err_connection_reset') ||
		lower.includes('econnrefused') ||
		lower.includes('сетевая ошибка');

	if (isFetchFailure) {
		return {
			kind: 'network_error',
			badge: 'Ошибка сети',
			badgeType: 'warning',
			title: 'Не удалось связаться с сервером',
			subtitle: 'Браузер не смог получить ответ от api.dtf.ru',
			description: 'Запрос к серверам DTF оборвался до получения ответа. Это может происходить по разным причинам: кратковременный сбой на стороне DTF, неполадки с интернет-соединением, блокировка российских доменов (.ru) включённым VPN или защитным DNS, либо ограничения браузерных расширений.',
			suggestions: [
				'Повторите попытку через пару минут: серверы DTF или сетевой маршрут могли кратковременно сбоить.',
				'Если включён VPN или сторонний DNS: некоторые зарубежные сервисы блокируют доступ к доменам .ru. Попробуйте временно отключить VPN или добавить dtf.ru в исключения.',
				'Проверьте интернет-соединение и доступность сайта dtf.ru в соседней вкладке.',
				'Убедитесь, что сетевой запрос не заблокирован расширениями браузера (блокировщики рекламы/скриптов) или антивирусом.',
				'Вы также можете настроить прокси-сервер в настройках reDTF.'
			],
			technicalDetails
		};
	}

	// 7. Прочие непредвиденные ошибки
	return {
		kind: 'unknown_error',
		badge: 'Ошибка',
		badgeType: 'error',
		title: 'Произошла ошибка',
		subtitle: rawMessage.replace(/^Сетевая ошибка:\s*/, ''),
		description: 'Не удалось завершить операцию. Проверьте соединение с интернетом или повторите попытку.',
		suggestions: [
			'Нажмите «Повторить попытку» для повторной отправки запроса.',
			'Проверьте стабильность интернет-соединения.',
			'Если ошибка повторяется, попробуйте обновить страницу.'
		],
		technicalDetails
	};
}
