# Примеры манифестов источников данных

Ниже представлены примеры манифестов `redtf-source.json` для наиболее частых сценариев использования в экосистеме reDTF.

## Пример 1: Публичный архив удалённых комментариев (Read-Only)

Этот источник не требует авторизации и запрашивает у пользователя только разрешение на визуальную подмену комментариев, удалённых на официальном сайте DTF.

```json
{
  "manifestVersion": 1,
  "id": "dtf-archive",
  "name": "Архив комментариев",
  "description": "Восстанавливает удалённые комментарии с помощью публичного архива.",
  "version": "1.0.0",
  "author": {
    "name": "Community Archive"
  },
  "api": {
    "baseUrl": "https://archive.dtf-community.com/api/v1"
  },
  "auth": {
    "type": "none"
  },
  "permissions": [
    {
      "id": "mutate:comments:replace",
      "target": "dtf",
      "description": "Замена текста [Удалено] на восстановленный оригинал",
      "required": true
    }
  ],
  "endpoints": {
    "getComments": {
      "label": "Загрузка комментариев",
      "description": "Получает архивную копию комментариев для поста",
      "path": "/comments/{postId}",
      "method": "GET"
    }
  },
  "responseFormat": "redtf-native",
  "responseMapping": null
}
```

## Пример 2: Кастомная система реакций (Авторизация re:connect)

Альтернативная система реакций для комментариев (например, дизлайки). Требует аутентификации пользователя для защиты от накруток, используя безопасную валидацию через Bio профиля DTF.

```json
{
  "manifestVersion": 1,
  "id": "dtf-dislikes",
  "name": "Дизлайки для DTF",
  "description": "Возвращает дизлайки в комментарии. Авторизация проходит через временный код в вашем профиле.",
  "version": "1.1.0",
  "author": {
    "name": "reDTF Team",
    "url": "https://github.com/re-dtf"
  },
  "api": {
    "baseUrl": "https://reactions.redtf.org/api/v1"
  },
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
  },
  "permissions": [
    {
      "id": "write:reactions",
      "description": "Отправка ваших оценок на сервер",
      "required": true
    },
    {
      "id": "mutate:posts:enrich",
      "target": "dtf",
      "description": "Отображение дизлайков под комментариями",
      "required": true
    }
  ],
  "endpoints": {
    "reactToComment": {
      "label": "Оценка комментария",
      "description": "Отправляет ваш лайк/дизлайк",
      "path": "/comments/{commentId}/react",
      "method": "POST"
    }
  },
  "dependencies": [
    {
      "sourceId": "dtf",
      "reason": "Дизлайки привязываются к официальным комментариям"
    }
  ],
  "responseFormat": "redtf-native",
  "responseMapping": null
}
```

## Пример 3: Сторонний форум (OAuth2)

Интеграция стороннего форума как дополнительной ленты в клиенте. Использует стандартный OAuth2 для авторизации.

```json
{
  "manifestVersion": 1,
  "id": "gaming-forum",
  "name": "Gaming Forum Feed",
  "description": "Альтернативная лента постов со стороннего форума",
  "version": "2.0.0",
  "author": {
    "name": "Gaming Forum Admin"
  },
  "api": {
    "baseUrl": "https://api.gaming-forum.com/v2"
  },
  "auth": {
    "type": "oauth2_pkce",
    "oauth2": {
      "authorizationUrl": "https://gaming-forum.com/oauth/authorize",
      "tokenUrl": "https://api.gaming-forum.com/oauth/token",
      "clientId": "redtf-app",
      "scopes": ["read_posts", "write_comments"],
      "tokenHeader": "Authorization",
      "tokenPrefix": "Bearer "
    }
  },
  "permissions": [
    {
      "id": "write:comments",
      "description": "Публикация комментариев на форуме",
      "required": false
    }
  ],
  "endpoints": {
    "getPosts": {
      "label": "Лента постов",
      "description": "Загрузка постов",
      "path": "/feed",
      "method": "GET"
    },
    "getComments": {
      "label": "Комментарии форума",
      "description": "Загрузка комментариев к посту",
      "path": "/posts/{postId}/comments",
      "method": "GET"
    }
  },
  "responseFormat": "redtf-native",
  "responseMapping": null
}
```
