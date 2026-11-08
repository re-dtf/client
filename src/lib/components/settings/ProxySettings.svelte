<script lang="ts">
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import { isNative } from '$lib/capacitor';
	import {
		settings,
		toggleProxy,
		updateProxyUrl,
		addCustomProxy,
		removeCustomProxy,
		moveProxy,
		testProxy,
		type ProxyItem
	} from '$lib/storage/settings.svelte';

	let customUrl = $state('');
	let customName = $state('');
	let showAdd = $state(false);
	let addError = $state('');

	let editingId = $state<string | null>(null);
	let editUrlValue = $state('');

	let testResults = $state<
		Record<string, { ok?: boolean; latencyMs?: number; error?: string; loading?: boolean }>
	>({});

	let proxies = $derived(settings.value.proxies || []);
	let enabledList = $derived(proxies.filter((p) => p.enabled && Boolean(p.url?.trim())));

	async function handleTest(proxy: ProxyItem) {
		if (!proxy.url?.trim()) {
			testResults[proxy.id] = { ok: false, error: 'URL не указан', loading: false };
			return;
		}
		testResults[proxy.id] = { loading: true };
		const res = await testProxy(proxy.url);
		testResults[proxy.id] = { ...res, loading: false };
	}

	function handleAddSubmit(e?: Event) {
		e?.preventDefault();
		addError = '';
		const trimmed = customUrl.trim();
		if (!trimmed) {
			addError = 'Укажите адрес прокси-сервера';
			return;
		}

		try {
			const item = addCustomProxy(trimmed, customName);
			customUrl = '';
			customName = '';
			showAdd = false;
			handleTest(item);
		} catch (err: unknown) {
			addError = err instanceof Error ? err.message : 'Некорректный адрес URL';
		}
	}

	function handleSaveEdit(id: string) {
		const trimmed = editUrlValue.trim();
		updateProxyUrl(id, trimmed);
		editingId = null;
		const updated = proxies.find((p) => p.id === id);
		if (updated?.url) {
			handleTest(updated);
		}
	}

	function handleToggle(proxy: ProxyItem, checked: boolean) {
		if (checked && !proxy.url?.trim()) {
			editingId = proxy.id;
			editUrlValue = '';
			return;
		}
		toggleProxy(proxy.id, checked);
	}

	function handleDelete(proxy: ProxyItem) {
		if (confirm(`Удалить прокси «${proxy.name}»?`)) {
			removeCustomProxy(proxy.id);
		}
	}

	function getQueueNumber(proxy: ProxyItem): number | null {
		if (!proxy.enabled || !proxy.url?.trim()) return null;
		const idx = enabledList.findIndex((p) => p.id === proxy.id);
		return idx !== -1 ? idx + 1 : null;
	}
</script>

<SettingsGroup
	title="CORS-прокси для авторизации"
	description={isNative()
		? 'В мобильном приложении (Capacitor) запросы авторизации отправляются напрямую через нативный сетевой стек без CORS-ограничений браузера. Внешний прокси не требуется.'
		: 'DTF блокирует запросы авторизации из браузера. Прокси используется только для входа по паролю и обновления токена. Если первый прокси в списке не отвечает или перегружен, запрос автоматически уходит на следующий активный.'}
