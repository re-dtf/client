/**
 * Список встроенных (доверенных) источников данных, которые поставляются вместе с клиентом.
 * Эти источники имеют статус isBuiltin: true, их нельзя удалить из системы (можно только отключить).
 */
export const BUILTIN_SOURCES: string[] = [
	// 'github:re-dtf/somesource',
];

/**
 * URL официального каталога источников данных reDTF.
 */
export const CATALOG_URL = 'https://raw.githubusercontent.com/re-dtf/source-catalog/main/catalog.json';
