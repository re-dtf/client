<script lang="ts">
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import SettingsTile from './SettingsTile.svelte';
	import { shareApp } from '$lib/shareApp';

	let { onopensupporters }: { onopensupporters?: () => void } = $props();

	/* Страница «Хочу помочь»: сначала поддержка (донат, рассказать другу, звезда), потом участие в разработке */
	const DONATE_RU_URL = 'https://pay.cloudtips.ru/p/2fa64784';
	const DONATE_WORLD_URL = 'https://dalink.to/donnertech';
	const TELEGRAM_URL = 'https://t.me/re_dtf';
	const GITHUB_URL = 'https://github.com/re-dtf/client';

	let copied = $state(false);

	async function share() {
		if ((await shareApp()) !== 'copied') return;
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

{#snippet icon(path: string, tint: string)}
	<SettingsTile {path} {tint} />
{/snippet}

<section class="hero">
	<span class="hero__icon">
		<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
			<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
		</svg>
	</span>
	<div class="hero__text">
		<h3 class="hero__title">Поддержите reDTF</h3>
		<p class="hero__description">
			Мы очень благодарны за любую помощь. Деньги идут на сервер, домен и труд разработки.
		</p>
		<div class="hero__actions">
			<SettingsButton variant="suggested" href={DONATE_RU_URL}>Из России</SettingsButton>
			<SettingsButton href={DONATE_WORLD_URL}>Из других стран</SettingsButton>
		</div>
	</div>
</section>

{#if onopensupporters}
	<SettingsGroup title="Благодарности">
		<SettingsRow title="Поддержавшие проект" subtitle="Список пользователей, благодаря которым живёт reDTF">
			{#snippet prefix()}{@render icon('M6 4h12v5a6 6 0 0 1-12 0V4zM6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M12 15v5M7 20h10', '#d99a00')}{/snippet}
			<span class="action"><SettingsButton onclick={onopensupporters}>Посмотреть</SettingsButton></span>
		</SettingsRow>
	</SettingsGroup>
{/if}

<SettingsGroup title="Расскажите о проекте">
	<SettingsRow title="Расскажите другу" subtitle="Поделитесь ссылкой, упомяните в комментариях или в своём посте">
		{#snippet prefix()}{@render icon('M12 15V4M8 8l4-4 4 4M5 13v6h14v-6', 'var(--st-accent)')}{/snippet}
		<span class="action"><SettingsButton onclick={share}>{copied ? 'Ссылка скопирована' : 'Поделиться'}</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Звезда на Github" subtitle="Так проект заметят другие разработчики">
		{#snippet prefix()}{@render icon('M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z', '#d99a00')}{/snippet}
		<span class="action"><SettingsButton href={GITHUB_URL}>Поставить</SettingsButton></span>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Улучшите проект" description="Нашли баг или знаете, как сделать лучше?">
	<SettingsRow title="Сообщить о проблеме или идее" subtitle="Напишите в нашем Telegram-канале">
		{#snippet prefix()}{@render icon('M21 3L3 10.5l7 2.5 2.5 7z', 'var(--st-accent)')}{/snippet}
		<span class="action"><SettingsButton href={TELEGRAM_URL}>Telegram</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Открыть Issue" subtitle="Баги и предложения можно оставить в трекере на Github">
		{#snippet prefix()}{@render icon('M12 8v5M12 16.5v.5M4 5h16v11H9l-5 4z', 'var(--st-accent)')}{/snippet}
		<span class="action"><SettingsButton href="{GITHUB_URL}/issues">Issue</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Исправить самому" subtitle="Нашли баг и умеете программировать? Отправьте Pull Request">
		{#snippet prefix()}{@render icon('M8 7l-5 5 5 5M16 7l5 5-5 5', 'var(--st-accent)')}{/snippet}
		<span class="action"><SettingsButton href="{GITHUB_URL}/pulls">Pull Request</SettingsButton></span>
	</SettingsRow>
	<SettingsRow title="Помочь с дизайном" subtitle="Видите, что можно улучшить, и готовы помочь? Свяжитесь с нами">
		{#snippet prefix()}{@render icon('M4 20l1-5L16 4l4 4L9 19z', 'var(--st-accent)')}{/snippet}
		<span class="action"><SettingsButton href={TELEGRAM_URL}>Написать</SettingsButton></span>
	</SettingsRow>
</SettingsGroup>

<style>
	.hero {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 36px;
		padding: 24px;
		border-radius: 18px;
		background:
			linear-gradient(135deg, color-mix(in srgb, #e5484d 16%, transparent), transparent 75%),
			var(--st-card);
		box-shadow: var(--st-card-shadow);
	}

	.hero__icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: color-mix(in srgb, #e5484d 18%, transparent);
		color: #e5484d;
	}

	:global(html[data-theme-mode='dark']) .hero__icon {
		color: #ff6467;
	}

	@media (prefers-color-scheme: dark) {
		:global(html:not([data-theme-mode='light'])) .hero__icon {
			color: #ff6467;
		}
	}

	.hero__text {
		flex: 1;
		min-width: 0;
	}

	.hero__title {
		margin: 0;
		color: var(--st-text);
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
	}

	.hero__description {
		margin: 4px 0 0;
		color: var(--st-muted);
		font-size: 14px;
		line-height: 20px;
	}

	.hero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 16px;
	}

	.action {
		flex: none;
	}

	/* Узкое окно: сердце над текстом, а кнопки строк растягиваются под текстом на всю ширину */
	@container (max-width: 719px) {
		.hero {
			flex-direction: column;
			align-items: flex-start;
			gap: 14px;
		}

		.action {
			flex: 1 1 100%;
		}

		.action :global(.btn) {
			width: 100%;
		}
	}
</style>
