import type { Post, PaginatedResult, CursorData, Comment } from '../types';

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
			? result.items
					.filter(item => item !== null && typeof item === 'object')
					.map(item => ({ ...item, sourceId: item.sourceId ?? sourceId }))
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

/**
 * Объединить комментарии с поддержкой append и replace.
 *
 * @param primary Основной массив комментариев (обычно из DTF)
 * @param additions Массив дополнительных комментариев от других источников
 * @returns Итоговый массив комментариев
 */
export function mergeComments(
	primary: Comment[],
	additions: { sourceId: string; comments: Comment[]; mode: 'append' | 'replace' }[]
): Comment[] {
	// Защита от битых элементов в массиве
	const result = primary.filter(c => c !== null && typeof c === 'object');
	
	// Используем Map для защиты от Prototype Pollution и O(1) поиска
	const primaryMap = new Map<number, number>(); // id -> index в result
	for (let i = 0; i < result.length; i++) {
		primaryMap.set(result[i].id, i);
	}

	for (const addition of additions) {
		// Защита от некорректных данных от сторонних источников
		if (!addition || !Array.isArray(addition.comments)) continue;

		if (addition.mode === 'replace') {
			for (const addedComment of addition.comments) {
				if (!addedComment || typeof addedComment !== 'object') continue;

				const normalizedId = Number(addedComment.id);
				const existingIndex = Number.isNaN(normalizedId) ? undefined : primaryMap.get(normalizedId);
				if (existingIndex !== undefined) {
					const existing = result[existingIndex];
					result[existingIndex] = {
						...addedComment,
						sourceId: addedComment.sourceId ?? addition.sourceId,
						id: existing.id,
						replyTo: existing.replyTo,
						isReplaced: true,
						// Сохраняем самый первый sourceId, даже если комментарий подменяется дважды
						originalSourceId: existing.originalSourceId ?? existing.sourceId
					};
				}
			}
		} else if (addition.mode === 'append') {
			for (const addedComment of addition.comments) {
				if (!addedComment || typeof addedComment !== 'object') continue;
				result.push({
					...addedComment,
					sourceId: addedComment.sourceId ?? addition.sourceId
				});
			}
		}
	}

	return result;
}
