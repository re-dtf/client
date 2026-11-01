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

```json
"permissions": [
  {
    "id": "mutate:comments:replace",
    "target": "dtf",
    "description": "Подмена удалённых комментариев DTF",
    "required": true
  }
]
```

### 5. Конечные точки (`endpoints`)

Словарь эндпоинтов, доступных на сервере. Ключи — стандартные идентификаторы методов API reDTF (например, `getPosts`, `getComments`, `reactToComment`).

```json
"endpoints": {
  "getComments": {
    "label": "Получение комментариев поста",
    "description": "Загружает комментарии",
    "path": "/comments/{postId}",
    "method": "GET"
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
