<script lang="ts">
	import FieldControl from './FieldControl.svelte';
	import SourcesSettings from '$lib/components/sources/SourcesSettings.svelte';
	import { activeTheme, themes } from '$lib/themes/index.svelte';
	import { settings, DEFAULT_PROXY_URL, DEFAULT_THEME } from '$lib/storage/settings.svelte';
	import type { NestingMode } from '$lib/storage/settings.svelte';
	import type { ChoiceField } from '$lib/themes/types';

	// Общие настройки приложения. Настройки конкретной темы показываются на её вкладке.
	const themeField: ChoiceField = {
		key: 'theme',
		type: 'select',
		title: 'Дизайн (тема)',
		default: DEFAULT_THEME,
		options: themes.map((theme) => ({ value: theme.id, title: theme.name, description: theme.description }))
	};

	const nestingField: ChoiceField = {
		key: 'commentNesting',
		type: 'radio',
		title: 'Вложенные комментарии',
		description: 'Режим отображения глубоко вложенных комментариев.',
		default: 'flatten',
		options: [
			{ value: 'flatten', title: 'Сглаживание (рекомендуется)', description: 'Глубокие ветки сглаживаются с навигацией к родителю' },
			{ value: 'autopan', title: 'Авто-панорама', description: 'Без лимита вложенности, камера следит за глубиной' }
		]
	};

	function useAuthorProxy() {
		if (confirm('Использовать прокси от автора проекта?')) {
			settings.patch({ proxyUrl: DEFAULT_PROXY_URL });
		}
	}
</script>

<section class="section" aria-labelledby="settings-design">
	<h3 class="section__title" id="settings-design">Внешний вид</h3>
	<FieldControl field={themeField} value={activeTheme.id} onchange={(value) => activeTheme.set(String(value))} />
</section>

<section class="section" aria-labelledby="settings-comments">
	<h3 class="section__title" id="settings-comments">Комментарии</h3>
	<FieldControl
		field={nestingField}
		value={settings.value.commentNesting}
		onchange={(value) => settings.patch({ commentNesting: value as NestingMode })}
	/>
</section>

<section class="section" aria-labelledby="settings-network">
	<h3 class="section__title" id="settings-network">Сеть и авторизация</h3>
	<p class="section__description">
		CORS-прокси для входа и обновления токена DTF (Cloudflare Workers и др.). Без прокси вход по паролю недоступен.
	</p>
	<input
		class="input"
		type="url"
		aria-label="URL прокси"
		placeholder="https://auth-proxy.example.workers.dev"
		bind:value={() => settings.value.proxyUrl, (value) => settings.patch({ proxyUrl: value })}
	/>
	{#if DEFAULT_PROXY_URL}
		<p class="section__description">
			Можно использовать <button type="button" class="link" onclick={useAuthorProxy}>прокси от автора проекта</button>
		</p>
	{/if}
</section>

<section class="section">
	<SourcesSettings />
</section>

<style>
	.section {
		margin-bottom: 28px;
	}

	.section__title {
		margin-bottom: 12px;
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
	}

	.section__description {
		margin: 8px 0;
		color: var(--text-muted, #707070);
		font-size: 15px;
		line-height: 22px;
	}

	.input {
		width: 100%;
		height: 48px;
		padding: 0 11px;
		border: 1px solid rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		background-color: #f5f5f5;
		color: inherit;
		font: inherit;
	}

	.link {
		color: var(--text-link, #0079ff);
		cursor: pointer;
	}
</style>
