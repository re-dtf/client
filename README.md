# reDTF

Неофициальный клиент для [DTF](https://dtf.ru). Основные идеи расписаны на [странице организации](https://github.com/re-dtf).

> [!WARNING]
> **Проект в стадии разработки.** Интерфейс и архитектура не являются финальными или завершенными, и могут меняться в процессе.

## Быстрый старт

Нужен Node.js 26 или новее.

```bash
npm install
npm run dev -- --open
```

Для входа по паролю нужен адрес прокси: скопируйте `.env.example` в `.env` и укажите `VITE_AUTH_PROXY_URL` или впишите свой прокси в настройках приложения.
Информацию и инструкции для прокси можно найти в репозитории [re-dtf/proxy](https://github.com/re-dtf/proxy). 

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | dev-сервер |
| `npm test` | юнит-тесты |
| `npm run check` | проверка типов (`svelte-check`) |
| `npm run build` | статическая сборка в `build/` |
| `npm run preview` | посмотреть собранную версию |
| `npm run build:ota` | сборка и упаковка OTA-обновления (`bundle.zip`) |
| `npm run cap:sync` | синхронизация сборки в проект Capacitor (Android) |

## Публикация

- Ветка `dev` собирается и выкладывается на Cloudflare Pages для внутренних тестов (`.github/workflows`).
- Тег `v*` выкладывает стабильную публичную версию на GitHub Pages.

Приложение — статические файлы, так что подойдёт любой статический хостинг. Если оно живёт не в корне домена, задайте `BASE_PATH`.

## Как устроен проект

Кратко: SvelteKit 3 и Svelte 5 в режиме SPA (`adapter-static`, `ssr = false`).

```
src/
  routes/            маршруты и корневой layout (оверлеи, тема)
  lib/
    api/             фасад api, провайдеры (DTF и подключаемые источники)
    themes/          реестр тем, ThemeLoader, сами темы
    storage/         всё, что хранится в localStorage
    components/      общие компоненты: блоки постов, комментарии, редактор, настройки
    navigation.ts    открытие и закрытие оверлеев
docs/                документация
```

Полная картина с диаграммой — в [docs/architecture](docs/architecture/README.md). Оглавление всей документации — [docs/README.md](docs/README.md).

## Участие

Прочитайте [CONTRIBUTING.md](CONTRIBUTING.md). Если вы ИИ-агент, начните с [AGENTS.md](AGENTS.md).

## Лицензия

[PolyForm Noncommercial License 1.0.0](LICENSE). Проект не связан с DTF и Osnova.
