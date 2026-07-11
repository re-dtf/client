<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import { onMount } from 'svelte';
  import { version as currentVersion } from '$app/environment';

  let needRefresh = $state(false);
  let newVersion = $state<string | null>(null);
  let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

  onMount(() => {
    // Инициализация и подписка на событие доступности новой версии
    updateServiceWorker = registerSW({
      async onNeedRefresh() {
        // Срабатывает, когда новая версия скачана и готова к установке
        try {
          const res = await fetch(`/api/version.json?t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            newVersion = data.version;
          }
        } catch (e) {
          console.error('Failed to fetch new version info:', e);
        }
        needRefresh = true;
      }
    });
  });

  function applyUpdate() {
    if (updateServiceWorker) {
      // Отправляет команду SKIP_WAITING в Service Worker и перезагружает страницу
      updateServiceWorker(true);
    }
  }

  function closePrompt() {
    needRefresh = false;
  }
</script>

{#if needRefresh}
  <div class="pwa-prompt">
    <div class="message">
      <span>
        {#if newVersion && newVersion !== currentVersion}
          Доступна новая версия <strong class="version-badge">{newVersion}</strong> <span class="version-current">(ваша: {currentVersion})</span>.
        {:else}
          Доступно внутреннее обновление для версии <strong class="version-badge">{currentVersion}</strong>.
        {/if}
        <br>
        Рекомендуем проверить <a href="https://github.com/re-dtf/client/commits" target="_blank">изменения на GitHub</a> перед обновлением.
      </span>
    </div>
    <div class="actions">
      <button onclick={applyUpdate}>Обновить код</button>
      <button class="skip-btn" onclick={closePrompt}>Пропустить</button>
    </div>
  </div>
{/if}

<style>
  /* Стилизация фиксированного уведомления (toast/modal) */
  .pwa-prompt {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--pwa-bg, #fff);
    border: 1px solid var(--pwa-border, #ccc);
    color: var(--pwa-text, #1a1a1a);
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 9999;
    max-width: 320px;
  }
  .pwa-prompt a {
    color: var(--pwa-link, #007bff);
    text-decoration: none;
  }
  .pwa-prompt a:hover {
    text-decoration: underline;
  }
  .message {
    font-size: 0.9rem;
    line-height: 1.4;
  }
  .version-badge {
    background: var(--pwa-badge-bg, #e0f2fe);
    color: var(--pwa-badge-text, #0369a1);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
  }
  .version-current {
    font-size: 0.85em;
    color: var(--pwa-text-muted, #666);
  }
  .actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
  }
  .actions button {
    padding: 6px 12px;
    border: 1px solid var(--pwa-border, #ccc);
    background: var(--pwa-btn-bg, #007bff);
    color: var(--pwa-btn-text, #fff);
    font-weight: 500;
    border-radius: 4px;
    cursor: pointer;
    flex: 1;
  }
  .actions button:hover {
    background: var(--pwa-btn-hover, #0056b3);
  }
  .actions button.skip-btn {
    background: var(--pwa-btn-skip-bg, #f4f5f7);
    color: var(--pwa-btn-skip-text, #1a1a1a);
  }
  .actions button.skip-btn:hover {
    background: var(--pwa-btn-skip-hover, #e0e0e0);
  }
</style>

