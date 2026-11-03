<script lang="ts">
	import SettingsButton from './SettingsButton.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import { resolve } from '$app/paths';
	import { version } from '$app/env';

	/* Страница «Хочу помочь»: сначала поддержка (донат, рассказать другу, звезда), потом участие в разработке */
	const DONATE_RU_URL = 'https://pay.cloudtips.ru/p/2fa64784';
	const DONATE_WORLD_URL = 'https://dalink.to/donnertech';
	const TELEGRAM_URL = 'https://t.me/re_dtf';
	const GITHUB_URL = 'https://github.com/re-dtf/client';

	let copied = $state(false);

	// Системное окно «Поделиться», если оно есть, иначе копируем адрес приложения
	async function share() {
		const url = new URL(resolve('/'), location.origin).href;
		try {
			if (navigator.share) {
				await navigator.share({ title: 'reDTF', text: 'reDTF — неофициальный клиент DTF', url });
			} else {
				await navigator.clipboard.writeText(url);
				copied = true;
				setTimeout(() => (copied = false), 2000);
			}
		} catch {
			// Пользователь закрыл окно «Поделиться» или буфер недоступен: ничего не делаем
		}
	}
</script>

{#snippet icon(path: string, tint: string)}
	<span class="tile" style:--tint={tint}>
		<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
			<path d={path} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</span>
{/snippet}

<section class="hero">
	<span class="hero__icon">
		<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
			<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor" />
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

<footer class="app-version">
	reDTF {version}
</footer>

<style>
	.hero {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 36px;
		padding: 24px;
		border-radius: 18px;
		background: linear-gradient(135deg, color-mix(in srgb, #e5484d 12%, #fff), #fff 75%);
		box-shadow: var(--st-card-shadow);
	}

	.hero__icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: color-mix(in srgb, #e5484d 16%, #fff);
		color: #e5484d;
	}

	.hero__text {
		flex: 1;
		min-width: 0;
	}

	.hero__title {
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
	}

	.hero__description {
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

	/* Значок строки: цветная плитка с контурной иконкой */
	.tile {
		display: grid;
		flex: none;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--tint) 14%, transparent);
		color: var(--tint);
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

	.app-version {
		margin-top: 36px;
		text-align: center;
		font-size: 13px;
		color: var(--st-muted);
	}
</style>
