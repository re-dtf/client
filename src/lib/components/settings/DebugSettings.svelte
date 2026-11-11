<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import SettingsButton from './SettingsButton.svelte';
	import { settings } from '$lib/storage/settings.svelte';
	import { isNative } from '$lib/capacitor';
	import { otaUpdater, shellUpdater } from '$lib/capacitor/updater.svelte';
	import HapticsLab from './HapticsLab.svelte';
	import { dev } from '$app/env';

	let { ondisable }: { ondisable?: () => void } = $props();

	let topPx = $state(0);
	let bottomPx = $state(0);
	let leftPx = $state(0);
	let rightPx = $state(0);

	let headerTotal = $state('—');
	let headerRaw = $state('—');
	let headerDom = $state('—');

	let mobileTotal = $state('—');
	let mobileRaw = $state('—');
	let mobileDom = $state('—');

	let winW = $state(0);
	let winH = $state(0);
	let screenW = $state(0);
	let screenH = $state(0);
	let dpr = $state(1);
	let isMobile = $state(false);

	let copied = $state(false);

	function refreshMetrics() {
		if (typeof window === 'undefined') return;

		winW = window.innerWidth;
		winH = window.innerHeight;
		screenW = window.screen.width;
		screenH = window.screen.height;
		dpr = window.devicePixelRatio || 1;
		isMobile = window.innerWidth <= 719;

		const probe = document.createElement('div');
		probe.style.position = 'fixed';
		probe.style.top = '0';
		probe.style.left = '0';
		probe.style.visibility = 'hidden';
		probe.style.pointerEvents = 'none';
		probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
		probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
		probe.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
		probe.style.paddingRight = 'env(safe-area-inset-right, 0px)';
		document.body.appendChild(probe);
		const style = window.getComputedStyle(probe);
		topPx = parseFloat(style.paddingTop) || 0;
		bottomPx = parseFloat(style.paddingBottom) || 0;
		leftPx = parseFloat(style.paddingLeft) || 0;
		rightPx = parseFloat(style.paddingRight) || 0;
		document.body.removeChild(probe);

		const rootStyle = window.getComputedStyle(document.documentElement);
		headerTotal = rootStyle.getPropertyValue('--header-height').trim() || '—';
		headerRaw = rootStyle.getPropertyValue('--header-height-raw').trim() || '—';
		mobileTotal = rootStyle.getPropertyValue('--mobile-bar-height').trim() || '—';
		mobileRaw = rootStyle.getPropertyValue('--mobile-bar-height-raw').trim() || '—';

		const headerEl = document.querySelector('.header');
		if (headerEl) {
			const rect = headerEl.getBoundingClientRect();
			headerDom = `${Math.round(rect.height)}px`;
		} else {
			headerDom = 'скрыта';
		}

		const mobileEl = document.querySelector('.mobile-bar');
		if (mobileEl) {
			const rect = mobileEl.getBoundingClientRect();
			mobileDom = `${Math.round(rect.height)}px`;
		} else {
			mobileDom = 'скрыта';
		}
	}

	function copyReport() {
		const report = [
			'### reDTF Debug Report',
			`- Platform: ${isNative() ? 'Capacitor Native (Android)' : 'Web SPA'}`,
			`- Environment: ${dev ? 'Development' : 'Production'}`,
			`- Viewport: ${winW}x${winH} (DPR: ${dpr}, Device: ${isMobile ? 'Mobile' : 'Desktop'})`,
			`- Screen: ${screenW}x${screenH}`,
			'- Safe Area:',
			`  - Top: ${topPx}px`,
			`  - Bottom: ${bottomPx}px`,
			`  - Left: ${leftPx}px`,
			`  - Right: ${rightPx}px`,
			'- Header:',
			`  - Total: ${headerTotal}`,
			`  - Raw: ${headerRaw}`,
			`  - DOM height: ${headerDom}`,
			`  - Disabled on mobile: ${settings.value.disableMobileTopBar}`,
			'- Mobile Bar:',
			`  - Total: ${mobileTotal}`,
			`  - Raw: ${mobileRaw}`,
			`  - DOM height: ${mobileDom}`
		].join('\n');

		navigator.clipboard.writeText(report).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}

	onMount(() => {
		refreshMetrics();
		window.addEventListener('resize', refreshMetrics);
		window.addEventListener('orientationchange', refreshMetrics);
		return () => {
			window.removeEventListener('resize', refreshMetrics);
			window.removeEventListener('orientationchange', refreshMetrics);
		};
	});
