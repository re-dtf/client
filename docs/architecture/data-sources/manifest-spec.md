# Спецификация манифеста источника данных

Манифест источника данных — это файл `redtf-source.json`, расположенный в корне Git-репозитория источника. Он декларативно описывает, как клиент reDTF должен взаимодействовать со сторонним сервером.

## Полная структура

```json
{
  "manifestVersion": 1,
  "id": "unique-source-id",
  "name": "Название источника",
  "description": "Подробное описание для пользователей",
  "version": "1.0.0",
  "author": {
    "name": "Имя автора",
    "url": "https://ссылка-на-автора.com"
  },
  "icon": "https://example.com/icon.png",
  "homepage": "https://github.com/user/repo",
  "tags": ["dtf", "archive"],

  "api": {
    "baseUrl": "https://api.example.com/v1",
    "defaultHeaders": {
      "X-Client": "reDTF"
    }
  },

  "auth": {
    "type": "none" // или 'bio_verification', 'token_header', 'oauth2_pkce'
  },

  "permissions": [],
  "endpoints": {},
  "dependencies": [],

  "responseFormat": "redtf-native",
  "responseMapping": null
}
```

## Подробное описание полей

### 1. Метаданные

- `manifestVersion` (number, **обязательно**): Версия формата манифеста. Текущая — `1`.
- `id` (string, **обязательно**): Уникальный ID источника. Разрешены только `a-z`, `0-9`, `-`, `_`. Зарезервированные ID: `dtf`, `dtf-official`.
- `name` (string, **обязательно**): Отображаемое имя источника в интерфейсе клиента.
- `version` (string, **обязательно**): Текущая версия источника.
- `author` (object, **обязательно**): Объект с полем `name` (имя) и опциональным `url`.

### 2. API конфигурация (`api`)

- `baseUrl` (string, **обязательно**): Базовый URL сервера. Должен использовать протокол `https:` (или `http://localhost` для локальной разработки).
- `defaultHeaders` (object, опционально): Заголовки, которые клиент будет автоматически добавлять ко всем запросам к этому источнику.

### 3. Авторизация (`auth`)

Поле `auth.type` (string) определяет механизм авторизации.

**Если `type: "bio_verification"`:**
```json
"auth": {
  "type": "bio_verification",
  "bioVerification": {
    "challengeEndpoint": "/auth/challenge",
    "challengeMethod": "POST",
    "verifyEndpoint": "/auth/verify",
    "verifyMethod": "POST",
    "tokenHeader": "Authorization",
    "tokenPrefix": "Bearer "
  }
}
```

**Если `type: "token_header"`:**
```json
"auth": {
  "type": "token_header",
  "tokenHeader": {
    "headerName": "X-Api-Key",
    "inputLabel": "Введите API ключ сервера"
  }
}
```

**Если `type: "oauth2_pkce"`:**
```json
"auth": {
  "type": "oauth2_pkce",
  "oauth2": {
    "authorizationUrl": "https://server.com/oauth/authorize",
    "tokenUrl": "https://server.com/oauth/token",
    "clientId": "redtf-client",
    "scopes": ["read", "write"],
    "tokenHeader": "Authorization",
    "tokenPrefix": "Bearer "
  }
}
```

### 4. Разрешения (`permissions`)

Список разрешений, которые требуются источнику для мутации данных или публикации контента. Запрашиваются у пользователя при установке.

Поддерживаемые типы разрешений:
- `mutate:comments:restore`: неразрушающее восстановление удалённых комментариев из внешнего архива (наложение сохранённого текста и вложений с проверкой автора).
- `mutate:comments:replace`: полная замена существующих комментариев данными источника.
- `mutate:comments:append`: виртуальное добавление новых комментариев в дерево.
- `write:reactions`: отправка реакций и лайков на сервер источника.
- `write:comments`: отправка комментариев на сервер источника.

```json
"permissions": [
  {
    "id": "mutate:comments:restore",
    "target": "dtf",
    "description": "Восстановление текста удалённых комментариев из архива",
    "required": true
  }
]
```

### 5. Конечные точки (`endpoints`)

Словарь эндпоинтов, доступных на сервере. Ключи — стандартные идентификаторы методов API reDTF (например, `getPosts`, `getComments`, `getRestoredComments`, `reactToComment`).

Поля эндпоинта:
- `path` (string, **обязательно**): путь запроса с возможными шаблонами параметров (`/comments/post/{postId}`).
- `method` (string, **обязательно**): HTTP-метод (`GET`, `POST`, `PUT`, `DELETE`).
- `label` (string, опционально): понятное название операции для интерфейса.
- `description` (string, опционально): назначение эндпоинта.
- `timeoutMs` (number, опционально): предельное время ожидания ответа в миллисекундах (у клиента есть значение по умолчанию и верхний предел).
- `paged` (boolean, опционально): признак поддержки постраничной пагинации. Если `false`, результат считается полным дампом для данного ресурса (например, поста) и кэшируется клиентом на время сессии. Восстанавливающие источники (`mutate:comments:restore`) должны быть непагинированными.
- `mapping` (object, опционально): правила трансформации ответа для источников с `responseFormat: "mapped"`.

#### Структура сопоставления (`mapping`):

- `items` (string, опционально): точечный путь к массиву элементов внутри JSON-ответа (например `"data"` для `{ "status": "ok", "data": [...] }`). Если не указан, массив ожидается в корне ответа.
- `emptyStatuses` (number[], опционально): массив HTTP-кодов ответа, означающих «данных нет» (например `[404]`), превращаемых клиентом в пустой список без ошибки.
- `fields` (object, опционально): маппинг ключевых полей сущности (`id`, `authorId`, `content`, `media`):
  - `from` (string): точечный путь к значению в объекте элемента (например `"data.user.id"`).
  - `as` (string, опционально): преобразование типа (`"number"`, `"string"`, `"unixToIso"`, `"leonardoImage"`). Без него тип выбирается по имени поля.
  - Поле `media` всегда проходит полную очистку (допустимы только изображения и видео из проверенных сервисов), `as` на него не влияет.

Пример эндпоинта с маппингом стороннего архива:
```json
"endpoints": {
  "getRestoredComments": {
    "label": "Архив комментариев",
    "description": "Получает архивную копию комментариев поста",
    "path": "/comments/post/{postId}",
    "method": "GET",
    "paged": false,
    "timeoutMs": 12000,
    "mapping": {
      "items": "data",
      "emptyStatuses": [404],
      "fields": {
        "id": { "from": "id", "as": "number" },
        "authorId": { "from": "data.user.id", "as": "number" },
        "content": { "from": "data.text", "as": "string" },
        "media": { "from": "data.media" }
      }
    }
  }
}
```
*Шаблоны вроде `{postId}` в параметре `path` или `params` автоматически заменяются клиентом на фактические параметры при формировании HTTP-запроса.*

### 6. Зависимости (`dependencies`)

Массив объектов, указывающих на другие источники данных, которые должны быть активированы для корректной работы этого источника.

```json
"dependencies": [
  {
    "sourceId": "dtf",
    "reason": "Источник привязан к комментариям с DTF"
  }
]
```
