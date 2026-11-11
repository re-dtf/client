<script lang="ts">
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsSwitch from './SettingsSwitch.svelte';
	import SettingsTile from './SettingsTile.svelte';
	import { asset } from '$app/paths';
	import { version, dev } from '$app/env';
	import { isNative } from '$lib/capacitor';
	import { otaUpdater, shellUpdater } from '$lib/capacitor/updater.svelte';
	import { pwa } from '$lib/pwa.svelte';
	import { settings } from '$lib/storage/settings.svelte';
	import { haptics } from '$lib/haptics';

	let { section }: { section?: string } = $props();

	/* Страница «О проекте»: название и версия, коротко о принципах, ссылки проекта и юридические документы */
	const ORG_URL = 'https://github.com/re-dtf';
	const CLIENT_URL = `${ORG_URL}/client`;
	const TELEGRAM_URL = 'https://t.me/re_dtf';
	const DOCS_URL = `${ORG_URL}/.github/blob/main`;

	const PRINCIPLES = [
		{ title: 'Без сервера', text: 'Работает прямо в браузере и говорит с DTF напрямую', path: 'M5 12.5l4.5 4.5L19 7.5', tint: '#1f8a3b' },
		{ title: 'Открытый код', text: 'Собирается на Github Actions, можно проверить и форкнуть', path: 'M8 7l-5 5 5 5M16 7l5 5-5 5', tint: '#1693e5' },
		{ title: 'Без слежки', text: 'Ни аналитики, ни сбора данных: всё хранится у вас', path: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3', tint: '#8e4ec6' }
	];

	const CLICKS_TO_ACTIVATE = 10;
	let devClicks = $state(0);
	let clickTimer: ReturnType<typeof setTimeout> | null = null;
	let devFeedback = $state<string | null>(null);
	let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

	function showFeedback(text: string) {
		devFeedback = text;
		if (feedbackTimer) clearTimeout(feedbackTimer);
		feedbackTimer = setTimeout(() => {
			devFeedback = null;
		}, 3000);
	}

	function handleVersionClick() {
		haptics.tick();

		if (clickTimer) clearTimeout(clickTimer);
		clickTimer = setTimeout(() => {
			devClicks = 0;
		}, 2000);

		devClicks++;

		if (devClicks >= CLICKS_TO_ACTIVATE) {
			devClicks = 0;
			if (dev) {
				showFeedback('Режим разработчика активен (среда разработки)');
				return;
			}
			const nextState = !settings.value.devMode;
			// Выключая режим, гасим и отладочные оверлеи: иначе их нечем будет отключить
			settings.patch(nextState ? { devMode: true } : { devMode: false, debugSafeAreaOverlay: false, debugHud: false });
			haptics.double();
			showFeedback(
				nextState
					? 'Режим разработчика включён!'
					: 'Режим разработчика выключен'
			);
		} else if (devClicks >= 4) {
			const remaining = CLICKS_TO_ACTIVATE - devClicks;
			showFeedback(
				remaining === 1
					? 'Остался 1 клик для режима разработчика'
					: remaining < 5
					? `Осталось ${remaining} клика для режима разработчика`
					: `Осталось ${remaining} кликов для режима разработчика`
			);
		}
	}

	$effect(() => {
		if (section === 'documents' || section === 'legal') {
			const el = document.getElementById('about-documents');
			el?.scrollIntoView?.({ behavior: 'smooth' });
		}
	});
</script>

{#snippet icon(path: string, tint = 'var(--st-accent)')}
	<SettingsTile {path} {tint} />
{/snippet}

<section class="hero">
	<svg class="icon hero__logo" width="123" height="50" aria-label="reDTF"><use href="/reIcons.svg#redtf_logo"></use></svg>
	<p class="hero__tagline">Переосмысление клиентского опыта для DTF</p>
	<p class="hero__description">
		Лёгкий, быстрый и настраиваемый неофициальный клиент. Без нежеланных редизайнов и шпионских метрик.
	</p>
	<button
		type="button"
		class="hero__version"
		onclick={handleVersionClick}
	>
		Версия {isNative() && otaUpdater.activeBundleId !== 'builtin' ? `${otaUpdater.currentVersion} (OTA)` : version}
	</button>
	{#if devFeedback}
		<span class="hero__hint" role="status">{devFeedback}</span>
	{/if}
</section>

<ul class="principles">
	{#each PRINCIPLES as item (item.title)}
		<li class="principle">
			<SettingsTile path={item.path} tint={item.tint} />
			<h3 class="principle__title">{item.title}</h3>
			<p class="principle__text">{item.text}</p>
		</li>
	{/each}
</ul>

<SettingsGroup title="Обновления" description="Проверка новых версий и обновлений">
	{#if isNative()}
		<SettingsRow
			title={otaUpdater.statusTitle}
			subtitle={otaUpdater.statusSubtitle}
		>
			{#snippet prefix()}{@render icon('M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', '#1693e5')}{/snippet}
			{#if otaUpdater.status === 'ready'}
				<span class="action">
					<SettingsButton variant="suggested" onclick={() => otaUpdater.applyUpdate()}>
						Применить
					</SettingsButton>
				</span>
			{:else if otaUpdater.status === 'available'}
				<span class="action">
					<SettingsButton variant="suggested" onclick={() => otaUpdater.downloadAndApply()}>
						Обновить
					</SettingsButton>
				</span>
			{:else}
				<span class="action">
					<SettingsButton
						disabled={otaUpdater.status === 'checking' || otaUpdater.status === 'downloading'}
						onclick={() => otaUpdater.checkForUpdate(true)}
					>
						{otaUpdater.status === 'checking' ? 'Проверка...' : otaUpdater.status === 'downloading' ? 'Загрузка...' : 'Проверить'}
					</SettingsButton>
				</span>
			{/if}
		</SettingsRow>

		<SettingsRow
			title={shellUpdater.statusTitle}
			subtitle={shellUpdater.statusSubtitle}
		>
			{#snippet prefix()}{@render icon('M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM6 7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm12 0a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM8 7h8v10a4 4 0 0 1-4 4 4 4 0 0 1-4-4V7z', '#10b981')}{/snippet}
			{#if shellUpdater.status === 'available'}
				<span class="action">
					<SettingsButton variant="suggested" onclick={() => shellUpdater.downloadApk()}>
						Скачать APK
					</SettingsButton>
				</span>
			{:else}
				<span class="action">
					<SettingsButton
						disabled={shellUpdater.status === 'checking' || shellUpdater.status === 'downloading'}
						onclick={() => shellUpdater.checkForUpdate(true)}
					>
						{shellUpdater.status === 'checking' ? 'Проверка...' : shellUpdater.status === 'downloading' ? 'Загрузка...' : 'Проверить'}
					</SettingsButton>
				</span>
			{/if}
		</SettingsRow>

		<SettingsRow
			title="Проверять обновления автоматически"
			subtitle="Периодически проверять наличие новых сборок на GitHub при запуске"
		>
			<SettingsSwitch
				checked={settings.value.autoCheckUpdates !== false}
				onchange={(v) => settings.patch({ autoCheckUpdates: v })}
			/>
		</SettingsRow>
	{:else}
		<SettingsRow
			title={pwa.needRefresh ? 'Доступно обновление' : 'Обновление приложения'}
			subtitle={pwa.needRefresh ? `Новая версия ${pwa.newVersion ?? ''}` : `Текущая версия ${version}`}
		>
			{#snippet prefix()}{@render icon('M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', '#1693e5')}{/snippet}
			{#if pwa.needRefresh}
				<span class="action">
					<SettingsButton variant="suggested" onclick={() => pwa.update()}>
						Обновить
					</SettingsButton>
				</span>
			{:else}
				<span class="action">
					<SettingsButton href="{CLIENT_URL}/releases">
						Релизы
					</SettingsButton>
				</span>
			{/if}
		</SettingsRow>
	{/if}
</SettingsGroup>

<SettingsGroup title="Проект" description="Новости, исходный код и разработка">
	<SettingsRow title="Telegram-канал" subtitle="Анонсы, обновления и обсуждение разработки">
		{#snippet prefix()}{@render icon('M21 3L3 10.5l7 2.5 2.5 7z', '#2ca5e0')}{/snippet}
		<span class="action"><SettingsButton href={TELEGRAM_URL}>Открыть</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Организация на Github" subtitle="Все репозитории проекта: клиент, прокси, документы">
		{#snippet prefix()}{@render icon('M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 19v-1a4 4 0 0 0-3-3.9M15 4.1a3 3 0 0 1 0 5.8')}{/snippet}
		<span class="action"><SettingsButton href={ORG_URL}>Открыть</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Исходный код клиента" subtitle="Репозиторий re-dtf/client">
		{#snippet prefix()}{@render icon('M8 7l-5 5 5 5M16 7l5 5-5 5')}{/snippet}
		<span class="action"><SettingsButton href={CLIENT_URL}>Открыть</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Свой reDTF за пару минут" subtitle="Форкните клиент и разверните на своём Github Pages">
		{#snippet prefix()}{@render icon('M7 4v4a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V4M12 11v9M7 4h.01M17 4h.01')}{/snippet}
		<span class="action"><SettingsButton href="{DOCS_URL}/guides/fork-and-deploy-guide.md">Руководство</SettingsButton></span>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup id="about-documents" title="Документы" description="Что можно и нельзя, и как мы обращаемся с данными">
	<SettingsRow title="Пользовательское соглашение" subtitle="Условия использования и отказ от ответственности">
		{#snippet prefix()}{@render icon('M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5', '#d99a00')}{/snippet}
		<span class="action"><SettingsButton href="{DOCS_URL}/TERMS.md">Читать</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Политика конфиденциальности" subtitle="Мы не собираем и не передаём ваши данные">
		{#snippet prefix()}{@render icon('M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z', '#d99a00')}{/snippet}
		<span class="action"><SettingsButton href="{DOCS_URL}/PRIVACY.md">Читать</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Лицензия" subtitle="PolyForm Noncommercial 1.0.0: свободно для некоммерческого использования">
		{#snippet prefix()}{@render icon('M12 4v16M6 20h12M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z', '#d99a00')}{/snippet}
		<span class="action"><SettingsButton href="{CLIENT_URL}/blob/dev/LICENSE">Читать</SettingsButton></span>
	</SettingsRow>
</SettingsGroup>

<p class="disclaimer">
	reDTF — независимый фанатский проект с открытым исходным кодом. Он не связан с сайтом DTF и компанией ООО «Комитет».
	Все права на товарные знаки и контент принадлежат их владельцам.
</p>

<style>
	/* Визитка: логотип по центру на мягком голубом градиенте с размытыми пятнами */
	.hero {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 20px;
		padding: 36px 24px 28px;
		overflow: hidden;
		border-radius: 18px;
		background:
			radial-gradient(circle at 12% 0%, color-mix(in srgb, #1693e5 20%, transparent), transparent 55%),
			radial-gradient(circle at 92% 100%, color-mix(in srgb, #8e4ec6 14%, transparent), transparent 55%),
			var(--st-card);
		box-shadow: var(--st-card-shadow);
		text-align: center;
	}

	.hero__logo {
		width: 164px;
		height: auto;
		margin-bottom: 14px;
	}

	.hero__tagline {
		font-size: 17px;
		font-weight: 500;
		line-height: 24px;
	}

	.hero__description {
		max-width: 440px;
		margin-top: 6px;
		color: var(--st-muted);
		font-size: 14px;
		line-height: 20px;
	}

	.hero__version {
		margin-top: 18px;
		padding: 4px 14px;
		border: none;
		border-radius: 14px;
		background: color-mix(in srgb, #1693e5 14%, transparent);
		color: var(--color-blue, #0f6fb0);
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		line-height: 20px;
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
		transition: transform 0.1s ease, background 0.15s ease;
	}

	.hero__version:hover {
		background: color-mix(in srgb, #1693e5 22%, transparent);
	}

	.hero__version:active {
		transform: scale(0.96);
	}

	.hero__hint {
		margin-top: 8px;
		font-size: 12px;
		font-weight: 500;
		color: var(--st-accent, #1693e5);
		text-align: center;
	}

	.principles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-bottom: 36px;
		padding: 0;
		list-style: none;
	}

	.principle {
		padding: 16px;
		border-radius: 14px;
		background: var(--st-card);
		box-shadow: var(--st-card-shadow);
	}

	.principle__title {
		margin-top: 12px;
		font-size: 15px;
		font-weight: 500;
		line-height: 22px;
	}

	.principle__text {
		color: var(--st-muted);
		font-size: 13px;
		line-height: 18px;
	}

	.action {
		flex: none;
	}

	.disclaimer {
		margin: 0 4px;
		color: var(--st-muted);
		font-size: 13px;
		line-height: 18px;
		text-align: center;
	}

	/* Узкое окно: карточки принципов в столбик, кнопки строк на всю ширину под текстом */
	@container (max-width: 719px) {
		.principles {
			grid-template-columns: 1fr;
		}

		.action {
			flex: 1 1 100%;
		}

		.action :global(.btn) {
			width: 100%;
		}
	}
</style>
