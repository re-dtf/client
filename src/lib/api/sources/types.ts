/**
 * Тип авторизации источника данных.
 * - 'none': публичный API, авторизация не требуется.
 * - 'bio_verification': re:connect, авторизация через проверочный код в Bio пользователя на DTF.
 * - 'token_header': ручной ввод API-ключа пользователем.
 * - 'oauth2_pkce': стандартная авторизация OAuth2 Authorization Code + PKCE.
 */
export type SourceAuthType = 'none' | 'bio_verification' | 'token_header' | 'oauth2_pkce';

/**
 * Разрешение для источника данных.
 * Запрашивается только для действий, отправляющих или модифицирующих контент (write/mutate).
 */
export interface SourcePermission {
	id: string; // Например, 'write:comments', 'mutate:comments:replace'
	target?: string; // ID целевого источника (например, 'dtf'), для которого происходит модификация
	description: string; // Человекочитаемое описание разрешения для UI
	required?: boolean; // Принудительное разрешение, без которого источник не может функционировать
}

/**
 * Описание конечной точки (endpoint) API источника.
 */
export interface SourceEndpoint {
	label: string; // Человекочитаемое название действия (например, «Получение комментариев поста»)
	description: string; // Описание того, что делает конечная точка
	path: string; // Относительный путь (например, '/comments/{postId}')
	method: 'GET' | 'POST' | 'PUT' | 'DELETE';
	params?: Record<string, string>; // Шаблоны параметров запроса
}

/**
 * Зависимость от другого источника данных.
 */
export interface SourceDependency {
	sourceId: string; // ID зависимого источника (например, 'dtf-official')
	reason: string; // Объяснение причины зависимости
}

/**
 * Манифест внешнего источника данных (redtf-source.json).
 */
export interface SourceManifest {
	manifestVersion: number; // Версия спецификации манифеста (на данный момент 1)
	id: string; // Уникальный строковый идентификатор источника
	name: string; // Отображаемое название источника
	description: string; // Описание источника
	version: string; // Версия источника (например, '1.0.0')
	author: {
		name: string;
		url?: string;
	};
	icon?: string; // Ссылка на иконку
	homepage?: string; // Домашняя страница проекта
	tags?: string[]; // Теги для категоризации

	api: {
		baseUrl: string; // Базовый URL API сервера
		defaultHeaders?: Record<string, string>; // Заголовки по умолчанию
	};

	auth: {
		type: SourceAuthType;
		bioVerification?: {
			challengeEndpoint: string;
			challengeMethod: 'GET' | 'POST';
			verifyEndpoint: string;
			verifyMethod: 'GET' | 'POST';
			tokenHeader: string;
			tokenPrefix?: string;
		};
		tokenHeader?: {
			headerName: string;
			inputLabel: string;
		};
		oauth2?: {
			authorizationUrl: string;
			tokenUrl: string;
			clientId: string;
			scopes: string[];
			tokenHeader: string;
			tokenPrefix?: string;
		};
	};

	permissions: SourcePermission[];
	endpoints: Record<string, SourceEndpoint>;
	dependencies?: SourceDependency[];

	responseFormat: 'redtf-native'; // В первой версии поддерживается только нативный формат reDTF
	responseMapping: null; // Зарезервировано для v2 (JSONPath маппинг)
}

/**
 * Состояние подключенного источника данных в локальном хранилище.
 */
export interface SourceState {
	manifestUrl: string; // URL, с которого был загружен манифест
	manifest: SourceManifest; // Кэшированный манифест
	enabled: boolean; // Включен ли источник
	grantedPermissions: string[]; // Список предоставленных разрешений (ID разрешений)
	authToken?: string; // Токен авторизации (если получен)
	authTokenExpiresAt?: number; // Время истечения токена в миллисекундах (timestamp)
	addedAt: number; // Время добавления источника (timestamp)
	lastUpdated: number; // Время последнего обновления манифеста (timestamp)
	isBuiltin: boolean; // Флаг встроенного источника (нельзя удалить, только выключить)
}

/**
 * Состояние отложенной очистки Bio (используется для bio_verification).
 */
