# Документация reDTF

Здесь вся документация проекта, разложенная по читателям.

## Для разработчиков и агентов

| Раздел | О чём |
| --- | --- |
| [architecture/](architecture/README.md) | как устроено приложение: обзор, хранилище, темы, настройки, навигация, отклик и анимации, API |
| [architecture/data-sources/](architecture/data-sources/README.md) | подключаемые источники данных: манифесты, разрешения, авторизация |
| [guides/](guides/README.md) | пошаговые инструкции: добавить тему, настройку, оверлей, метод API |
| [../decisions/](../decisions/README.md) | почему сделано так: записи об архитектурных решениях (ADR) |

Правила для ИИ-агентов — в [../AGENTS.md](../AGENTS.md), правила для людей — в [../CONTRIBUTING.md](../CONTRIBUTING.md).

## Для пользователей

В [user/](user/README.md) лежат заготовки пользовательских материалов: начало работы, настройки, источники данных, приватность, вопросы и ответы. Сейчас это каркас с планом разделов, который нужно наполнить к релизу.

## Что читать в каком случае

- Хочу понять устройство целиком → [architecture/README.md](architecture/README.md).
- Хочу добавить тему или сделать форк существующей → [guides/add-a-theme.md](guides/add-a-theme.md).
- Хочу добавить анимацию или понять, как окна реагируют на нажатие → [architecture/motion.md](architecture/motion.md).
- Хочу понять, где что хранится → [architecture/storage.md](architecture/storage.md).
- Хочу подключить сторонний источник данных → [architecture/data-sources/README.md](architecture/data-sources/README.md).

## Архивные материалы

В [architecture/data-sources/](architecture/data-sources/README.md) остались рабочие документы `implementation_plan.md` и `task.md` — это история того, как строилась система источников. Они не описывают текущий код: актуальное описание в `README.md`, `manifest-spec.md` и `examples.md` той же папки.
