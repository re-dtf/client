<script lang="ts">
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { APP_ICONS, isPwa, type AppIconId, applyAppIcon, processCustomIcon } from '$lib/icons';
	import { settings } from '$lib/storage/settings.svelte';
	import { haptics } from '$lib/haptics';
	import SettingsGroup from './SettingsGroup.svelte';
	import Dialog from '$lib/components/Dialog.svelte';

	let currentIcon = $derived(settings.value.appIcon ?? 'default');
	let customIconData = $derived(settings.value.customIconData ?? null);

	let inPwa = $state(false);
	let showPwaModal = $state(false);
	let pendingIconId = $state<AppIconId | null>(null);
	let pendingCustomData = $state<string | null>(null);
	let uploadError = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement>();

	onMount(() => {
		inPwa = isPwa();
	});

	function handleSelect(id: AppIconId) {
		if (id === currentIcon) return;
		haptics.click();

		if (inPwa) {
			pendingIconId = id;
			pendingCustomData = id === 'custom' ? customIconData : null;
			showPwaModal = true;
		} else {
			applySelection(id, id === 'custom' ? customIconData : undefined);
		}
	}

	async function onFileSelected(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		uploadError = null;
		try {
			const data = await processCustomIcon(file);
			haptics.click();

			if (inPwa) {
				pendingIconId = 'custom';
				pendingCustomData = data;
				showPwaModal = true;
			} else {
				applySelection('custom', data);
			}
		} catch (err: unknown) {
			uploadError = err instanceof Error ? err.message : 'Ошибка при чтении файла';
		} finally {
			target.value = '';
		}
	}

	function removeCustomIcon() {
		haptics.click();
		const fallbackId = currentIcon === 'custom' ? 'default' : currentIcon;
		settings.patch({ customIconData: null, appIcon: fallbackId });
		applyAppIcon(fallbackId);
	}

	function applySelection(id: AppIconId, data?: string | null) {
		const update: Partial<typeof settings.value> = { appIcon: id };
		if (data !== undefined) {
			update.customIconData = data;
		}
		settings.patch(update);
		applyAppIcon(id, data ?? customIconData);

		showPwaModal = false;
		pendingIconId = null;
		pendingCustomData = null;
		haptics.click();
	}

	function cancelSelection() {
		showPwaModal = false;
		pendingIconId = null;
		pendingCustomData = null;
		haptics.click();
	}
</script>

<SettingsGroup
	title="Иконка приложения"
	description="Значок обновляется во вкладке браузера (favicon), на домашнем экране (PWA) и в нативных сборках."
