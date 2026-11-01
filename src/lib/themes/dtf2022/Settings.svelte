<script lang="ts">
	import { activeTheme } from '$lib/themes/index.svelte';
	import { settings, DEFAULT_PROXY_URL } from '$lib/storage/settings.svelte';
	import type { NestingMode } from '$lib/storage/settings.svelte';
	import SourcesSettings from '$lib/components/sources/SourcesSettings.svelte';
	import { themeSettings, type VotesStyle } from './themeSettings.svelte';
	import { Input } from './ui';

	// Эпохи оформления оценок у DTF
	const VOTES: { value: VotesStyle; title: string; description: string }[] = [
		{ value: 'rating', title: 'Стрелки · осень 2022', description: 'Рейтинг со стрелками вверх и вниз у постов и комментариев' },
		{ value: 'likes', title: 'Лайки · начало 2023', description: 'Лайк и дизлайк, как в ленте весной 2023' },
		{ value: 'reactions', title: 'Реакции · как сейчас', description: 'Набор реакций, как на сайте сегодня' }
	];

	const NESTING: { value: NestingMode; title: string; description: string }[] = [
		{ value: 'flatten', title: 'Сглаживание (рекомендуется)', description: 'Глубокие ветки сглаживаются с навигацией к родителю' },
		{ value: 'autopan', title: 'Авто-панорама', description: 'Без лимита вложенности, камера следит за глубиной' }
	];

	let votes = $derived(themeSettings.value.votes);
	let nestingMode = $derived(settings.value.commentNesting);

	function updateTheme(e: Event) {
		activeTheme.set((e.target as HTMLSelectElement).value);
	}

	function useAuthorProxy() {
		if (confirm('Использовать прокси от автора проекта?')) {
			settings.patch({ proxyUrl: DEFAULT_PROXY_URL });
		}
	}
</script>

{#snippet option(name: string, value: string, checked: boolean, title: string, description: string, onselect: () => void)}
	<label class={['option', { 'option--checked': checked }]}>
		<input class="option__input" type="radio" {name} {value} {checked} onchange={onselect} />
		<span class="option__title">{title}</span>
		<span class="option__description">{description}</span>
	</label>
{/snippet}

<div class="settings">
	<h2 class="settings__title">Настройки</h2>

	<section class="settings__section" aria-labelledby="settings-design">
		<h3 class="settings__heading" id="settings-design">Внешний вид</h3>

		<label class="settings__label" for="settings-theme">Дизайн (тема)</label>
		<select class="settings__select" id="settings-theme" value={activeTheme.id} onchange={updateTheme}>
			<option value="classic">Классический дизайн (Classic)</option>
			<option value="modern">Современный дизайн (Modern)</option>
			<option value="dtf2022">DTF 2022</option>
		</select>
	</section>

	<section class="settings__section" aria-labelledby="settings-votes">
		<h3 class="settings__heading" id="settings-votes">Оценки</h3>
		<p class="settings__description">Как выглядят оценки постов и комментариев в теме DTF 2022.</p>

		<div class="settings__options">
			{#each VOTES as item (item.value)}
				{@render option('votes', item.value, votes === item.value, item.title, item.description, () => (themeSettings.value = { ...themeSettings.value, votes: item.value }))}
			{/each}
		</div>
	</section>

	<section class="settings__section" aria-labelledby="settings-comments">
		<h3 class="settings__heading" id="settings-comments">Комментарии</h3>
		<p class="settings__description">Режим отображения глубоко вложенных комментариев.</p>

		<div class="settings__options">
			{#each NESTING as item (item.value)}
				{@render option('nesting', item.value, nestingMode === item.value, item.title, item.description, () => settings.patch({ commentNesting: item.value }))}
			{/each}
		</div>
	</section>

	<section class="settings__section" aria-labelledby="settings-network">
		<h3 class="settings__heading" id="settings-network">Сеть и авторизация</h3>
		<p class="settings__description">CORS-прокси для обхода блокировок при входе и обновлении токена (Cloudflare Pages и др.).</p>

		<Input type="url" aria-label="URL прокси" placeholder="https://auth-proxy.example.workers.dev" bind:value={() => settings.value.proxyUrl, (v) => settings.patch({ proxyUrl: v })} />
		{#if DEFAULT_PROXY_URL}
			<p class="settings__hint">
				Можно использовать <button type="button" class="settings__link" onclick={useAuthorProxy}>прокси от автора проекта</button>
			</p>
		{/if}
	</section>

	<section class="settings__section">
		<SourcesSettings />
	</section>
</div>

<style>
	.settings {
		color: var(--text-primary);
		font-size: 16px;
		line-height: 24px;
	}

	.settings__title {
		margin-bottom: 20px;
		font-size: 22px;
		font-weight: 500;
		line-height: 30px;
	}

	.settings__section {
		margin-bottom: 28px;
	}

	.settings__heading {
		margin-bottom: 8px;
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
	}

	.settings__description,
	.settings__hint {
		margin-bottom: 12px;
		color: var(--text-muted);
		font-size: 15px;
		line-height: 22px;
	}

	.settings__label {
		display: block;
		margin-bottom: 8px;
		font-weight: 500;
	}

	.settings__select {
		width: 100%;
		height: 48px;
		padding: 0 11px;
		border: 1px solid rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		background-color: #f5f5f5;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.settings__link {
		color: var(--text-link);
		cursor: pointer;
	}

	.settings__link:hover {
		color: var(--text-hover);
	}

	.settings__options {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Вариант выбора: радио скрыто, выделяется вся карточка */
	.option {
		position: relative;
		display: grid;
		gap: 2px;
		padding: 12px 16px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 8px;
		cursor: pointer;
	}

	.option:hover {
		background-color: #f5f5f5;
	}

	.option--checked {
		border-color: var(--color-blue);
		box-shadow: 0 0 0 1px var(--color-blue);
	}

	.option:has(.option__input:focus-visible) {
		outline: 2px solid var(--color-blue);
		outline-offset: 2px;
	}

	.option__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.option__title {
		font-weight: 500;
	}

	.option__description {
		color: var(--text-muted);
		font-size: 15px;
		line-height: 22px;
	}
</style>
