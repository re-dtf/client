# DTF Editor API Documentation (v2.1)

This documentation provides a comprehensive overview of the endpoints and data structures used by the DTF Editor API, based on captured network traffic (`.har` files). All endpoints are accessed via the `api.dtf.ru` host.

## Authentication
Most editor operations require authentication. This is provided via the `JWTAuthorization` header.

```http
JWTAuthorization: Bearer <your_jwt_token>
```
Typically, a `pwa: 1` header is also passed along with the requests.

---

## 1. Initializing the Editor (Fetch configuration)

Fetches the initial configuration, allowed blocks, and access rights for the editor.

**Endpoint:** `GET https://api.dtf.ru/v2.1/editor/0`

**Response Example:**
```json
{
  "message": "",
  "result": {
    "entry": {
      "type": 1,
      "user_id": 626676,
      "subsite_id": 626676,
      "currentVersionId": null
    },
    "editor": {
      "owners": [ ... ],
      "authors": [ ... ],
      "cdnPath": "https://paragraph.osnova.app/",
      "cdnVersion": "3d273aaae1f13be1c32df8843af7db5e",
      "plugins": [
        "paragraph", "header", "media", "instagram", "twitter", "embed", "quote",
        "incut", "list", "link", "number", "quiz", "audio", "code", "andropov",
        "delimiter", "telegram", "special", "person", "yamusic", "tiktok", "spotify", "osnovaEmbed"
      ],
      "accessLevels": {
        "yellow_features": false,
        "isAdult": true,
        "isPro": false,
        "isManagingProSubsite": false
        // ...
      }
    }
  }
}
```

---

## 2. Saving a Post (Draft or Publish)

Creates a new draft or updates an existing post's content.

**Endpoint:** `POST https://api.dtf.ru/v2.1/editor`

**Headers:**
- `Content-Type`: `multipart/form-data`

**Request Body:**
The request uses `multipart/form-data` with a single field named `entry`. The value of this field is a JSON string detailing the post configuration and block content.

### Payload Structure (`entry` field):

```json
{
  "id": 5181817,               // 0 if creating a new draft, otherwise the existing post ID
  "user_id": 626676,           // ID of the user authoring the post
  "type": 1,
  "subsite_id": 626676,        // ID of the blog/subsite the post belongs to
  "title": "какой-то заголовок",
  "entry": {
    "blocks": [
      // Array of Block objects. See "Supported Block Types" below.
    ]
  },
  "external_access_link": "",
  "path": "",
  "is_editorial": false,
  "is_advertisement": false,
  "is_enabled_comments": true,
  "is_enabled_likes": true,
  "withheld": false,
  "is_enabled_ad": true,
  "is_holdonflash": false,
  "forced_to_mainpage": 0,
  "is_holdonmain": false,
  "is_published": false,       // Set to true to actually publish the post
  "is_adult": false,
  "repostId": null,
  "repostData": null
}
```

### Supported Block Types

Each element in the `entry.blocks` array has a standard structure: `type`, `cover`, `hidden`, `anchor`, and a specific `data` object payload.

#### Paragraph (Text)
```json
{
  "type": "text",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "text": "<p>Текст в посте</p>"
  }
}
```

#### Header
```json
{
  "type": "header",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "style": "h2", // "h2", "h3"
    "text": "Подзаголовок в посте"
  }
}
```

#### Media (Images / Videos)
```json
{
  "type": "media",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "items": [
      {
        "title": "",
        "image": {
          "type": "image",
          "data": {
            "uuid": "a784df1a-394d-54a4-96f8-2e72a953e3eb",
            "width": 2560,
            "height": 1440,
            "size": 394993,
            "type": "jpg",
            "color": "181012",
            "hash": "",
            "external_service": [],
            "base64preview": "/9j/4AAQSkZ...", // Base64 encoded low-res preview
            "isVideo": false,
            "duration": null,
            "has_audio": false
          }
        }
      }
    ]
  }
}
```