</script>

<div class="settings-cards">
	<SettingsGroup title="Визуальная отладка">
		<SettingsRow
			title="Подсветка Safe Area и панелей"
			subtitle="Цветные оверлеи с разметкой безопасных зон и панелей поверх интерфейса"
			tag="label"
		>
			<SettingsSwitch
				checked={settings.value.debugSafeAreaOverlay ?? false}
				onchange={(checked) => settings.patch({ debugSafeAreaOverlay: checked })}
				label="Подсветка Safe Area"
			/>
		</SettingsRow>
		<SettingsRow
			title="Плавающий HUD метрик"
			subtitle="Компактный индикатор в углу экрана со значениями отступов и размеров в реальном времени"
			tag="label"
		>
			<SettingsSwitch
				checked={settings.value.debugHud ?? false}
				onchange={(checked) => settings.patch({ debugHud: checked })}
				label="Плавающий HUD метрик"
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Безопасная область (Safe Area)">
		<SettingsRow title="Верхний отступ (Top)" subtitle="env(safe-area-inset-top)">
			<span class="value-tag value-tag--red">{topPx}px</span>
		</SettingsRow>
		<SettingsRow title="Нижний отступ (Bottom)" subtitle="env(safe-area-inset-bottom)">
			<span class="value-tag value-tag--green">{bottomPx}px</span>
		</SettingsRow>
		<SettingsRow title="Боковые отступы (Left / Right)" subtitle="env(safe-area-inset-left / right)">
			<span class="value-tag">{leftPx}px / {rightPx}px</span>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Панели интерфейса">
		<SettingsRow title="Верхняя панель (--header-height)" subtitle="Итоговая высота шапки с учётом безопасной зоны">
			<span class="value-tag value-tag--blue">{headerTotal}</span>
		</SettingsRow>
		<SettingsRow title="Базовая высота шапки (--header-height-raw)" subtitle="Высота контентной части без отступа строки состояния">
			<span class="value-tag">{headerRaw}</span>
		</SettingsRow>
		<SettingsRow title="Фактическая высота DOM (.header)" subtitle="Текущая вычисленная высота элемента в разметке">
			<span class="value-tag">{headerDom}</span>
		</SettingsRow>
		<SettingsRow title="Нижняя панель (--mobile-bar-height)" subtitle="Итоговая высота мобильного бара с учётом safe-area-bottom">
			<span class="value-tag value-tag--amber">{mobileTotal}</span>
		</SettingsRow>
		<SettingsRow title="Базовая высота бара (--mobile-bar-height-raw)" subtitle="Высота панели кнопок без нижнего отступа">
			<span class="value-tag">{mobileRaw}</span>
		</SettingsRow>
		<SettingsRow title="Фактическая высота DOM (.mobile-bar)" subtitle="Текущая вычисленная высота мобильного бара">
			<span class="value-tag">{mobileDom}</span>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Экран и окружение">
		<SettingsRow title="Вьюпорт окна (window.innerWidth × innerHeight)">
			<span class="value-tag">{winW} × {winH} px</span>
		</SettingsRow>
		<SettingsRow title="Экран устройства (screen.width × height)">
			<span class="value-tag">{screenW} × {screenH} px</span>
		</SettingsRow>
		<SettingsRow title="Масштабирование (devicePixelRatio)">
			<span class="value-tag">{dpr}x</span>
		</SettingsRow>
		<SettingsRow title="Брейкпоинт устройства">
			<span class="value-tag">{isMobile ? 'Смартфон (≤719px)' : 'Десктоп (>719px)'}</span>
		</SettingsRow>
		<SettingsRow title="Среда выполнения">
			<span class="value-tag value-tag--platform">{isNative() ? 'Capacitor (Android)' : 'Web Browser'}</span>
		</SettingsRow>
		<SettingsRow title="Режим сборки">
			<span class="value-tag">{dev ? 'Development' : 'Production'}</span>
		</SettingsRow>
	</SettingsGroup>

	<HapticsLab />

	{#if isNative()}
		<SettingsGroup title="Capgo OTA Updates" description="Диагностика и управление OTA-обновлениями бандла">
			<SettingsRow title="Активный бандл">
				<span class="value-tag">{otaUpdater.activeBundleId}</span>
			</SettingsRow>
			<SettingsRow title="Версия бандла">
				<span class="value-tag">{otaUpdater.currentVersion}</span>
			</SettingsRow>
			<SettingsRow title="Статус OTA">
				<span class="value-tag">{otaUpdater.status}</span>
			</SettingsRow>
			{#if otaUpdater.downloadProgress > 0 && otaUpdater.status === 'downloading'}
				<SettingsRow title="Прогресс загрузки">
					<span class="value-tag value-tag--blue">{otaUpdater.downloadProgress}%</span>
				</SettingsRow>
			{/if}
			{#if otaUpdater.errorMessage}
				<SettingsRow title="Ошибка">
					<span class="value-tag value-tag--red">{otaUpdater.errorMessage}</span>
				</SettingsRow>
			{/if}
			{#if otaUpdater.status === 'available'}
				<SettingsRow title="Доступно обновление" subtitle={`Версия ${otaUpdater.availableVersion ?? ''}`}>
					<SettingsButton
						variant="suggested"
						onclick={() => otaUpdater.downloadAndApply()}
					>
						Скачать и применить
					</SettingsButton>
				</SettingsRow>
			{/if}
			{#if otaUpdater.status === 'ready'}
				<SettingsRow title="Обновление готово" subtitle="Бандл загружен в память">
					<SettingsButton
						variant="suggested"
						onclick={() => otaUpdater.applyUpdate()}
					>
						Применить
					</SettingsButton>
				</SettingsRow>
			{/if}
			<SettingsRow title="Принудительная проверка" subtitle="Проверить GitHub Releases прямо сейчас">
				<SettingsButton
					disabled={otaUpdater.status === 'checking' || otaUpdater.status === 'downloading'}
					onclick={() => otaUpdater.checkForUpdate(true)}
				>
					{otaUpdater.status === 'checking' ? 'Проверка...' : 'Проверить'}
				</SettingsButton>
			</SettingsRow>
			<SettingsRow title="Откат к встроенной версии" subtitle="Удалить OTA-версии и вернуться к сборке из APK">
				<SettingsButton
					variant="flat"
					onclick={() => otaUpdater.resetToBuiltin()}
				>
					Сбросить к APK
				</SettingsButton>
			</SettingsRow>
		</SettingsGroup>

		<SettingsGroup title="Android Shell (APK)" description="Информация о нативной оболочке приложения">
			<SettingsRow title="Версия оболочки">
				<span class="value-tag">{shellUpdater.currentVersion}</span>
			</SettingsRow>
			<SettingsRow title="Номер сборки (versionCode)">
				<span class="value-tag">{shellUpdater.currentBuild}</span>
			</SettingsRow>
			<SettingsRow title="Статус приложения">
				<span class="value-tag">{shellUpdater.status}</span>
			</SettingsRow>
			{#if shellUpdater.status === 'available'}
				<SettingsRow title="Новая сборка" subtitle={`Сборка ${shellUpdater.availableBuild ?? ''}`}>
					<SettingsButton variant="suggested" onclick={() => shellUpdater.downloadApk()}>
						Скачать APK
					</SettingsButton>
				</SettingsRow>
			{/if}
		</SettingsGroup>
	{/if}

	<SettingsGroup title="Действия">
		<SettingsRow title="Диагностический отчёт" subtitle="Копирует все текущие значения в буфер обмена">
			<SettingsButton variant="suggested" onclick={copyReport}>
				{copied ? 'Скопировано!' : 'Скопировать метрики'}
			</SettingsButton>
		</SettingsRow>
		<SettingsRow title="Сбросить оверлеи" subtitle="Отключить подсветку и HUD">
			<SettingsButton
				variant="flat"
				onclick={() => settings.patch({ debugSafeAreaOverlay: false, debugHud: false })}
			>
				Отключить
			</SettingsButton>
		</SettingsRow>
		{#if !dev}
			<SettingsRow title="Режим разработчика" subtitle="Скрыть раздел «Разработка» из настроек">
				<SettingsButton
					variant="flat"
					onclick={() => {
						settings.patch({ devMode: false, debugSafeAreaOverlay: false, debugHud: false });
						ondisable?.();
					}}
				>
					Скрыть
				</SettingsButton>
			</SettingsRow>
		{/if}
	</SettingsGroup>
</div>

<style>
	.value-tag {
		padding: 4px 10px;
		border-radius: 6px;
		background: var(--st-track, rgba(0, 0, 0, 0.06));
		color: var(--st-text, currentColor);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 13px;
		font-weight: 600;
	}

	.value-tag--red {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.value-tag--green {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
	}

	.value-tag--blue {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.value-tag--amber {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.value-tag--platform {
		background: var(--st-accent, #3b82f6);
		color: #ffffff;
	}
</style>
