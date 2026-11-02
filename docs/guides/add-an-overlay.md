# Добавить оверлей

Оверлей — экран, который открывается поверх ленты. Как это устроено: [architecture/navigation.md](../architecture/navigation.md).

Если нужен не экран с адресом, а диалог внутри уже открытого экрана (подтверждение, ход процесса), оверлей не нужен: используйте `components/Dialog.svelte`.

Пример: оверлей `about` («О проекте»).

1. **Тип.** В `src/app.d.ts` добавьте вариант в `App.OverlayData`:

   ```ts
   | { type: 'about' }
   ```

   Если оверлею нужны данные, добавьте `data: { … }`: они попадут в пропсы компонента.

2. **Адрес и способ показа.** В `src/lib/navigation.ts`:

   ```ts
   const PRESENTATION = { …, about: 'modal' };   // 'page' вместо страницы, 'modal' окном

   function overlayPath(overlay) {
   	switch (overlay.type) {
   		…
   		case 'about':
   			return '/about';
   	}
   }
   ```

   TypeScript подскажет, где пропущен новый тип.

3. **Компонент.** Создайте `src/lib/components/AboutOverlay.svelte`. Для закрытия используйте `closeOverlay()`:

   ```svelte
   <script lang="ts">
   	import { closeOverlay } from '$lib/navigation';
   </script>

   <button onclick={closeOverlay}>Закрыть</button>
   ```

   Если окно должно выглядеть иначе в каждой теме, возьмите содержимое из темы через `ThemeLoader` и добавьте компонент в `themes/contract.ts` (с пропсами), как сделано для `LoginModal`.

4. **Отрисовка.** В `src/routes/+layout.svelte` добавьте ветку в сниппет `overlayContent`:

   ```svelte
   {:else if overlay.type === 'about'}
   	<AboutOverlay />
   ```

   Если у оверлея есть `data`, передайте её пропсами: `<AboutOverlay {...overlay.data} />`.

   Если окно (`modal`) берёт содержимое из темы, добавьте компонент в `MODAL_COMPONENT` в том же файле: `ModalShell` загрузит его до показа и дождётся картинок, и окно появится целиком (см. [motion.md](../architecture/motion.md)).

5. **Прямая ссылка.** Создайте маршрут `src/routes/about/+page.svelte` с тем же содержимым (по образцу `routes/settings`). Тогда адрес можно открыть напрямую и обновить страницу. Если нужна только вставка в оверлей, маршрут можно сделать пустым, но он должен существовать, иначе `/about` покажет 404.

6. **Открытие.** Откуда угодно: `openOverlay({ type: 'about' })`. Для ссылки в тексте используйте `<a href={resolve('/about')} onclick={…}>` с обработчиком, который вызывает `openOverlay` для обычного клика и не мешает Ctrl/Cmd-клику (образец `openPost` в `navigation.ts`).

## Проверка

- Открыть оверлей, нажать «Назад»: возвращаетесь на ленту с сохранённой прокруткой.
- Открыть адрес оверлея напрямую и обновить: страница работает.
- Клик по подложке закрывает модальный оверлей.
