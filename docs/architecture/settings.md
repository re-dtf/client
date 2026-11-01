# Настройки

Экран настроек общий для всех тем и состоит из двух вкладок:

- **Общие** — то, что не зависит от темы: выбор темы, режим вложенных комментариев, прокси для входа, подключённые источники данных.
- **Вкладка темы** — настройки выбранной темы (например, вид оценок у `dtf2022`). Её название — название темы. Если у темы настроек нет, вкладки нет.

Где живёт код:

| Файл | Роль |
| --- | --- |
| `components/settings/SettingsScreen.svelte` | вкладки и выбор, что показать |
| `components/settings/GeneralSettings.svelte` | вкладка «Общие» |
| `components/settings/FieldControl.svelte` | один пункт настроек по описанию поля |
| `components/SettingsOverlay.svelte`, `routes/settings/+page.svelte` | оболочки: окно поверх ленты и отдельная страница |
| `storage/settings.svelte.ts` | значения общих настроек |
| `themes/settings.svelte.ts` | значения настроек тем |
| `themes/types.ts`, `themes/registry.ts` | описание полей и схема темы с учётом основы |

Оформление экрана сейчас временное: нейтральные стили на CSS-переменных. Когда будет готов дизайн, меняется только разметка и стили в `components/settings/`: данные, схема и сохранение остаются.

## Общие настройки

Хранятся одним объектом `redtf:settings`:

```ts
interface AppSettings {
	theme: string;                  // id темы
	proxyUrl: string;               // CORS-прокси для входа
	commentNesting: 'flatten' | 'autopan';
}
```

Читать и писать: `settings.value.proxyUrl`, `settings.patch({ proxyUrl })` (из `$lib/storage/settings.svelte`). Тему переключает `activeTheme.set(id)`, читать её нужно через `activeTheme.id` (если выбранной темы больше нет, вернётся тема по умолчанию).

Прокси по умолчанию (`DEFAULT_PROXY_URL`) приходит из `VITE_AUTH_PROXY_URL` при сборке. Если переменная пуста, кнопки «Использовать прокси от автора» нет.

## Настройки темы

Тема описывает свои настройки схемой в `theme.ts`. Экран сам рисует поля и сохраняет значения, самой теме писать интерфейс не нужно.

```ts
settings: [
	{
		key: 'votes',
		type: 'radio',
		title: 'Оценки',
		description: 'Как выглядят оценки постов и комментариев.',
		default: 'likes',
		options: [
			{ value: 'rating', title: 'Стрелки · осень 2022', description: '…' },
			{ value: 'likes', title: 'Лайки · начало 2023' }
		]
	}
]
```

Типы полей (`themes/types.ts`):

| `type` | Значение | Как выглядит |
| --- | --- | --- |
| `radio` | `string` из `options` | карточки с выбором, у каждого варианта заголовок и описание |
| `select` | `string` из `options` | выпадающий список |
| `toggle` | `boolean` | переключатель |

Значения лежат в `redtf:theme:<id темы>`, **у каждой темы свои**: при смене темы настройки старой не теряются, а новой не смешиваются со старыми. Поля, добавленные в схему позже, получают значение по умолчанию без миграций.

### Как тема читает свои настройки

```ts
// themes/dtf2022/themeSettings.svelte.ts
import { activeThemeSettings } from '../settings.svelte';

export const themeSettings = {
	get votes(): VotesStyle {
		return activeThemeSettings().value.votes as VotesStyle;
	}
};
```

Компоненты читают `themeSettings.votes`. `activeThemeSettings()` отдаёт хранилище **выбранной** темы, поэтому в форке тот же код читает значения форка.

### Форки

Схема форка = схема основы + свои поля (поле с тем же `key` заменяет поле основы). Значения форк хранит у себя.

## Добавить настройку

См. [guides/add-a-setting.md](../guides/add-a-setting.md).
