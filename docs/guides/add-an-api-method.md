# Добавить метод API

Как устроен слой: [architecture/api.md](../architecture/api.md). Прежде чем писать запрос, найдите метод в описании API (`.agents/skills/dtf-api`, см. `SKILL.md` внутри). Если его там нет, снимите запись трафика сайта и добавьте метод в [api-docs](https://github.com/re-dtf/api-docs), а не угадывайте поля.

Пример: `getSubscriptionsFeed(cursor)` — лента подписок вошедшего пользователя только у DTF.

1. **Типы.** В `src/lib/api/types.ts` опишите результат (если нужен новый тип) и добавьте метод в `ApiProvider`. Необязательный (`method?`), если умеет не каждый провайдер:

   ```ts
   getSubscriptionsFeed?(cursor?: CursorData): Promise<PaginatedResult<Post>>;
   ```

2. **Провайдер DTF.** В `providers/dtf/index.ts` добавьте метод в `dtfApiProvider`. Запрос делайте через `fetchWithAuth` (токен и обновление при 401 уже обработаны), адреса бери из `client.ts`, разбор ответа выноси в `mappers.ts`:

   ```ts
   async getSubscriptionsFeed(cursor?: CursorData): Promise<PaginatedResult<Post>> {
   	requireAuth();
   	const response = await fetchWithAuth(`${API_URL}/…${cursorQuery(cursor)}`);
   	const { result } = await response.json();
   	return { items: entriesOf(result.items).map(mapEntryToPost), lastId: result.lastId, lastSortingValue: result.lastSortingValue };
   }
   ```

   Ошибки сети и плохие статусы `fetchWithAuth` превращает в `Error` сам; не пропускайте наружу сырые исключения `fetch`.

3. **Фасад.** В `api/index.svelte.ts` добавьте строку. Для метода только DTF — прямое делегирование:

   ```ts
   getSubscriptionsFeed: dtfApiProvider.getSubscriptionsFeed,
   ```

   Если метод должен опрашивать и подключённые источники, добавьте поддержку в `providers/source.ts` и объедините результаты в фасаде по образцу `getPosts`.

4. **Использование.** Компоненты вызывают `api.getSubscriptionsFeed()`. Не импортируйте `providers/dtf` в UI.

5. **Тесты.** Для нового маппера добавьте проверку в `providers/dtf/mappers.test.ts`. Если в фасаде появилась логика (слияние, выбор источника, разрешения), добавьте тест в `api/index.test.ts`.

## Правила

- Метод не должен знать о Svelte-компонентах и навигации.
- Данные возвращаются в наших типах (`api/types.ts`), не в сыром виде DTF.
- Права и разрешения источников проверяет фасад, не провайдер.
- Новый тип данных, которого касаются и источники, получает поле `sourceId`.