#### Quote
```json
{
  "type": "quote",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "text": "<p data-placeholder=\"Текст цитаты\">Текст цитаты</p>",
    "subline1": "Подпись цитаты"
  }
}
```

#### Delimiter (Divider)
```json
{
  "type": "delimiter",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "type": "default"
  }
}
```

#### Quiz (Poll)
```json
{
  "type": "quiz",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "hash": "rAdO20jsHVdoSuK6Lx6qa",
    "title": "Заголовок опроса",
    "items": {
      "o17839398810": "Вариант 1",
      "o17839398871": "Вариант 2",
      "o17839398902": "Вариант 3"
    }
  }
}
```

#### List
```json
{
  "type": "list",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "items": [
      "Элемент списка 1",
      "Элемент списка 2"
    ],
    "type": "UL" // Unordered list
  }
}
```

#### Code Block
```json
{
  "type": "code",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "text": "function helloWorld() {\n  return 'Hello';\n}",
    "lang": "" // Programming language for syntax highlighting
  }
}
```

#### Person
```json
{
  "type": "person",
  "cover": false,
  "hidden": false,
  "anchor": "",
  "data": {
    "title": "Персона (имя)",
    "description": "Должность",
    "image": {
      "type": "image",
      "data": {
        "uuid": "f8b73a98-816a-5771-989d-e7ce7de626ce",
        "width": 2560,
        "height": 1440,
        "size": 444941,
        "type": "jpg",
        "color": "3e5678"
      }
    }
  }
}
```

#### Text with Anchor
```json
{
  "type": "text",
  "cover": false,
  "hidden": false,
  "anchor": "yakor-itself-onlyenglish",
  "data": {
    "text": "<p>текст с якорем</p>"
  }
}
```

#### Spoiler Text (Hidden)
To create a spoiler, the `hidden` property is set to `true`.
```json
{
  "type": "text",
  "cover": false,
  "hidden": true,
  "anchor": "",
  "data": {
    "text": "<p>текст со спойлером</p>"
  }
}
```

### Save Response Example:
Upon successfully saving, the server responds with the updated post state. It injects a `render` property into some blocks (e.g., media blocks are returned with full HTML markup pre-generated).

```json
{
  "message": "",
  "result": {
    "entry": {
      "id": 5181817,
      "user_id": 626676,
      "type": 1,
      "title": "какой-то заголовок",
      "entry": {
        "blocks": [
          // Blocks... (with potential server-side enrichments)
        ]
      },
      "url": "https://dtf.ru/id626676/5181817-kakoi-to-zagolovok",
      "date": 1783939620,
      "date_str": "13-07-2026 13:47",
      "modification_date": 1783939925,
      "modification_date_str": "13-07-2026 13:52",
      "is_published": false,
      "subsite_id": 626676,
      "subsite_name": "DonnerTech (хейтер danny)"
      // ...
    }
  }
}
```

---

## 3. Check Comment Permissions

Checks whether comments are allowed/permitted for a specific post.

**Endpoint:** `GET https://api.dtf.ru/v2.1/posts/{post_id}/comment-permission`

**Response Example:**
```json
{
  "message": "",
  "result": {
    "permission": null
  }
}
```

---

## 4. Post Edit History

Retrieves the edit history of a given post.

**Endpoint:** `GET https://api.dtf.ru/v2.1/content/{id}/history`

**Response Example:**
```json
{
  "message": "",
  "result": {
    "versions": [
      {
        "id": 267612245,
        "dateCreated": 1783940806
      },
      {
        "id": 267612079,
        "dateCreated": 1783940750
      }
    ]
  }
}
```

---

## 5. Post Preview / Content Fetch

Fetches the full post preview, including blocks, author info, and counters. Fails with a 403 "Недостаточно прав" if the user lacks access to unpublished drafts.

**Endpoint:** `GET https://api.dtf.ru/v2.10/content?id={id}&markdown=false`