export interface PendingBioCleanup {
	originalBio: string; // Исходный текст био пользователя до начала верификации
	sourceId: string; // ID верифицируемого источника
	code: string; // Код подтверждения, записанный в био
	timestamp: number; // Время записи кода (timestamp)
}

/**
 * Строгий Type Guard для валидации структуры SourceManifest.
 * Проверяет обязательные поля, их типы и безопасность API URL.
 */
export function isSourceManifest(obj: unknown): obj is SourceManifest {
	if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
		return false;
	}

	const manifest = obj as Record<string, any>;

	// 1. Метаданные
	if (typeof manifest.manifestVersion !== 'number' || manifest.manifestVersion <= 0) {
		return false;
	}
	if (typeof manifest.id !== 'string' || manifest.id.trim() === '') {
		return false;
	}
	if (typeof manifest.name !== 'string' || manifest.name.trim() === '') {
		return false;
	}
	if (typeof manifest.description !== 'string') {
		return false;
	}
	if (typeof manifest.version !== 'string' || manifest.version.trim() === '') {
		return false;
	}

	// 2. Автор
	if (typeof manifest.author !== 'object' || manifest.author === null || Array.isArray(manifest.author)) {
		return false;
	}
	if (typeof manifest.author.name !== 'string' || manifest.author.name.trim() === '') {
		return false;
	}
	if (manifest.author.url !== undefined && typeof manifest.author.url !== 'string') {
		return false;
	}

	// 3. Опциональные поля метаданных
	if (manifest.icon !== undefined && typeof manifest.icon !== 'string') {
		return false;
	}
	if (manifest.homepage !== undefined && typeof manifest.homepage !== 'string') {
		return false;
	}
	if (manifest.tags !== undefined) {
		if (!Array.isArray(manifest.tags) || !manifest.tags.every((tag) => typeof tag === 'string')) {
			return false;
		}
	}

	// 4. API Подключение
	if (typeof manifest.api !== 'object' || manifest.api === null || Array.isArray(manifest.api)) {
		return false;
	}
	const api = manifest.api as Record<string, any>;
	if (typeof api.baseUrl !== 'string' || api.baseUrl.trim() === '') {
		return false;
	}
	// Безопасность: baseUrl должен начинаться с https:// или http://localhost (или 127.0.0.1) для тестирования
	const isSecureUrl = /^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(api.baseUrl);
	if (!isSecureUrl) {
		return false;
	}
	if (api.defaultHeaders !== undefined) {
		if (typeof api.defaultHeaders !== 'object' || api.defaultHeaders === null || Array.isArray(api.defaultHeaders)) {
			return false;
		}
		for (const [key, val] of Object.entries(api.defaultHeaders)) {
			if (typeof key !== 'string' || typeof val !== 'string') {
				return false;
			}
		}
	}

	// 5. Авторизация
	if (typeof manifest.auth !== 'object' || manifest.auth === null || Array.isArray(manifest.auth)) {
		return false;
	}
	const auth = manifest.auth as Record<string, any>;
	const validAuthTypes: SourceAuthType[] = ['none', 'bio_verification', 'token_header', 'oauth2_pkce'];
	if (!validAuthTypes.includes(auth.type)) {
		return false;
	}

	if (auth.type === 'bio_verification') {
		if (typeof auth.bioVerification !== 'object' || auth.bioVerification === null || Array.isArray(auth.bioVerification)) {
			return false;
		}
		const bv = auth.bioVerification as Record<string, any>;
		if (typeof bv.challengeEndpoint !== 'string' || bv.challengeEndpoint.trim() === '') {
			return false;
		}
		if (bv.challengeMethod !== 'GET' && bv.challengeMethod !== 'POST') {
			return false;
		}
		if (typeof bv.verifyEndpoint !== 'string' || bv.verifyEndpoint.trim() === '') {
			return false;
		}
		if (bv.verifyMethod !== 'GET' && bv.verifyMethod !== 'POST') {
			return false;
		}
		if (typeof bv.tokenHeader !== 'string' || bv.tokenHeader.trim() === '') {
			return false;
		}
		if (bv.tokenPrefix !== undefined && typeof bv.tokenPrefix !== 'string') {
			return false;
		}
	}

	if (auth.type === 'token_header') {
		if (typeof auth.tokenHeader !== 'object' || auth.tokenHeader === null || Array.isArray(auth.tokenHeader)) {
			return false;
		}
		const th = auth.tokenHeader as Record<string, any>;
		if (typeof th.headerName !== 'string' || th.headerName.trim() === '') {
			return false;
		}
		if (typeof th.inputLabel !== 'string' || th.inputLabel.trim() === '') {
			return false;
		}
	}

	if (auth.type === 'oauth2_pkce') {
		if (typeof auth.oauth2 !== 'object' || auth.oauth2 === null || Array.isArray(auth.oauth2)) {
			return false;
		}
		const oa = auth.oauth2 as Record<string, any>;
		if (typeof oa.authorizationUrl !== 'string' || oa.authorizationUrl.trim() === '') {
			return false;
		}
		const isAuthUrlSecure = /^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(oa.authorizationUrl);
		if (!isAuthUrlSecure) {
			return false;
		}
		if (typeof oa.tokenUrl !== 'string' || oa.tokenUrl.trim() === '') {
			return false;
		}
		const isTokenUrlSecure = /^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(oa.tokenUrl);
		if (!isTokenUrlSecure) {
			return false;
		}
		if (typeof oa.clientId !== 'string' || oa.clientId.trim() === '') {
			return false;
		}
		if (!Array.isArray(oa.scopes) || !oa.scopes.every((s) => typeof s === 'string')) {
			return false;
		}
		if (typeof oa.tokenHeader !== 'string' || oa.tokenHeader.trim() === '') {
			return false;
		}
		if (oa.tokenPrefix !== undefined && typeof oa.tokenPrefix !== 'string') {
			return false;
		}
	}

	// 6. Разрешения (Permissions)
	if (!Array.isArray(manifest.permissions)) {
		return false;
	}
	for (const perm of manifest.permissions) {
		if (typeof perm !== 'object' || perm === null || Array.isArray(perm)) {
			return false;
		}
		if (typeof perm.id !== 'string' || perm.id.trim() === '') {
			return false;
		}
		if (perm.target !== undefined && typeof perm.target !== 'string') {
			return false;
		}
		if (typeof perm.description !== 'string') {
			return false;
		}
		if (perm.required !== undefined && typeof perm.required !== 'boolean') {
			return false;
		}
	}

	// 7. Конечные точки (Endpoints)
	if (typeof manifest.endpoints !== 'object' || manifest.endpoints === null || Array.isArray(manifest.endpoints)) {
		return false;
	}
	for (const [key, val] of Object.entries(manifest.endpoints)) {
		if (typeof key !== 'string' || key.trim() === '') {
			return false;
		}
		if (typeof val !== 'object' || val === null || Array.isArray(val)) {
			return false;
		}
		const ep = val as Record<string, any>;
		if (typeof ep.label !== 'string' || ep.label.trim() === '') {
			return false;
		}
		if (typeof ep.description !== 'string') {
			return false;
		}
		if (typeof ep.path !== 'string' || ep.path.trim() === '') {
			return false;
		}
		const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
		if (!validMethods.includes(ep.method)) {
			return false;
		}
		if (ep.params !== undefined) {
			if (typeof ep.params !== 'object' || ep.params === null || Array.isArray(ep.params)) {
				return false;
			}
			for (const [paramKey, paramVal] of Object.entries(ep.params)) {
				if (typeof paramKey !== 'string' || typeof paramVal !== 'string') {
					return false;
				}
			}
		}
	}

	// 8. Зависимости (Dependencies)
	if (manifest.dependencies !== undefined) {
		if (!Array.isArray(manifest.dependencies)) {
			return false;
		}
		for (const dep of manifest.dependencies) {
			if (typeof dep !== 'object' || dep === null || Array.isArray(dep)) {
				return false;
			}
			if (typeof dep.sourceId !== 'string' || dep.sourceId.trim() === '') {
				return false;
			}
			if (typeof dep.reason !== 'string') {
				return false;
			}
		}
	}

	// 9. Формат и отображение
	if (manifest.responseFormat !== 'redtf-native') {
		return false;
	}
	if (manifest.responseMapping !== null) {
		return false;
	}

	return true;
}
