# Добавить настройку

Что куда: [architecture/settings.md](../architecture/settings.md).

## Настройка темы

Тема описывает поле в манифесте, остальное сделает экран настроек.

1. Откройте `src/lib/themes/<id>/theme.ts` и добавьте поле в `settings`:

   ```ts
   {
   	key: 'compactCards',          // ключ в сохранённых значениях
   	type: 'toggle',               // radio | select | toggle
   	title: 'Компактные карточки',
   	description: 'Меньше отступов в ленте',
   	default: false
   }
   ```

   Для `radio` и `select` добавьте `options: [{ value, title, description? }]`, а `default` должен быть одним из `value`.

2. Читайте значение из кода темы через её модуль настроек. Если его ещё нет, создайте `themes/<id>/themeSettings.svelte.ts` по образцу `dtf2022`:

   ```ts
   import { activeThemeSettings } from '../settings.svelte';

   export const themeSettings = {
   	get compactCards(): boolean {
   		return activeThemeSettings().value.compactCards === true;
   	}
   };
   ```

3. В компоненте: `let compact = $derived(themeSettings.compactCards);`.

Всё. Значение появится на странице темы, сохранится в `redtf:theme:<id>` и будет у каждой темы своё. Новое поле не требует миграции: у тех, кто уже сохранял настройки, подставится значение по умолчанию.

Если вы меняете смысл существующего поля (были другие `value`), увеличьте `version` в `persistedState` в `themes/settings.svelte.ts` только если это действительно ломает сохранённые данные. Помните: миграций нет, старые значения будут отброшены у всех тем.

## Общая настройка

1. Добавьте поле в `AppSettings` и значение по умолчанию в `storage/settings.svelte.ts`.
2. Добавьте поле на подходящую страницу в `components/settings/SettingsScreen.svelte` (новая страница — это новый пункт в `navigation` и ветка в разметке). Для выбора из вариантов и переключателя опишите поле и используйте `FieldControl`, для остального — `SettingsGroup` с обычным `input` и функциональной привязкой (образец — `ProxySettings.svelte`):

   ```svelte
   <input bind:value={() => settings.value.proxyUrl, (v) => settings.patch({ proxyUrl: v })} />
   ```

3. Читайте через `settings.value.<поле>`.

Не пишите настройки в `$effect`: запись меняет состояние, от которого зависит рендер, и эффект может зациклиться. Пишите из обработчиков.

## Проверка

- Измените настройку, перезагрузите страницу: значение должно сохраниться.
- Переключите тему и вернитесь: значения не должны смешаться и потеряться.
- `npm test` и `npm run check`.