>
	{#if isNative()}
		<div class="proxy-list">
			<div class="native-box">
				<div class="native-box__header">
					<span class="badge badge--open">Нативное прямое подключение</span>
				</div>
				<p class="native-box__desc">
					Приложение отправляет запросы к DTF API напрямую через системный стек Android без ограничений CORS. Пароль и токены не проходят через внешние серверы.
				</p>
			</div>
		</div>
	{:else}
		<div class="proxy-list">
			{#if proxies.length === 0}
				<div class="empty-proxies">
					<p class="empty-proxies__title">Встроенные прокси не настроены в сборке</p>
					<p class="empty-proxies__desc">
						В этой сборке нет предустановленных прокси. Добавьте собственный прокси-сервер кнопкой ниже. Для развёртывания своего сервера ознакомьтесь с <a href="https://github.com/re-dtf/proxy" target="_blank" rel="noopener noreferrer">инструкцией re-dtf/proxy</a>.
					</p>
				</div>
			{/if}

		{#each proxies as proxy, i (proxy.id)}
			{@const queueNum = getQueueNumber(proxy)}
			{@const test = testResults[proxy.id]}

			<div class={['proxy-card', { 'proxy-card--disabled': !proxy.enabled || !proxy.url }]}>
				<div class="proxy-card__top">
					<div class="proxy-card__title-row">
						<span class="proxy-card__name">{proxy.name}</span>
						{#if proxy.id === 'valtown'}
							<span class="badge badge--open">Открытый</span>
						{:else if proxy.id === 'cloudflare'}
							<span class="badge badge--cf">Резервный</span>
						{:else}
							<span class="badge badge--custom">Свой</span>
						{/if}

						{#if queueNum !== null}
							<span class="badge badge--queue" title="Порядок в очереди failover">
								#{queueNum} в очереди
							</span>
						{:else if !proxy.url}
							<span class="badge badge--empty">Не настроен</span>
						{:else}
							<span class="badge badge--inactive">Отключён</span>
						{/if}
					</div>

					<div class="proxy-card__toggle">
						<SettingsSwitch
							checked={proxy.enabled && Boolean(proxy.url)}
							label={`Включить ${proxy.name}`}
							onchange={(checked) => handleToggle(proxy, checked)}
						/>
					</div>
				</div>

				<div class="proxy-card__url-row">
					{#if editingId === proxy.id}
						<form
							class="url-edit-form"
							onsubmit={(e) => {
								e.preventDefault();
								handleSaveEdit(proxy.id);
							}}
						>
							<input
								type="url"
								class="field-input url-edit-input"
								bind:value={editUrlValue}
								placeholder="https://..."
								required
							/>
							<button type="submit" class="mini-btn mini-btn--accent">Сохранить</button>
							<button
								type="button"
								class="mini-btn"
								onclick={() => {
									editingId = null;
								}}
							>
								Отмена
							</button>
						</form>
					{:else}
						<div class="url-display">
							{#if proxy.url}
								<code>{proxy.url}</code>
							{:else}
								<span class="url-empty">URL не задан в сборке</span>
							{/if}
							<button
								type="button"
								class="url-edit-btn"
								onclick={() => {
									editingId = proxy.id;
									editUrlValue = proxy.url;
								}}
							>
								{proxy.url ? 'Изменить' : 'Указать URL'}
							</button>
						</div>
					{/if}
				</div>

				{#if proxy.description || (proxy.linkUrl && proxy.linkText)}
					<p class="proxy-card__desc">
						{#if proxy.description}
							{proxy.description}{' '}
						{/if}
						{#if proxy.linkUrl && proxy.linkText}
							<a
								href={proxy.linkUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="proxy-card__link"
							>
								{proxy.linkText} →
							</a>
						{/if}
					</p>
				{/if}

				<div class="proxy-card__footer">
					<div class="proxy-card__test">
						<button
							type="button"
							class="test-btn"
							disabled={test?.loading || !proxy.url}
							onclick={() => handleTest(proxy)}
						>
							{#if test?.loading}
								<span class="dot-spin"></span> Проверка...
							{:else}
								Проверить доступность
							{/if}
						</button>

						{#if test && !test.loading}
							{#if test.ok}
								<span class="test-pill test-pill--ok">
									● Доступен ({test.latencyMs} мс)
								</span>
							{:else}
								<span class="test-pill test-pill--err" title={test.error}>
									✕ {test.error || 'Недоступен'}
								</span>
							{/if}
						{/if}
					</div>

					<div class="proxy-card__actions">
						{#if proxies.length > 1}
							<button
								type="button"
								class="action-btn"
								title="Поднять приоритет"
								disabled={i === 0}
								onclick={() => moveProxy(proxy.id, 'up')}
							>
								▲
							</button>
							<button
								type="button"
								class="action-btn"
								title="Опустить приоритет"
								disabled={i === proxies.length - 1}
								onclick={() => moveProxy(proxy.id, 'down')}
							>
								▼
							</button>
						{/if}

						{#if !proxy.isPreset}
							<button
								type="button"
								class="action-btn action-btn--delete"
								title="Удалить прокси"
								onclick={() => handleDelete(proxy)}
							>
								✕
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="add-section">
		{#if !showAdd}
			<SettingsButton variant="flat" onclick={() => (showAdd = true)}>
				+ Добавить свой прокси
			</SettingsButton>
		{:else}
			<form class="add-form" onsubmit={handleAddSubmit}>
				<div class="add-form__title">Добавление прокси-сервера</div>
				<p class="add-form__hint">
					Вы можете развернуть собственный CORS-прокси бесплатно на Cloudflare Workers или Val Town:
					<a
						href="https://github.com/re-dtf/proxy"
						target="_blank"
						rel="noopener noreferrer"
						class="proxy-card__link"
					>
						инструкция в репозитории reDTF-proxy
					</a>.
				</p>

				{#if addError}
					<div class="add-form__error">{addError}</div>
				{/if}

				<div class="add-form__fields">
					<input
						type="url"
						class="field-input"
						placeholder="https://my-proxy.workers.dev"
						bind:value={customUrl}
						required
					/>
					<input
						type="text"
						class="field-input field-input--name"
						placeholder="Название (необязательно)"
						bind:value={customName}
					/>
				</div>

				<div class="add-form__actions">
					<SettingsButton variant="suggested" type="submit">Добавить</SettingsButton>
					<SettingsButton
						variant="flat"
						onclick={() => {
							showAdd = false;
							addError = '';
						}}
					>
						Отмена
					</SettingsButton>
				</div>
			</form>
		{/if}
	</div>
	{/if}
</SettingsGroup>

<style>
	.proxy-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px 20px;
	}

	.native-box {
		padding: 16px 20px;
		background: var(--st-card);
		border: 1px solid rgba(31, 138, 59, 0.25);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.native-box__header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.native-box__desc {
		font-size: 13px;
		line-height: 1.5;
		color: var(--st-muted);
		margin: 0;
	}

	.empty-proxies {
		padding: 20px;
		background: var(--st-card);
		border: 1px dashed var(--st-separator);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.empty-proxies__title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.empty-proxies__desc {
		font-size: 13px;
		line-height: 1.5;
		color: var(--st-muted);
	}

	.empty-proxies__desc a {
		color: var(--st-accent);
		text-decoration: underline;
	}

	.proxy-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: 12px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow-soft);
		border: 1px solid var(--st-separator);
		transition: opacity var(--duration-base), border-color var(--duration-base);
	}

	.proxy-card--disabled {
		opacity: 0.7;
	}

	.proxy-card__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.proxy-card__title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.proxy-card__name {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	.badge--open {
		background: rgba(31, 138, 59, 0.12);
		color: #1f8a3b;
	}

	.badge--cf {
		background: rgba(53, 132, 228, 0.12);
		color: #1c71d8;
	}

	.badge--custom {
		background: rgba(120, 120, 120, 0.14);
		color: var(--st-muted);
	}

	.badge--queue {
		background: rgba(53, 132, 228, 0.08);
		color: var(--st-accent);
		border: 1px solid rgba(53, 132, 228, 0.2);
	}

	.badge--empty {
		background: rgba(192, 28, 40, 0.08);
		color: var(--st-danger);
		border: 1px solid rgba(192, 28, 40, 0.2);
	}

	.badge--inactive {
		background: rgba(0, 0, 0, 0.05);
		color: #999;
	}

	.proxy-card__url-row {
		font-size: 12px;
	}

	.url-display {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.url-display code {
		display: inline-block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--st-field);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		color: var(--text-primary);
	}

	.url-empty {
		color: var(--st-muted);
		font-style: italic;
	}

	.url-edit-btn {
		background: none;
		border: none;
		color: var(--st-accent);
		cursor: pointer;
		font-size: 12px;
		padding: 0;
		font-weight: 500;
	}

	.url-edit-btn:hover {
		text-decoration: underline;
	}

	.url-edit-form {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.url-edit-input {
		height: 32px !important;
		font-size: 12px !important;
	}

	.proxy-card__desc {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--st-muted);
	}

	.proxy-card__link {
		color: var(--st-accent);
		text-decoration: none;
		font-weight: 500;
		margin-left: 4px;
	}

	.proxy-card__link:hover {
		text-decoration: underline;
	}

	.proxy-card__footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: 4px;
		padding-top: 10px;
		border-top: 1px solid var(--st-separator);
	}

	.proxy-card__test {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	.test-btn {
		background: var(--st-button);
		color: inherit;
		border: none;
		border-radius: 14px;
		padding: 4px 12px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		transition: background-color var(--duration-base);
	}

	.test-btn:hover:not(:disabled) {
		background: var(--st-button-hover);
	}

	.test-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.test-pill {
		font-size: 12px;
		font-weight: 500;
	}

	.test-pill--ok {
		color: #1f8a3b;
	}

	.test-pill--err {
		color: var(--st-danger);
	}

	.proxy-card__actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.action-btn {
		width: 28px;
		height: 28px;
		border-radius: 14px;
		background: var(--st-button);
		color: inherit;
		border: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		cursor: pointer;
		transition: background-color var(--duration-base), color var(--duration-base);
	}

	.action-btn:hover:not(:disabled) {
		background: var(--st-button-hover);
	}

	.action-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.action-btn--delete:hover {
		background: rgba(192, 28, 40, 0.12);
		color: var(--st-danger);
	}

	.add-section {
		padding: 4px 20px 20px;
	}

	.add-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		border-radius: 12px;
		background: var(--st-card);
		border: 1px solid var(--st-separator);
		box-shadow: var(--st-card-shadow-soft);
	}

	.add-form__title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.add-form__hint {
		margin: 0;
		font-size: 12px;
		color: var(--st-muted);
		line-height: 1.4;
	}

	.add-form__error {
		padding: 8px 12px;
		border-radius: 6px;
		background: rgba(192, 28, 40, 0.1);
		color: var(--st-danger);
		font-size: 12px;
	}

	.add-form__fields {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.field-input {
		flex: 1 1 200px;
		height: 38px;
		padding: 0 14px;
		border-radius: 8px;
		background: var(--st-field);
		border: 1px solid transparent;
		color: inherit;
		font-size: 13px;
	}

	.field-input--name {
		flex: 1 1 140px;
	}

	.field-input:focus-visible {
		outline: none;
		border-color: var(--st-accent);
		background: var(--st-card);
	}

	.add-form__actions {
		display: flex;
		gap: 10px;
		margin-top: 4px;
	}

	.mini-btn {
		background: var(--st-button);
		color: inherit;
		border: none;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 12px;
		cursor: pointer;
	}

	.mini-btn:hover {
		background: var(--st-button-hover);
	}

	.mini-btn--accent {
		background: var(--st-accent);
		color: #fff;
	}

	.mini-btn--accent:hover {
		opacity: 0.9;
	}

	.dot-spin {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 2px solid currentColor;
		border-top-color: transparent;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