>
	<div class="icons-list" role="radiogroup" aria-label="Выбор иконки приложения">
		{#each APP_ICONS as icon (icon.id)}
			{@const isSelected = currentIcon === icon.id}
			<button
				type="button"
				class="icon-card"
				class:icon-card--selected={isSelected}
				role="radio"
				aria-checked={isSelected}
				onclick={() => handleSelect(icon.id)}
			>
				<div class="icon-card__preview-wrap">
					<div class="icon-card__app-preview" style:background={icon.bgColor}>
						<img src={asset(icon.appSvg)} alt="" class="icon-card__img" />
					</div>
					<div class="icon-card__fav-badge" style:background={icon.bgColor} title="Favicon для вкладки">
						<img src={asset(icon.favSvg)} alt="" class="icon-card__fav-img" />
					</div>
				</div>

				<div class="icon-card__info">
					<div class="icon-card__title-row">
						<span class="icon-card__title">{icon.title}</span>
						<span class="icon-card__color-tag" style:background={icon.bgColor} style:color={icon.textColor}>
							{icon.bgColor}
						</span>
					</div>
					<span class="icon-card__desc">{icon.description}</span>
				</div>

				<div class="icon-card__radio" aria-hidden="true">
					{#if isSelected}
						<div class="icon-card__radio-dot"></div>
					{/if}
				</div>
			</button>
		{/each}

		{#if customIconData}
			{@const isSelected = currentIcon === 'custom'}
			<div class="icon-card icon-card--custom" class:icon-card--selected={isSelected}>
				<button
					type="button"
					class="icon-card__main-btn"
					role="radio"
					aria-checked={isSelected}
					onclick={() => handleSelect('custom')}
				>
					<div class="icon-card__preview-wrap">
						<div class="icon-card__app-preview icon-card__app-preview--custom">
							<img src={customIconData} alt="" class="icon-card__img" />
						</div>
						<div class="icon-card__fav-badge" title="Favicon">
							<img src={customIconData} alt="" class="icon-card__fav-img" />
						</div>
					</div>

					<div class="icon-card__info">
						<div class="icon-card__title-row">
							<span class="icon-card__title">Своя иконка</span>
							<span class="icon-card__custom-badge">Пользовательская</span>
						</div>
						<span class="icon-card__desc">Загруженное изображение</span>
					</div>

					<div class="icon-card__radio" aria-hidden="true">
						{#if isSelected}
							<div class="icon-card__radio-dot"></div>
						{/if}
					</div>
				</button>

				<div class="icon-card__actions">
					<button
						type="button"
						class="mini-btn"
						onclick={() => fileInput?.click()}
						title="Заменить изображение"
					>
						Заменить
					</button>
					<button
						type="button"
						class="mini-btn mini-btn--danger"
						onclick={removeCustomIcon}
						title="Удалить свою иконку"
					>
						Удалить
					</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="upload-section">
		<input
			bind:this={fileInput}
			type="file"
			accept="image/png,image/svg+xml,image/jpeg,image/webp"
			class="hidden-file-input"
			onchange={onFileSelected}
		/>
		<button
			type="button"
			class="upload-btn"
			onclick={() => fileInput?.click()}
		>
			<svg class="upload-btn__icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M8 3v10M3 8h10" />
			</svg>
			<span class="upload-btn__text">
				{customIconData ? 'Загрузить другое изображение...' : 'Загрузить свою иконку (SVG, PNG, WebP)...'}
			</span>
		</button>
		{#if uploadError}
			<div class="upload-error">{uploadError}</div>
		{/if}
	</div>
</SettingsGroup>

{#if inPwa}
	<SettingsGroup title="Особенности платформы">
		<div class="notice notice--warning">
			<div class="notice__icon">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
				</svg>
			</div>
			<div class="notice__content">
				<div class="notice__title">Режим веб-приложения (PWA)</div>
				<div class="notice__text">
					Приложение запущено в автономном режиме. Иконка на домашнем экране операционной системы фиксируется в момент добавления приложения. Для полного применения новой иконки на рабочем столе может потребоваться переустановить веб-приложение.
				</div>
			</div>
		</div>
	</SettingsGroup>
{/if}

{#if showPwaModal && pendingIconId}
	{@const targetTitle = pendingIconId === 'custom' ? 'Своя иконка' : APP_ICONS.find((i) => i.id === pendingIconId)?.title}
	<Dialog label="Смена значка в веб-приложении" width="460px" onClose={cancelSelection}>
		<div class="pwa-dialog__header">
			<div class="pwa-dialog__badge">
				<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
				</svg>
			</div>
			<h3 class="pwa-dialog__title">Смена значка в веб-приложении</h3>
		</div>

		<p class="pwa-dialog__desc">
			Вы собираетесь переключить иконку на <strong>«{targetTitle}»</strong>.
			<br /><br />
			Во вкладке браузера и внутри приложения значок сменится сразу. Однако на домашнем экране или рабочем столе Android/Windows иконка закреплена системой.
			<br /><br />
			Чтобы значок обновился на рабочем столе, <strong>потребуется переустановить приложение</strong> (удалить и добавить на экран заново).
		</p>

		<div class="pwa-dialog__actions">
			<button type="button" class="btn secondary" onclick={cancelSelection}>
				Отмена
			</button>
			<button
				type="button"
				class="btn primary"
				onclick={() => applySelection(pendingIconId!, pendingCustomData)}
			>
				Сменить иконку
			</button>
		</div>
	</Dialog>
{/if}

<style>
	.icons-list {
		display: flex;
		flex-direction: column;
	}

	.icon-card {
		display: flex;
		align-items: center;
		gap: 16px;
		width: 100%;
		padding: 14px 20px;
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		color: inherit;
		font: inherit;
		transition: background-color var(--duration-base);
	}

	.icon-card:not(:first-child) {
		border-top: 1px solid var(--st-separator);
	}

	.icon-card:hover {
		background: var(--st-hover);
	}

	.icon-card--selected {
		background: color-mix(in srgb, var(--st-accent) 6%, transparent);
	}

	.icon-card--custom {
		flex-direction: column;
		align-items: stretch;
		gap: 10px;
	}

	.icon-card__main-btn {
		display: flex;
		align-items: center;
		gap: 16px;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.icon-card__actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding-left: 70px;
	}

	.mini-btn {
		font: inherit;
		font-size: 12px;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid var(--st-separator);
		background: var(--st-card);
		color: var(--st-text);
		cursor: pointer;
		transition: background-color var(--duration-base), border-color var(--duration-base);
	}

	.mini-btn:hover {
		background: var(--st-hover);
	}

	.mini-btn--danger {
		color: #e02424;
		border-color: color-mix(in srgb, #e02424 30%, transparent);
	}

	.mini-btn--danger:hover {
		background: color-mix(in srgb, #e02424 10%, transparent);
	}

	.icon-card__preview-wrap {
		position: relative;
		flex: none;
		width: 54px;
		height: 54px;
	}

	.icon-card__app-preview {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		overflow: hidden;
		display: grid;
		place-items: center;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
		border: 1px solid rgba(0, 0, 0, 0.08);
	}

	.icon-card__app-preview--custom {
		background: #ffffff;
	}

	.icon-card__img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}

	.icon-card__fav-badge {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		overflow: hidden;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		border: 1.5px solid var(--st-card);
		background: #ffffff;
	}

	.icon-card__fav-img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}

	.icon-card__info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.icon-card__title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-card__title {
		font-size: 15px;
		font-weight: 500;
	}

	.icon-card__color-tag {
		font-size: 11px;
		padding: 1px 6px;
		border-radius: 6px;
		font-family: monospace;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.icon-card__custom-badge {
		font-size: 11px;
		padding: 1px 6px;
		border-radius: 6px;
		background: color-mix(in srgb, var(--st-accent) 15%, transparent);
		color: var(--st-accent);
		font-weight: 500;
	}

	.icon-card__desc {
		font-size: 13px;
		color: var(--st-muted);
		line-height: 1.35;
	}

	.icon-card__radio {
		flex: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid var(--st-muted);
		display: grid;
		place-items: center;
		transition: border-color var(--duration-base);
	}

	.icon-card--selected .icon-card__radio {
		border-color: var(--st-accent);
	}

	.icon-card__radio-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--st-accent);
	}

	.upload-section {
		padding: 14px 20px;
		border-top: 1px solid var(--st-separator);
	}

	.hidden-file-input {
		display: none;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: transparent;
		border: 1px dashed var(--st-separator);
		padding: 10px 16px;
		border-radius: 10px;
		color: var(--st-accent);
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		width: 100%;
		justify-content: center;
		transition: background-color var(--duration-base), border-color var(--duration-base);
	}

	.upload-btn:hover {
		background: var(--st-hover);
		border-color: var(--st-accent);
	}

	.upload-btn__icon {
		flex: none;
	}

	.upload-error {
		margin-top: 8px;
		font-size: 13px;
		color: #e02424;
	}

	.notice {
		display: flex;
		gap: 14px;
		padding: 16px 20px;
		background: var(--st-card);
		border-radius: 12px;
		box-shadow: var(--st-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.05));
	}

	.notice__icon {
		display: grid;
		place-items: center;
		flex: none;
		color: #f59e0b;
	}

	.notice__content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.notice__title {
		font-size: 14px;
		font-weight: 600;
	}

	.notice__text {
		font-size: 13px;
		color: var(--st-muted);
		line-height: 1.4;
	}

	.notice--warning {
		border-left: 4px solid #f59e0b;
	}

	.pwa-dialog__header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.pwa-dialog__badge {
		display: grid;
		place-items: center;
		flex: none;
	}

	.pwa-dialog__title {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
		color: var(--text-primary, inherit);
	}

	.pwa-dialog__desc {
		margin: 0;
		font-size: 14px;
		color: var(--st-muted);
		line-height: 1.5;
	}

	.pwa-dialog__actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 8px;
	}
</style>
