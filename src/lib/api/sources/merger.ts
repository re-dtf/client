import type { Post, PaginatedResult, CursorData } from '../types';

/**
 * Объединить результаты запроса постов из нескольких источников.
 * Возвращает отсортированный массив постов и составной объект курсоров.
 * Сортировка по убыванию даты (от новых к старым).
 *
 * @param results Массив объектов с sourceId и результатами пагинации постов
 * @returns Единый PaginatedResult с составным курсором
 */
export function mergePosts(
	results: { sourceId: string; result: PaginatedResult<Post> }[],
	sorting: string = 'date'
): PaginatedResult<Post> {
	const allItems: Post[] = [];
	// Защита от Prototype Pollution: используем Object.create(null) вместо {}
	const cursors: Record<string, CursorData> = Object.create(null);

	// Собираем курсоры и подготавливаем массивы постов с фоллбеком
	const arrays = results.map(({ sourceId, result }) => {
		if (result?.lastId !== undefined || result?.lastSortingValue !== undefined) {
			cursors[sourceId] = {
				lastId: result?.lastId ?? 0,
				lastSortingValue: result?.lastSortingValue ?? 0
			};
		}
		
		// Защитный fallback: проверяем result и фильтруем битые элементы (null/undefined)
		return Array.isArray(result?.items) 
			? result.items.filter(item => item !== null && typeof item === 'object') 
			: [];
	});

	if (sorting === 'new' || sorting === 'date') {
		// Для свежего — жесткая сортировка по времени (по убыванию)
		for (const arr of arrays) {
			allItems.push(...arr);
		}

		// Оптимизация производительности: парсим даты один раз (Schwartzian transform)
		const mapped = allItems.map(item => {
			const time = Date.parse(item?.createdAt || '');
			return {
				item,
				time: Number.isNaN(time) ? 0 : time
			};
		});

		mapped.sort((a, b) => b.time - a.time);
		
		return {
			items: mapped.map(m => m.item),
			cursors
		};
	} else {
		// Для "hotness" / "popular" — чередование (Round-robin interleaving)
		// Сохраняет внутреннее ранжирование каждого источника
		let i = 0;
		let hasMore = true;
		
		while (hasMore) {
			hasMore = false;
			for (const arr of arrays) {
				if (i < arr.length) {
					allItems.push(arr[i]);
					hasMore = true;
				}
			}
			i++;
		}

		return {
			items: allItems,
			cursors
		};
	}
}