**Response Example:**
```json
{
  "message": "",
  "result": {
    "id": 5181817,
    "subsiteId": 626676,
    "title": "какой-то заголовок",
    "blocks": [
      // Post blocks
    ],
    "author": {
      "id": 626676,
      "name": "Author Name"
      // ...
    },
    "counters": {
      "comments": 0,
      "favorites": 0,
      "reposts": 0,
      "views": 0,
      "hits": 0
    }
    // ...
  }
}
```

---

## 6. Comments for Preview

Fetches comments specifically for the preview overlay. 

**Endpoint:** `GET https://api.dtf.ru/v2.10/comments?sorting=popular&contentId={id}&firstLoad=true`

Note: Returns `403 Forbidden` if the post is a draft/unpublished.

---

## 7. Metadata Modifications
### Marking a Post as 18+
To mark a post as Adult/18+, set the `is_adult` property to `true` in the main JSON payload during the `POST /v2.1/editor` request:
```json
{
  "id": 5181817,
  "is_adult": true,
  "entry": { ... }
}
```

---

## 8. Other Related Endpoints
While not directly part of the post editing structure, the editor also initiates the following request during its initial load:

**Endpoint:** `GET https://api.dtf.ru/v2.5/donations/account`
Fetches donation account data associated with the user.
```json
{
  "message": "",
  "result": {
    "phoneNumber": "+7999*******",
    "isConfirmed": true,
    "isFrozen": false,
    "balance": 0
  }
}
```

---

## 9. Setting Comment Permissions

Changes who is allowed to comment on the post.

**Endpoint:** `POST https://api.dtf.ru/v2.1/posts/{post_id}/comment-permission`

**Headers:**
- `Content-Type`: `multipart/form-data`

**Request Body:**
A single field `commentingPermissions`. Possible values:
- `nobody`: No one can comment.
- `only_plus`: Only PLUS users can comment.
- `only_subscribers`: Only subscribers can comment.

**Reverting to Everyone:**
To revert the permission so that everyone can comment, use the `DELETE` method on the same endpoint without a body.
**Endpoint:** `DELETE https://api.dtf.ru/v2.1/posts/{post_id}/comment-permission`

---

## 10. Subsite / Theme Selection

When changing the subsite or theme for a post, two things happen:
1. The client fetches the available subsites.
2. The client immediately triggers a "Save Draft" request (`POST /v2.1/editor`) with the updated `subsite_id`.

**Fetch Subsites Endpoint:** `GET https://api.dtf.ru/v2.1/editor/subsites`

**Response Example:**
```json
{
  "message": "",
  "result": [
    {
      "items": [
        {
          "value": 626676,
          "label": "Без темы",
          "image": "https://leonardo.osnova.io/.../",
          "additionalData": {
            "url": "https://dtf.ru/id626676",
            "isBlog": true
          },
          "isNoTheme": true
        },
        {
          "value": 64955,
          "label": "Офтоп",
          "image": "https://leonardo.osnova.io/.../",
          "additionalData": {
            "url": "https://dtf.ru/flood",
            "isBlog": false
          },
          "isNoTheme": false
        }
      ]
    }
  ]
}
```

---

## 11. Image Uploads

Uploads images to the CDN to be used in media blocks or person avatars.

**Endpoint:** `POST https://upload.dtf.ru/v2.8/uploader/upload`

**Headers:**
- `Content-Type`: `multipart/form-data`

**Request Body:**
A `multipart/form-data` containing the file in the `files` field.

The response returns the uploaded file details including its `uuid` which can then be placed into the respective block's `image.data.uuid` field.

---

## 12. Fetching Specific History Version

Retrieves a specific older version of a post from the edit history.

**Endpoint:** `GET https://api.dtf.ru/v2.1/content/{post_id}/history/{version_id}`

**Response:**
Returns the complete post object wrapped in `result.entry`, identical in structure to the response from saving a post or opening the editor. This allows the client to replace the current editor state with the historical state.
